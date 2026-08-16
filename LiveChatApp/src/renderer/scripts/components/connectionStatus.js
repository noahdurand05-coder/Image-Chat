(() => {
    "use strict";

    const statusElement = document.getElementById("application-status");
    const labelElement = document.getElementById("application-status-label");

    if (!statusElement || !labelElement || !window.livechatApplicationStatus) {
        return;
    }

    const DISPLAY_STATES = {
        online: {
            className: "is-online",
            label: "Application opérationnelle"
        },
        connecting: {
            className: "is-waiting",
            label: "Connexion en cours…"
        },
        reconnecting: {
            className: "is-waiting",
            label: "Reconnexion…"
        },
        "login-required": {
            className: "is-offline",
            label: "Connexion requise"
        },
        unavailable: {
            className: "is-offline",
            label: "Application indisponible"
        },
        stopped: {
            className: "is-offline",
            label: "Application arrêtée"
        }
    };

    function displayConnectionState(state) {
        const displayState = DISPLAY_STATES[state] || DISPLAY_STATES.unavailable;

        statusElement.className = `application-status ${displayState.className}`;
        labelElement.textContent = displayState.label;
    }

    async function initializeConnectionStatus() {
        try {
            displayConnectionState(await window.livechatApplicationStatus.get());
        } catch {
            displayConnectionState("unavailable");
        }

        window.livechatApplicationStatus.onUpdated(displayConnectionState);
    }

    initializeConnectionStatus();
})();
