const LIVECHAT_API_URL = process.env.LIVECHAT_API_URL
    || "http://127.0.0.1:3000/api/livechat";

async function requestLivechatApi(pathname, options = {}) {
    const response = await fetch(`${LIVECHAT_API_URL}${pathname}`, {
        ...options,
        headers: {
            "X-Bot-Api-Key": process.env.LIVECHAT_BOT_API_KEY || "",
            ...options.headers
        }
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
        const apiMessage = responseBody.error || "Réponse inconnue de l'API";
        throw new Error(`Erreur API ${response.status} : ${apiMessage}`);
    }

    return responseBody;
}

function sendLivechat(livechat) {
    return requestLivechatApi("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(livechat)
    });
}

function stopLivechat() {
    return requestLivechatApi("/stop", { method: "POST" });
}

function goToNextLivechat() {
    return requestLivechatApi("/next", { method: "POST" });
}

function clearLivechatQueue() {
    return requestLivechatApi("/clear", { method: "POST" });
}

function pauseLivechat() {
    return requestLivechatApi("/pause", { method: "POST" });
}

function resumeLivechat() {
    return requestLivechatApi("/resume", { method: "POST" });
}

function getLivechatStatus() {
    return requestLivechatApi("/status");
}

async function isLivechatUserAuthorized(discordUserId) {
    const result = await requestLivechatApi(
        `/access/${encodeURIComponent(discordUserId)}`
    );

    return result.authorized === true;
}

module.exports = {
    sendLivechat,
    stopLivechat,
    goToNextLivechat,
    clearLivechatQueue,
    pauseLivechat,
    resumeLivechat,
    getLivechatStatus,
    isLivechatUserAuthorized
};
