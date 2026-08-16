const os = require("node:os");
const { ipcMain, shell } = require("electron/main");
const {
    saveAccessToken,
    loadAccessToken,
    clearAccessToken
} = require("../stores/authStore");
const apiClient = require("../services/apiClient");

function getRequiredAccessToken() {
    const accessToken = loadAccessToken();

    if (!accessToken) {
        throw new Error("Aucune session utilisateur active.");
    }

    return accessToken;
}

function isOfficialDiscordLoginUrl(value) {
    const loginUrl = new URL(value);
    return loginUrl.protocol === "https:" && loginUrl.hostname === "discord.com";
}

// Regroupe les communications liées au compte, à l'administration et à l'API.
function registerApiIpcHandlers({ refreshRealtimeAuthentication }) {
    ipcMain.handle("auth:get-state", async () => {
        const accessToken = loadAccessToken();

        if (!accessToken) {
            return { authenticated: false };
        }

        try {
            const { user } = await apiClient.getCurrentUser(accessToken);
            return { authenticated: true, user };
        } catch (error) {
            if (error.statusCode === 401) {
                clearAccessToken();
                return { authenticated: false };
            }

            throw error;
        }
    });

    ipcMain.handle("auth:start-discord", async () => {
        const login = await apiClient.startDiscordLogin(os.hostname());

        if (!isOfficialDiscordLoginUrl(login.authorizationUrl)) {
            throw new Error("L'adresse de connexion Discord reçue est invalide.");
        }

        await shell.openExternal(login.authorizationUrl);
        return {
            sessionId: login.sessionId,
            expiresInSeconds: login.expiresInSeconds
        };
    });

    ipcMain.handle("auth:poll-discord", async (_event, sessionId) => {
        const result = await apiClient.getDiscordLoginStatus(sessionId);

        if (result.state === "active" && result.accessToken) {
            saveAccessToken(result.accessToken);
            refreshRealtimeAuthentication();
            return { state: "active", user: result.user };
        }

        return result;
    });

    ipcMain.handle("auth:logout", async () => {
        const accessToken = loadAccessToken();

        if (accessToken) {
            try {
                await apiClient.logout(accessToken);
            } catch {
                // La session locale doit aussi pouvoir être supprimée API coupée.
            }
        }

        clearAccessToken();
        refreshRealtimeAuthentication();
        return { authenticated: false };
    });

    ipcMain.handle("tutorial:complete", () => {
        return apiClient.completeTutorial(getRequiredAccessToken());
    });

    ipcMain.handle("admin:get-users", () => {
        return apiClient.getUsers(getRequiredAccessToken());
    });

    ipcMain.handle("admin:update-user", (_event, userId, status) => {
        return apiClient.changeUserStatus(
            getRequiredAccessToken(),
            Number(userId),
            status
        );
    });

    ipcMain.handle("livechat:get-pending", async () => {
        const data = await apiClient.getPendingMessages(getRequiredAccessToken());
        return data.messages;
    });

    ipcMain.handle("livechat:consume", (_event, messageId) => {
        return apiClient.markMessageAsConsumed(
            getRequiredAccessToken(),
            Number(messageId)
        );
    });

    ipcMain.handle("livechat:get-state", () => {
        return apiClient.getLivechatState(getRequiredAccessToken());
    });
}

module.exports = { registerApiIpcHandlers };
