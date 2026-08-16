const crypto = require("node:crypto");
const { pool } = require("../config/db");

const LOGIN_SESSION_DURATION_MINUTES = 30;
const ACCESS_TOKEN_BYTES = 32;
const ALLOWED_USER_STATUSES = new Set(["active", "rejected", "blocked"]);

// ============================================================
// 1. Outils communs pour les jetons et la configuration Discord
// ============================================================

function createSecret() {
    return crypto.randomBytes(ACCESS_TOKEN_BYTES).toString("base64url");
}

function hashSecret(secret) {
    return crypto.createHash("sha256").update(secret).digest("hex");
}

function getDiscordConfiguration() {
    const configuration = {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI,
        adminDiscordId: process.env.ADMIN_DISCORD_ID
    };

    if (Object.values(configuration).some((value) => !value)) {
        const error = new Error("La connexion Discord n'est pas encore configurée sur l'API.");
        error.statusCode = 503;
        throw error;
    }

    return configuration;
}

function normalizeDeviceName(value) {
    if (typeof value !== "string") {
        return "Ordinateur Windows";
    }

    return value.trim().slice(0, 120) || "Ordinateur Windows";
}

function formatUser(row) {
    return {
        id: row.id,
        discordId: row.discord_id,
        username: row.discord_username,
        avatarUrl: row.discord_avatar_url,
        role: row.role,
        status: row.status,
        tutorialCompleted: Boolean(row.tutorial_completed_at)
    };
}

// ============================================================
// 2. Vérification des tables nécessaires à l'authentification
// ============================================================

async function initializeAuthentication() {
    const requiredTables = [
        "app_users",
        "app_devices",
        "oauth_login_sessions"
    ];

    const [rows] = await pool.query(
        `
            SELECT TABLE_NAME AS table_name
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN (?, ?, ?)
        `,
        requiredTables
    );

    const existingTables = new Set(rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter(
        (tableName) => !existingTables.has(tableName)
    );

    if (missingTables.length > 0) {
        throw new Error(
            `Tables d'authentification manquantes : ${missingTables.join(", ")}. `
            + "Importe API/sql/001_authentication.sql dans phpMyAdmin."
        );
    }

    const [tutorialColumns] = await pool.query(
        `
            SELECT COLUMN_NAME AS column_name
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'app_users'
              AND COLUMN_NAME = 'tutorial_completed_at'
        `
    );

    if (tutorialColumns.length === 0) {
        throw new Error(
            "Colonne du tutoriel manquante. "
            + "Importe API/sql/003_user_tutorial.sql dans phpMyAdmin."
        );
    }

    await deleteExpiredLoginSessions();
}

// ============================================================
// 3. Démarrage de la connexion dans le navigateur
// ============================================================

async function createDiscordLoginSession(deviceName) {
    const { clientId, redirectUri } = getDiscordConfiguration();
    const sessionSecret = createSecret();
    const stateHash = hashSecret(sessionSecret);

    await deleteExpiredLoginSessions();
    await pool.query(
        `
            INSERT INTO oauth_login_sessions
                (state_hash, device_name, expires_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
        `,
        [stateHash, normalizeDeviceName(deviceName), LOGIN_SESSION_DURATION_MINUTES]
    );

    const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "identify");
    authorizationUrl.searchParams.set("state", sessionSecret);
    authorizationUrl.searchParams.set("prompt", "consent");

    return {
        sessionId: sessionSecret,
        authorizationUrl: authorizationUrl.toString(),
        expiresInSeconds: LOGIN_SESSION_DURATION_MINUTES * 60
    };
}

async function exchangeDiscordCode(code, configuration) {
    const body = new URLSearchParams({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: configuration.redirectUri
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!response.ok) {
        throw new Error(`Discord a refusé le code OAuth (${response.status}).`);
    }

    return response.json();
}

async function fetchDiscordProfile(accessToken) {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error(`Le profil Discord n'a pas pu être récupéré (${response.status}).`);
    }

    return response.json();
}

function createDiscordAvatarUrl(profile) {
    if (profile.avatar) {
        return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
    }

    const defaultAvatarIndex = Number(BigInt(profile.id) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
}

async function completeDiscordLogin(code, state) {
    if (typeof code !== "string" || typeof state !== "string") {
        const error = new Error("Réponse Discord incomplète.");
        error.statusCode = 400;
        throw error;
    }

    const stateHash = hashSecret(state);
    const [sessions] = await pool.query(
        `
            SELECT id
            FROM oauth_login_sessions
            WHERE state_hash = ? AND expires_at > NOW() AND user_id IS NULL
        `,
        [stateHash]
    );

    if (sessions.length === 0) {
        const error = new Error("Cette demande de connexion est invalide ou expirée.");
        error.statusCode = 400;
        throw error;
    }

    const configuration = getDiscordConfiguration();
    const discordToken = await exchangeDiscordCode(code, configuration);
    const profile = await fetchDiscordProfile(discordToken.access_token);
    const isInitialAdministrator = profile.id === configuration.adminDiscordId;
    const username = String(profile.global_name || profile.username || "Utilisateur Discord")
        .slice(0, 100);
    const avatarUrl = createDiscordAvatarUrl(profile);

    await pool.query(
        `
            INSERT INTO app_users
                (discord_id, discord_username, discord_avatar_url, role, status)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                discord_username = VALUES(discord_username),
                discord_avatar_url = VALUES(discord_avatar_url)
        `,
        [
            profile.id,
            username,
            avatarUrl,
            isInitialAdministrator ? "admin" : "user",
            isInitialAdministrator ? "active" : "pending"
        ]
    );

    if (isInitialAdministrator) {
        await pool.query(
            `
                UPDATE app_users
                SET role = 'admin', status = 'active'
                WHERE discord_id = ?
            `,
            [profile.id]
        );
    }

    const [users] = await pool.query(
        "SELECT id FROM app_users WHERE discord_id = ?",
        [profile.id]
    );

    await pool.query(
        "UPDATE oauth_login_sessions SET user_id = ? WHERE id = ?",
        [users[0].id, sessions[0].id]
    );
}

// ============================================================
// 4. Suivi de l'approbation et création du jeton de l'appareil
// ============================================================

async function getDiscordLoginStatus(sessionSecret) {
    if (typeof sessionSecret !== "string" || sessionSecret.length < 32) {
        const error = new Error("Session de connexion invalide.");
        error.statusCode = 400;
        throw error;
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
                SELECT
                    sessions.id AS session_id,
                    sessions.device_name,
                    sessions.user_id,
                    sessions.claimed_at,
                    users.id,
                    users.discord_id,
                    users.discord_username,
                    users.discord_avatar_url,
                    users.role,
                    users.status,
                    users.tutorial_completed_at
                FROM oauth_login_sessions AS sessions
                LEFT JOIN app_users AS users ON users.id = sessions.user_id
                WHERE sessions.state_hash = ? AND sessions.expires_at > NOW()
                FOR UPDATE
            `,
            [hashSecret(sessionSecret)]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return { state: "expired" };
        }

        const session = rows[0];

        if (!session.user_id) {
            await connection.commit();
            return { state: "waiting_discord" };
        }

        const user = formatUser(session);

        if (session.status !== "active") {
            await connection.commit();
            return { state: session.status, user };
        }

        if (session.claimed_at) {
            await connection.commit();
            return { state: "already_claimed", user };
        }

        const accessToken = createSecret();

        await connection.query(
            `
                INSERT INTO app_devices (user_id, token_hash, device_name, last_seen_at)
                VALUES (?, ?, ?, NOW())
            `,
            [session.user_id, hashSecret(accessToken), session.device_name]
        );

        await connection.query(
            "UPDATE oauth_login_sessions SET claimed_at = NOW() WHERE id = ?",
            [session.session_id]
        );

        await connection.commit();
        return { state: "active", user, accessToken };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================================
// 5. Vérification des jetons utilisés par Electron
// ============================================================

async function findAuthenticatedUser(accessToken) {
    if (typeof accessToken !== "string" || accessToken.length < 32) {
        return null;
    }

    const tokenHash = hashSecret(accessToken);
    const [rows] = await pool.query(
        `
            SELECT
                users.id,
                users.discord_id,
                users.discord_username,
                users.discord_avatar_url,
                users.role,
                users.status,
                users.tutorial_completed_at,
                devices.id AS device_id
            FROM app_devices AS devices
            INNER JOIN app_users AS users ON users.id = devices.user_id
            WHERE devices.token_hash = ?
              AND devices.revoked_at IS NULL
              AND users.status = 'active'
            LIMIT 1
        `,
        [tokenHash]
    );

    if (rows.length === 0) {
        return null;
    }

    await pool.query(
        "UPDATE app_devices SET last_seen_at = NOW() WHERE id = ?",
        [rows[0].device_id]
    );

    return {
        ...formatUser(rows[0]),
        deviceId: rows[0].device_id,
        tokenHash
    };
}

async function revokeDevice(tokenHash, deviceId) {
    await pool.query(
        `
            UPDATE app_devices
            SET revoked_at = NOW()
            WHERE id = ? AND token_hash = ?
        `,
        [deviceId, tokenHash]
    );
}

async function completeUserTutorial(userId) {
    await pool.query(
        `
            UPDATE app_users
            SET tutorial_completed_at = COALESCE(tutorial_completed_at, NOW())
            WHERE id = ?
        `,
        [userId]
    );

    return { completed: true };
}

// ============================================================
// 6. Vérification des utilisateurs autorisés à commander le bot
// ============================================================

// Le bot utilise cette vérification avant chaque commande Discord.
async function isActiveDiscordUser(discordUserId) {
    const [rows] = await pool.query(
        `
            SELECT 1
            FROM app_users
            WHERE discord_id = ? AND status = 'active'
            LIMIT 1
        `,
        [discordUserId]
    );

    return rows.length > 0;
}

// ============================================================
// 7. Actions réservées à l'administrateur
// ============================================================

async function listUsers() {
    const [rows] = await pool.query(`
        SELECT
            users.id,
            users.discord_id,
            users.discord_username,
            users.discord_avatar_url,
            users.role,
            users.status,
            users.created_at,
            users.tutorial_completed_at,
            COUNT(devices.id) AS device_count,
            MAX(devices.last_seen_at) AS last_seen_at
        FROM app_users AS users
        LEFT JOIN app_devices AS devices
            ON devices.user_id = users.id AND devices.revoked_at IS NULL
        GROUP BY users.id
        ORDER BY
            FIELD(users.status, 'pending', 'active', 'blocked', 'rejected'),
            users.created_at ASC
    `);

    return rows.map((row) => ({
        ...formatUser(row),
        createdAt: row.created_at,
        deviceCount: Number(row.device_count),
        lastSeenAt: row.last_seen_at
    }));
}

async function updateUserStatus(userId, status) {
    if (!Number.isInteger(userId) || userId <= 0 || !ALLOWED_USER_STATUSES.has(status)) {
        return false;
    }

    const [result] = await pool.query(
        `
            UPDATE app_users
            SET status = ?
            WHERE id = ? AND role = 'user'
        `,
        [status, userId]
    );

    if (status === "blocked" || status === "rejected") {
        await pool.query(
            `
                UPDATE app_devices
                SET revoked_at = NOW()
                WHERE user_id = ? AND revoked_at IS NULL
            `,
            [userId]
        );

        // Un compte bloqué ne doit pas empêcher indéfiniment le nettoyage
        // des messages qui lui avaient été attribués.
        await pool.query(
            `
                UPDATE message_deliveries
                SET consumed_at = NOW()
                WHERE user_id = ? AND consumed_at IS NULL
            `,
            [userId]
        );
    }

    return result.affectedRows > 0;
}

async function deleteExpiredLoginSessions() {
    await pool.query(
        "DELETE FROM oauth_login_sessions WHERE expires_at <= NOW()"
    );
}

module.exports = {
    initializeAuthentication,
    createDiscordLoginSession,
    completeDiscordLogin,
    getDiscordLoginStatus,
    findAuthenticatedUser,
    revokeDevice,
    completeUserTutorial,
    isActiveDiscordUser,
    listUsers,
    updateUserStatus
};
