// ============================================================
// 1. Éléments de la page de paramétrage
// ============================================================

const statusElement = document.getElementById("status");
const settingButtons = [...document.querySelectorAll("[data-setting]")];

let currentSettings = {
    position: "center",
    size: "medium"
};

// ============================================================
// 2. Mise à jour visuelle des boutons et du message d'état
// ============================================================

function refreshSelectedButtons() {
    for (const button of settingButtons) {
        const settingName = button.dataset.setting;
        const settingValue = button.dataset.value;
        const selected = currentSettings[settingName] === settingValue;

        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    }
}

function showStatus(message, state = "success") {
    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function disableButtons(disabled) {
    for (const button of settingButtons) {
        button.disabled = disabled;
    }
}

// ============================================================
// 3. Sauvegarde d'un choix et application immédiate à l'overlay
// ============================================================

async function updateSetting(settingName, settingValue) {
    disableButtons(true);
    showStatus("Enregistrement…");

    try {
        currentSettings = await window.livechatSettings.update({
            ...currentSettings,
            [settingName]: settingValue
        });

        refreshSelectedButtons();
        showStatus("Paramètres enregistrés et appliqués à l'overlay.");
    } catch (error) {
        console.error("Impossible d'enregistrer les paramètres :", error);
        showStatus("Impossible d'enregistrer les paramètres.", "error");
    } finally {
        disableButtons(false);
    }
}

function registerButtonEvents() {
    for (const button of settingButtons) {
        button.addEventListener("click", () => {
            updateSetting(button.dataset.setting, button.dataset.value);
        });
    }
}

// ============================================================
// 4. Chargement des choix sauvegardés au lancement
// ============================================================

async function initializeSettingsPage() {
    registerButtonEvents();

    try {
        currentSettings = await window.livechatSettings.get();
        refreshSelectedButtons();
        showStatus("Paramètres chargés.");
    } catch (error) {
        console.error("Impossible de charger les paramètres :", error);
        showStatus("Impossible de charger les paramètres.", "error");
    }
}

initializeSettingsPage();
