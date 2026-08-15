// ============================================================
// 1. Modules Electron et module de l'overlay
// ============================================================

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron/main");
const { createOverlayWindow } = require("./overlayWindow");
const { loadSettings, saveSettings } = require("./settingsStore");

// ============================================================
// 2. Références vers les deux fenêtres de l'application
// ============================================================

let settingsWindow = null;
let overlayWindow = null;
let currentSettings = null;

// ============================================================
// 3. Création de la fenêtre principale de paramétrage
// ============================================================

function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    settingsWindow.loadFile("index.html");

    settingsWindow.on("closed", () => {
        settingsWindow = null;

        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.close();
        }
    });
}

// ============================================================
// 4. Communication entre les paramètres et l'overlay
// ============================================================

function registerSettingsHandlers() {
    ipcMain.handle("settings:get", () => currentSettings);

    ipcMain.handle("settings:update", (_event, updatedSettings) => {
        currentSettings = saveSettings({
            ...currentSettings,
            ...updatedSettings
        });

        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send("settings:updated", currentSettings);
        }

        return currentSettings;
    });
}

// ============================================================
// 5. Démarrage et cycle de vie de l'application Electron
// ============================================================

app.whenReady().then(() => {
    currentSettings = loadSettings();
    registerSettingsHandlers();

    createSettingsWindow();
    overlayWindow = createOverlayWindow();

    app.on("activate", () => {
        if (!settingsWindow) {
            createSettingsWindow();
        }

        if (!overlayWindow || overlayWindow.isDestroyed()) {
            overlayWindow = createOverlayWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
