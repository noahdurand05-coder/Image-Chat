// Pont sécurisé entre les scripts de la page et le processus principal Electron.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("livechatSettings", {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (settings) => ipcRenderer.invoke("settings:update", settings),
    previewVolume: (volume) => ipcRenderer.send("overlay:volume-preview", volume),
    testOverlay: () => ipcRenderer.invoke("overlay:test")
});

contextBridge.exposeInMainWorld("livechatApplicationStatus", {
    get: () => ipcRenderer.invoke("app:get-connection-state"),
    onUpdated: (callback) => {
        ipcRenderer.on("app:connection-state", (_event, state) => {
            callback(state);
        });
    }
});

contextBridge.exposeInMainWorld("livechatTutorial", {
    complete: () => ipcRenderer.invoke("tutorial:complete")
});

contextBridge.exposeInMainWorld("livechatAuth", {
    getState: () => ipcRenderer.invoke("auth:get-state"),
    startDiscordLogin: () => ipcRenderer.invoke("auth:start-discord"),
    pollDiscordLogin: (sessionId) => ipcRenderer.invoke("auth:poll-discord", sessionId),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getUsers: () => ipcRenderer.invoke("admin:get-users"),
    updateUser: (userId, status) => {
        return ipcRenderer.invoke("admin:update-user", userId, status);
    }
});
