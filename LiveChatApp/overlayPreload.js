// Pont sécurisé entre overlay.js et le processus principal Electron.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("livechatOverlaySettings", {
    get: () => ipcRenderer.invoke("settings:get"),
    onUpdated: (callback) => {
        ipcRenderer.on("settings:updated", (_event, settings) => {
            callback(settings);
        });
    }
});
