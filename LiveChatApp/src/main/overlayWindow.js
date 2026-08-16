// ============================================================
// 1. Modules nécessaires à la fenêtre d'overlay
// ============================================================

const path = require("node:path");
const { BrowserWindow, screen } = require("electron/main");

// ============================================================
// 2. Création de la fenêtre transparente sur l'écran principal
// ============================================================

function createOverlayWindow() {
    // Les dimensions garantissent que l'overlay couvre tout l'écran principal.
    const { x, y, width, height } = screen.getPrimaryDisplay().bounds;

    const overlayWindow = new BrowserWindow({
        x,
        y,
        width,
        height,

        // Apparence de l'overlay.
        transparent: true,
        backgroundColor: "#00000000",
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,

        // L'utilisateur ne doit ni déplacer ni activer cette fenêtre.
        focusable: false,
        fullscreenable: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        hasShadow: false,
        show: false,

        // Isolation entre Electron et le JavaScript de la page.
        webPreferences: {
            preload: path.join(__dirname, "../preload/overlayPreload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Tous les clics traversent l'overlay et atteignent le jeu situé dessous.
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.loadFile(
        path.join(__dirname, "../renderer/pages/overlay.html")
    );

    // showInactive affiche l'overlay sans voler le focus de l'utilisateur.
    overlayWindow.once("ready-to-show", () => {
        if (!overlayWindow.isDestroyed()) {
            overlayWindow.showInactive();
        }
    });

    return overlayWindow;
}

// Rend la fonction disponible dans main.js.
module.exports = { createOverlayWindow };
