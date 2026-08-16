// ============================================================
// 1. Modules Electron et module de l'overlay
// ============================================================

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron/main");
const { createOverlayWindow } = require("./overlayWindow");
const { loadSettings, saveSettings } = require("../stores/settingsStore");
const { loadAccessToken } = require("../stores/authStore");
const { createRealtimeClient } = require("../services/realtimeClient");
const { registerApiIpcHandlers } = require("./apiIpcHandlers");
const { createDemoMessage } = require("./demoMessage");

// ============================================================
// 2. Références vers les deux fenêtres de l'application
// ============================================================

let settingsWindow = null;
let overlayWindow = null;
let currentSettings = null;
let realtimeClient = null;
let applicationConnectionState = "connecting";

// ============================================================
// 3. Création de la fenêtre principale de paramétrage
// ============================================================

function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 1100,
        height: 850,
        minWidth: 700,
        minHeight: 650,
        webPreferences: {
            preload: path.join(__dirname, "../preload/mainPreload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    settingsWindow.loadFile(
        path.join(__dirname, "../renderer/pages/index.html")
    );

    settingsWindow.on("closed", () => {
        settingsWindow = null;

        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.close();
        }
    });
}

function sendToOverlay(channel, payload) {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
        return;
    }

    const sendEvent = () => {
        if (!overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send(channel, payload);
        }
    };

    if (overlayWindow.webContents.isLoadingMainFrame()) {
        overlayWindow.webContents.once("did-finish-load", sendEvent);
    } else {
        sendEvent();
    }
}

function updateApplicationConnectionState(state) {
    applicationConnectionState = state;

    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send("app:connection-state", state);
    }
}

// ============================================================
// 4. Communication entre les paramètres et l'overlay
// ============================================================

function registerSettingsHandlers() {
    ipcMain.handle("settings:get", () => currentSettings);
    ipcMain.handle("app:get-connection-state", () => applicationConnectionState);

    ipcMain.on("overlay:volume-preview", (_event, requestedVolume) => {
        const numericVolume = Number(requestedVolume);

        if (!Number.isFinite(numericVolume)) {
            return;
        }

        const safeVolume = Math.min(100, Math.max(0, numericVolume));

        sendToOverlay("settings:updated", {
            ...currentSettings,
            volume: safeVolume
        });
    });

    ipcMain.handle("settings:update", (_event, updatedSettings) => {
        currentSettings = saveSettings({
            ...currentSettings,
            ...updatedSettings
        });

        sendToOverlay("settings:updated", currentSettings);

        return currentSettings;
    });

    ipcMain.handle("overlay:test", () => {
        if (!overlayWindow || overlayWindow.isDestroyed()) {
            return { queued: false };
        }

        sendToOverlay("overlay:test-message", createDemoMessage());

        return { queued: true };
    });
}

// ============================================================
// 5. Démarrage et cycle de vie de l'application Electron
// ============================================================

app.whenReady().then(() => {
    currentSettings = loadSettings();
    registerSettingsHandlers();
    registerApiIpcHandlers({
        refreshRealtimeAuthentication: () => {
            realtimeClient?.refreshAuthentication();
        }
    });

    createSettingsWindow();
    overlayWindow = createOverlayWindow();

    realtimeClient = createRealtimeClient({
        getAccessToken: loadAccessToken,
        onConnected: () => sendToOverlay("livechat:new-message"),
        onNewMessage: (event) => sendToOverlay("livechat:new-message", event),
        onStop: (event) => sendToOverlay("livechat:stop", event),
        onControl: (event) => sendToOverlay("livechat:control", event),
        onConnectionStateChange: updateApplicationConnectionState
    });
    realtimeClient.start();

    app.on("activate", () => {
        if (!settingsWindow) {
            createSettingsWindow();
        }

        if (!overlayWindow || overlayWindow.isDestroyed()) {
            overlayWindow = createOverlayWindow();
            sendToOverlay("livechat:new-message");
        }
    });
});

app.on("before-quit", () => {
    realtimeClient?.stop();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
