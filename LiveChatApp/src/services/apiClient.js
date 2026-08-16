const { API_BASE_URL } = require("../config/appConfig");

async function requestJson(pathname, options = {}) {
    const response = await fetch(`${API_BASE_URL}${pathname}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error || `Erreur API (${response.status})`);
        error.statusCode = response.status;
        throw error;
    }

    return data;
}

function authenticatedHeaders(accessToken, hasJsonBody = false) {
    return {
        Authorization: `Bearer ${accessToken}`,
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {})
    };
}

// ============================================================
// 1. Connexion et session
// ============================================================

function startDiscordLogin(deviceName) {
    return requestJson("/auth/discord/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName })
    });
}

function getDiscordLoginStatus(sessionId) {
    return requestJson(`/auth/discord/status/${encodeURIComponent(sessionId)}`);
}

function getCurrentUser(accessToken) {
    return requestJson("/auth/me", {
        headers: authenticatedHeaders(accessToken)
    });
}

function logout(accessToken) {
    return requestJson("/auth/logout", {
        method: "POST",
        headers: authenticatedHeaders(accessToken)
    });
}

function completeTutorial(accessToken) {
    return requestJson("/auth/tutorial", {
        method: "PATCH",
        headers: authenticatedHeaders(accessToken)
    });
}

// ============================================================
// 2. Administration
// ============================================================

function getUsers(accessToken) {
    return requestJson("/admin/users", {
        headers: authenticatedHeaders(accessToken)
    });
}

function changeUserStatus(accessToken, userId, status) {
    return requestJson(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: authenticatedHeaders(accessToken, true),
        body: JSON.stringify({ status })
    });
}

// ============================================================
// 3. Requêtes utilisées par l'overlay
// ============================================================

function getPendingMessages(accessToken) {
    return requestJson("/livechat", {
        cache: "no-store",
        headers: authenticatedHeaders(accessToken)
    });
}

function markMessageAsConsumed(accessToken, messageId) {
    return requestJson("/livechat", {
        method: "PATCH",
        headers: authenticatedHeaders(accessToken, true),
        body: JSON.stringify({ id: messageId })
    });
}

function getLivechatState(accessToken) {
    return requestJson("/livechat/stop", {
        cache: "no-store",
        headers: authenticatedHeaders(accessToken)
    });
}

module.exports = {
    startDiscordLogin,
    getDiscordLoginStatus,
    getCurrentUser,
    logout,
    completeTutorial,
    getUsers,
    changeUserStatus,
    getPendingMessages,
    markMessageAsConsumed,
    getLivechatState
};
