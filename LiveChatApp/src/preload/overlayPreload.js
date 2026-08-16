// Pont sécurisé entre overlay.js et le processus principal Electron.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("livechatOverlaySettings", {
    get: () => ipcRenderer.invoke("settings:get"),
    onUpdated: (callback) => {
        ipcRenderer.on("settings:updated", (_event, settings) => {
            callback(settings);
        });
    },
    onTestMessage: (callback) => {
        ipcRenderer.on("overlay:test-message", (_event, message) => {
            callback(message);
        });
    }
});

// Les requêtes sont faites par le processus principal : le jeton personnel
// n'est jamais transmis au JavaScript de la page d'overlay.
contextBridge.exposeInMainWorld("livechatApi", {
    getPendingMessages: () => ipcRenderer.invoke("livechat:get-pending"),
    markMessageAsConsumed: (messageId) => {
        return ipcRenderer.invoke("livechat:consume", messageId);
    },
    getState: () => ipcRenderer.invoke("livechat:get-state"),
    onNewMessage: (callback) => {
        ipcRenderer.on("livechat:new-message", (_event, messageEvent) => {
            callback(messageEvent);
        });
    },
    onStop: (callback) => {
        ipcRenderer.on("livechat:stop", (_event, stopEvent) => {
            callback(stopEvent);
        });
    },
    onControl: (callback) => {
        ipcRenderer.on("livechat:control", (_event, controlEvent) => {
            callback(controlEvent);
        });
    }
});
