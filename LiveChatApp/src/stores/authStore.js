const fs = require("node:fs");
const path = require("node:path");
const { app, safeStorage } = require("electron");

function getSessionFilePath() {
    return path.join(app.getPath("userData"), "livechat-session.json");
}

// Le jeton est chiffré par Windows avant d'être écrit dans le fichier.
function saveAccessToken(accessToken) {
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Le chiffrement sécurisé de Windows n'est pas disponible.");
    }

    const encryptedToken = safeStorage.encryptString(accessToken);
    const filePath = getSessionFilePath();

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
        filePath,
        JSON.stringify({ encryptedToken: encryptedToken.toString("base64") }),
        "utf8"
    );
}

function loadAccessToken() {
    try {
        if (!safeStorage.isEncryptionAvailable()) {
            return null;
        }

        const content = JSON.parse(fs.readFileSync(getSessionFilePath(), "utf8"));
        const encryptedToken = Buffer.from(content.encryptedToken, "base64");

        return safeStorage.decryptString(encryptedToken);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("La session enregistrée ne peut pas être relue.");
        }

        return null;
    }
}

function clearAccessToken() {
    try {
        fs.rmSync(getSessionFilePath(), { force: true });
    } catch {
        console.error("La session locale n'a pas pu être supprimée.");
    }
}

module.exports = {
    saveAccessToken,
    loadAccessToken,
    clearAccessToken
};
