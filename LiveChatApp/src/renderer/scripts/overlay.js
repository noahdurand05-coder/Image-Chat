(() => {
"use strict";

// ============================================================
// File d'attente et communication avec l'API
// ============================================================

const API_FALLBACK_POLL_INTERVAL_SECONDS = 15;
const STOP_FALLBACK_POLL_INTERVAL_SECONDS = 5;
const MILLISECONDS_PER_SECOND = 1000;

const {
    applySettings,
    showMessage,
    stopCurrentMessage
} = window.livechatOverlayDisplay;

const previewMessages = [];
let lastStopRequestNumber = null;
let lastClearRequestNumber = null;
let queueGeneration = 0;
let queuePaused = false;
let resumeQueueResolver = null;
let messageQueueWakeRequested = false;
let messageQueueWakeResolver = null;

function secondsToMilliseconds(durationInSeconds) {
    return durationInSeconds * MILLISECONDS_PER_SECOND;
}

function sleep(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}

// Réveille immédiatement la file lorsqu'un message arrive par WebSocket.
function requestMessageQueueRefresh() {
    messageQueueWakeRequested = true;
    messageQueueWakeResolver?.();
}

async function waitForMessageQueueRefresh() {
    if (messageQueueWakeRequested) {
        messageQueueWakeRequested = false;
        return;
    }

    await new Promise((resolve) => {
        const timer = setTimeout(
            finish,
            secondsToMilliseconds(API_FALLBACK_POLL_INTERVAL_SECONDS)
        );

        function finish() {
            clearTimeout(timer);
            messageQueueWakeResolver = null;
            resolve();
        }

        messageQueueWakeResolver = finish;
    });

    messageQueueWakeRequested = false;
}

function setQueuePaused(paused) {
    if (queuePaused === paused) {
        return;
    }

    queuePaused = paused;

    if (!queuePaused) {
        resumeQueueResolver?.();
        resumeQueueResolver = null;
        requestMessageQueueRefresh();
    }
}

async function waitUntilQueueResumes() {
    if (!queuePaused) {
        return;
    }

    await new Promise((resolve) => {
        resumeQueueResolver = resolve;
    });
}

function clearLocalQueue() {
    queueGeneration += 1;
    stopCurrentMessage();
    requestMessageQueueRefresh();
}

// ============================================================
// Paramètres et aperçu local
// ============================================================

async function loadOverlaySettings() {
    const savedSettings = await window.livechatOverlaySettings.get();
    applySettings(savedSettings);

    window.livechatOverlaySettings.onUpdated(applySettings);

    window.livechatOverlaySettings.onTestMessage((message) => {
        previewMessages.push(message);
        requestMessageQueueRefresh();
    });
}

async function showQueuedPreviewMessages() {
    while (previewMessages.length > 0) {
        const previewMessage = previewMessages.shift();
        await showMessage(previewMessage);
    }
}

// ============================================================
// Appels à l'API
// ============================================================

async function getPendingMessages() {
    const messages = await window.livechatApi.getPendingMessages();

    if (!Array.isArray(messages)) {
        throw new Error("La réponse de l'API ne contient pas de liste de messages.");
    }

    return messages;
}

async function getRemoteControlState() {
    const state = await window.livechatApi.getState();

    if (!Number.isInteger(state.stopRequestNumber)
        || !Number.isInteger(state.clearRequestNumber)
        || typeof state.paused !== "boolean") {
        throw new Error("L'état de contrôle reçu est invalide.");
    }

    return state;
}

// ============================================================
// Surveillance de !stop et traitement de la file
// ============================================================

// Cette surveillance continue même pendant la lecture d'une vidéo.
function synchronizeRemoteControlState(state) {
    if (lastStopRequestNumber === null
        || state.stopRequestNumber < lastStopRequestNumber) {
        lastStopRequestNumber = state.stopRequestNumber;
    } else if (state.stopRequestNumber > lastStopRequestNumber) {
        lastStopRequestNumber = state.stopRequestNumber;
        stopCurrentMessage();
    }

    if (lastClearRequestNumber === null
        || state.clearRequestNumber < lastClearRequestNumber) {
        lastClearRequestNumber = state.clearRequestNumber;
    } else if (state.clearRequestNumber > lastClearRequestNumber) {
        lastClearRequestNumber = state.clearRequestNumber;
        clearLocalQueue();
    }

    setQueuePaused(state.paused);
}

async function startControlWatcher() {
    while (true) {
        try {
            synchronizeRemoteControlState(await getRemoteControlState());
        } catch {
            // La file principale affiche déjà les erreurs de connexion à l'API.
        }

        await sleep(secondsToMilliseconds(STOP_FALLBACK_POLL_INTERVAL_SECONDS));
    }
}

async function startMessageQueue() {
    while (true) {
        await showQueuedPreviewMessages();
        await waitUntilQueueResumes();

        try {
            const generationAtRequest = queueGeneration;
            const pendingMessages = await getPendingMessages();

            for (const message of pendingMessages) {
                await waitUntilQueueResumes();

                if (queueGeneration !== generationAtRequest) {
                    break;
                }

                await showMessage(message);

                if (queueGeneration !== generationAtRequest) {
                    break;
                }

                await window.livechatApi.markMessageAsConsumed(message.id);
                await showQueuedPreviewMessages();
            }
        } catch (error) {
            console.error("Erreur dans la file d'attente du LiveChat :", error);
        }

        await waitForMessageQueueRefresh();
    }
}

function registerRealtimeEvents() {
    window.livechatApi.onNewMessage(requestMessageQueueRefresh);

    window.livechatApi.onStop((event = {}) => {
        if (Number.isInteger(event.stopRequestNumber)) {
            lastStopRequestNumber = event.stopRequestNumber;
        }

        stopCurrentMessage();
    });

    window.livechatApi.onControl((event = {}) => {
        if (event.type === "livechat:next") {
            if (Number.isInteger(event.stopRequestNumber)) {
                lastStopRequestNumber = event.stopRequestNumber;
            }
            stopCurrentMessage();
        } else if (event.type === "livechat:clear") {
            if (Number.isInteger(event.clearRequestNumber)) {
                lastClearRequestNumber = event.clearRequestNumber;
            }
            clearLocalQueue();
        } else if (event.type === "livechat:pause") {
            setQueuePaused(true);
        } else if (event.type === "livechat:resume") {
            setQueuePaused(false);
        }
    });
}

// ============================================================
// Démarrage de l'overlay
// ============================================================

async function initializeOverlay() {
    try {
        await loadOverlaySettings();
    } catch (error) {
        console.error("Impossible de charger les paramètres de l'overlay :", error);
    }

    registerRealtimeEvents();

    try {
        // Mémorise l'état actuel sans déclencher d'ancienne commande.
        const initialState = await getRemoteControlState();
        lastStopRequestNumber = initialState.stopRequestNumber;
        lastClearRequestNumber = initialState.clearRequestNumber;
        setQueuePaused(initialState.paused);
    } catch {
        lastStopRequestNumber = null;
        lastClearRequestNumber = null;
    }

    startControlWatcher();
    startMessageQueue();
}

initializeOverlay();
})();
