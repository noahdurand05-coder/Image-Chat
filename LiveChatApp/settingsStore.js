// ============================================================
// 1. Modules Node.js utilisés pour sauvegarder un fichier JSON
// ============================================================

const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron/main");

// ============================================================
// 2. Valeurs par défaut et valeurs autorisées
// ============================================================

const DEFAULT_SETTINGS = Object.freeze({
    position: "center",
    size: "medium"
});

const ALLOWED_POSITIONS = new Set([
    "top-left",
    "top-right",
    "center",
    "bottom-left",
    "bottom-right"
]);

const ALLOWED_SIZES = new Set(["small", "medium", "large"]);

// ============================================================
// 3. Validation des données avant leur utilisation
// ============================================================

function validateSettings(settings = {}) {
    return {
        position: ALLOWED_POSITIONS.has(settings.position)
            ? settings.position
            : DEFAULT_SETTINGS.position,
        size: ALLOWED_SIZES.has(settings.size)
            ? settings.size
            : DEFAULT_SETTINGS.size
    };
}

function getSettingsFilePath() {
    return path.join(app.getPath("userData"), "livechat-settings.json");
}

// ============================================================
// 4. Lecture et écriture du fichier de paramètres
// ============================================================

function loadSettings() {
    try {
        const fileContent = fs.readFileSync(getSettingsFilePath(), "utf8");
        return validateSettings(JSON.parse(fileContent));
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Impossible de lire les paramètres :", error);
        }

        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(settings) {
    const validatedSettings = validateSettings(settings);
    const filePath = getSettingsFilePath();

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
        filePath,
        JSON.stringify(validatedSettings, null, 2),
        "utf8"
    );

    return validatedSettings;
}

module.exports = { loadSettings, saveSettings };
