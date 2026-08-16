const { pool } = require("../config/db");

const CONSUMED_MESSAGE_RETENTION_HOURS = 24;

// ============================================================
// 1. Création d'un message
// ============================================================

async function createLivechatMessage({ media, texte, user }, connectedUserIds = []) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const query = `
            INSERT INTO messages (media, texte, userProfilePicture, username)
            VALUES (?, ?, ?, ?)
        `;
        const values = [media, texte, user.avatar, user.pseudo];

        const [messageResult] = await connection.query(query, values);
        const uniqueUserIds = [...new Set(connectedUserIds)]
            .filter((userId) => Number.isInteger(userId) && userId > 0);
        let deliveryResult = { affectedRows: 0 };

        if (uniqueUserIds.length > 0) {
            const placeholders = uniqueUserIds.map(() => "?").join(", ");
            [deliveryResult] = await connection.query(
                `
                    INSERT INTO message_deliveries (message_id, user_id)
                    SELECT ?, id
                    FROM app_users
                    WHERE status = 'active' AND id IN (${placeholders})
                `,
                [messageResult.insertId, ...uniqueUserIds]
            );
        }

        // Sans utilisateur autorisé, le message est clôturé immédiatement
        // afin qu'il puisse être nettoyé automatiquement après 24 heures.
        if (deliveryResult.affectedRows === 0) {
            await connection.query(
                `
                    UPDATE messages
                    SET consumed = 1, consumedAt = NOW()
                    WHERE id = ?
                `,
                [messageResult.insertId]
            );
        }

        const [deliveries] = await connection.query(
            "SELECT user_id FROM message_deliveries WHERE message_id = ?",
            [messageResult.insertId]
        );

        await connection.commit();
        console.log("Message ajouté dans la base de données.");

        return {
            messageId: messageResult.insertId,
            recipientUserIds: deliveries.map((delivery) => delivery.user_id)
        };
    } catch (error) {
        await connection.rollback();
        console.error("Erreur lors de l'insertion d'un message.");
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================================
// 2. Lecture des messages encore en attente
// ============================================================

async function getUnconsumedMessages(userId) {
    try {
        const query = `
            SELECT
                messages.id,
                messages.media,
                messages.texte,
                messages.userProfilePicture,
                messages.username,
                messages.dateCrea
            FROM message_deliveries AS deliveries
            INNER JOIN messages ON messages.id = deliveries.message_id
            WHERE deliveries.user_id = ?
              AND deliveries.consumed_at IS NULL
            ORDER BY messages.dateCrea ASC, messages.id ASC
        `;
        const [rows] = await pool.query(query, [userId]);

        return rows;
    } catch (error) {
        console.error("Erreur lors de la récupération des messages.");
        throw error;
    }
}

// ============================================================
// 3. Consommation d'un message
// L'heure est enregistrée pour calculer les 24 heures de conservation.
// ============================================================

async function consumeMessageForUser(messageId, userId) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `
                UPDATE message_deliveries
                SET consumed_at = NOW()
                WHERE message_id = ?
                  AND user_id = ?
                  AND consumed_at IS NULL
            `,
            [messageId, userId]
        );

        if (result.affectedRows > 0) {
            await connection.query(
                `
                    UPDATE messages
                    SET consumed = 1, consumedAt = NOW()
                    WHERE id = ?
                      AND consumed = 0
                      AND NOT EXISTS (
                          SELECT 1
                          FROM message_deliveries
                          WHERE message_id = ? AND consumed_at IS NULL
                      )
                `,
                [messageId, messageId]
            );
        }

        await connection.commit();
        console.log("Un message a été consommé pour un utilisateur.");
        return result.affectedRows;
    } catch (error) {
        await connection.rollback();
        console.error("Erreur lors de la consommation d'un message.");
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================================
// 4. Contrôle global de la file d'attente
// ============================================================

async function countPendingMessages() {
    const [rows] = await pool.query(`
        SELECT COUNT(DISTINCT message_id) AS pending_count
        FROM message_deliveries
        WHERE consumed_at IS NULL
    `);

    return Number(rows[0].pending_count);
}

async function clearPendingMessages() {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [pendingMessages] = await connection.query(`
            SELECT DISTINCT message_id
            FROM message_deliveries
            WHERE consumed_at IS NULL
        `);

        await connection.query(`
            UPDATE message_deliveries
            SET consumed_at = NOW()
            WHERE consumed_at IS NULL
        `);

        await connection.query(`
            UPDATE messages
            SET consumed = 1, consumedAt = NOW()
            WHERE consumed = 0
              AND EXISTS (
                  SELECT 1
                  FROM message_deliveries
                  WHERE message_id = messages.id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM message_deliveries
                  WHERE message_id = messages.id AND consumed_at IS NULL
              )
        `);

        await connection.commit();
        return pendingMessages.length;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================================
// 5. Préparation automatique de la colonne consumedAt
// ============================================================

async function initializeMessageCleanup() {
    const [tables] = await pool.query(
        `
            SELECT TABLE_NAME AS table_name
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'messages'
        `
    );

    if (tables.length === 0) {
        throw new Error(
            "Table messages manquante. "
            + "Importe API/sql/000_messages.sql dans phpMyAdmin."
        );
    }

    const [columns] = await pool.query(
        "SHOW COLUMNS FROM messages LIKE 'consumedAt'"
    );

    if (columns.length === 0) {
        await pool.query(`
            ALTER TABLE messages
            ADD COLUMN consumedAt DATETIME NULL AFTER consumed
        `);

        console.log("Colonne consumedAt ajoutée à la table messages.");
    }

    // Les anciennes lignes consommées commencent leur délai de 24 h maintenant.
    await pool.query(`
        UPDATE messages
        SET consumedAt = NOW()
        WHERE consumed = 1 AND consumedAt IS NULL
    `);
}

// ============================================================
// 6. Vérification de la migration multi-utilisateur
// ============================================================

async function initializeMessageDeliveries() {
    const [tables] = await pool.query(
        `
            SELECT TABLE_NAME AS table_name
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'message_deliveries'
        `
    );

    if (tables.length === 0) {
        throw new Error(
            "Table message_deliveries manquante. "
            + "Importe API/sql/002_message_deliveries.sql dans phpMyAdmin."
        );
    }
}

// ============================================================
// 7. Suppression des messages consommés depuis au moins 24 heures
// ============================================================

async function deleteExpiredConsumedMessages() {
    // Termine aussi les messages dont chaque destinataire a fini l'affichage.
    await pool.query(`
        UPDATE messages
        SET consumed = 1, consumedAt = NOW()
        WHERE consumed = 0
          AND EXISTS (
              SELECT 1
              FROM message_deliveries
              WHERE message_id = messages.id
          )
          AND NOT EXISTS (
              SELECT 1
              FROM message_deliveries
              WHERE message_id = messages.id AND consumed_at IS NULL
          )
    `);

    const query = `
        DELETE FROM messages
        WHERE consumed = 1
          AND consumedAt <= DATE_SUB(
              NOW(),
              INTERVAL ${CONSUMED_MESSAGE_RETENTION_HOURS} HOUR
          )
    `;
    const [result] = await pool.query(query);

    if (result.affectedRows > 0) {
        console.log(`${result.affectedRows} message(s) consommé(s) supprimé(s).`);
    }

    return result.affectedRows;
}

module.exports = {
    createLivechatMessage,
    getUnconsumedMessages,
    consumeMessageForUser,
    countPendingMessages,
    clearPendingMessages,
    initializeMessageDeliveries,
    initializeMessageCleanup,
    deleteExpiredConsumedMessages
};
