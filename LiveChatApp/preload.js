// Pont sécurisé entre renderer.js et le processus principal Electron.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("livechatSettings", {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (settings) => ipcRenderer.invoke("settings:update", settings)
});
