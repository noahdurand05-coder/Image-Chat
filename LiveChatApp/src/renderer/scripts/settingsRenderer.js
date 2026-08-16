// ============================================================
// Éléments de la page de réglages
// ============================================================

const statusElement = document.getElementById("status");
const testOverlayButton = document.getElementById("test-overlay");
const volumeSlider = document.getElementById("video-volume");
const volumeValue = document.getElementById("volume-value");
const settingButtons = [...document.querySelectorAll("[data-setting]")];

let currentSettings = {
    position: "center",
    size: "medium",
    volume: 100
};

// ============================================================
// Mise à jour de l'interface
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

function showSettingsStatus(message, state = "success") {
    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function refreshVolumeControl(volume = currentSettings.volume) {
    const safeVolume = Math.min(100, Math.max(0, Number(volume) || 0));

    volumeSlider.value = safeVolume;
    volumeValue.textContent = `${safeVolume} %`;
    volumeSlider.style.setProperty("--volume-progress", `${safeVolume}%`);
}

function disableSettingsControls(disabled) {
    for (const button of settingButtons) {
        button.disabled = disabled;
    }

    volumeSlider.disabled = disabled;
}

// ============================================================
// Enregistrement d'un réglage
// ============================================================

async function updateSetting(settingName, settingValue) {
    disableSettingsControls(true);
    showSettingsStatus("Enregistrement…");

    try {
        currentSettings = await window.livechatSettings.update({
            ...currentSettings,
            [settingName]: settingValue
        });

        refreshSelectedButtons();
        refreshVolumeControl();
        showSettingsStatus("Paramètres enregistrés et appliqués à l'overlay.");
        window.livechatToast.show("Paramètres enregistrés.", "success");
    } catch (error) {
        console.error("Impossible d'enregistrer les paramètres :", error);
        showSettingsStatus("Impossible d'enregistrer les paramètres.", "error");
        window.livechatToast.show("Impossible d'enregistrer les paramètres.", "error");
    } finally {
        disableSettingsControls(false);
    }
}

// ============================================================
// Aperçu local de l'overlay
// ============================================================

async function testOverlay() {
    testOverlayButton.disabled = true;
    showSettingsStatus("Préparation de l'aperçu…");

    try {
        const result = await window.livechatSettings.testOverlay();

        if (!result.queued) {
            throw new Error("La fenêtre d'overlay n'est pas disponible.");
        }

        showSettingsStatus("Aperçu envoyé à l'overlay.");
        window.livechatToast.show("Aperçu envoyé à l'overlay.", "success");
    } catch (error) {
        console.error("Impossible de tester l'overlay :", error);
        showSettingsStatus("Impossible d'afficher l'aperçu.", "error");
        window.livechatToast.show("Impossible d'afficher l'aperçu.", "error");
    } finally {
        testOverlayButton.disabled = false;
    }
}

// ============================================================
// Événements et chargement initial
// ============================================================

function registerSettingsEvents() {
    for (const button of settingButtons) {
        button.addEventListener("click", () => {
            updateSetting(button.dataset.setting, button.dataset.value);
        });
    }

    testOverlayButton.addEventListener("click", testOverlay);

    volumeSlider.addEventListener("input", () => {
        refreshVolumeControl(volumeSlider.value);
        window.livechatSettings.previewVolume(Number(volumeSlider.value));
    });

    volumeSlider.addEventListener("change", () => {
        updateSetting("volume", Number(volumeSlider.value));
    });
}

async function initializeSettingsPage() {
    registerSettingsEvents();

    try {
        currentSettings = await window.livechatSettings.get();
        refreshSelectedButtons();
        refreshVolumeControl();
        showSettingsStatus("Paramètres chargés.");
    } catch (error) {
        console.error("Impossible de charger les paramètres :", error);
        showSettingsStatus("Impossible de charger les paramètres.", "error");
        window.livechatToast.show("Les paramètres n'ont pas pu être chargés.", "error");
    }
}

initializeSettingsPage();
