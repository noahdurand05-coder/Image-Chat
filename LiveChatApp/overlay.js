// ============================================================
// 1. Durées fixes de l'overlay
// ============================================================

const LIVECHAT_API_URL = "http://127.0.0.1:3000/api/livechat";
const API_POLL_INTERVAL_SECONDS = 3;
const STOP_POLL_INTERVAL_SECONDS = 0.5;
const IMAGE_DISPLAY_DURATION_SECONDS = 15;
const VIDEO_MAX_DISPLAY_DURATION_SECONDS = 60;
const ENTER_ANIMATION_DURATION_SECONDS = 0.36;
const EXIT_ANIMATION_DURATION_SECONDS = 0.28;
const MILLISECONDS_PER_SECOND = 1000;

// ============================================================
// 2. Valeurs autorisées pour les futurs paramètres
// ============================================================

const POSITIONS = new Set([
    "top-left",
    "top-right",
    "center",
    "bottom-left",
    "bottom-right"
]);

const SIZES = new Set(["small", "medium", "large"]);

// ============================================================
// 3. Éléments récupérés dans overlay.html
// ============================================================

const overlayRoot = document.getElementById("overlay-root");
const contentElement = document.getElementById("livechat-content");
const avatarElement = document.getElementById("livechat-avatar");
const usernameElement = document.getElementById("livechat-username");
const textElement = document.getElementById("livechat-text");
const mediaElement = document.getElementById("livechat-media");
const imageElement = document.getElementById("livechat-image");
const videoElement = document.getElementById("livechat-video");

// Contrôleur du message affiché. Il permet à !stop d'interrompre son attente.
let activeDisplayController = null;
let lastStopRequestNumber = null;

// ============================================================
// 4. Outils généraux de temporisation
// ============================================================

function wait(duration, signal) {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve(false);
            return;
        }

        const timer = setTimeout(() => finish(true), duration);

        function finish(completedNormally) {
            clearTimeout(timer);
            signal?.removeEventListener("abort", handleAbort);
            resolve(completedNormally);
        }

        function handleAbort() {
            finish(false);
        }

        signal?.addEventListener("abort", handleAbort, { once: true });
    });
}

function secondsToMilliseconds(durationInSeconds) {
    return durationInSeconds * MILLISECONDS_PER_SECOND;
}

// ============================================================
// 5. Application de la position et de la taille choisies
// ============================================================

function setPosition(position) {
    const selectedPosition = POSITIONS.has(position) ? position : "center";

    for (const availablePosition of POSITIONS) {
        overlayRoot.classList.remove(`position-${availablePosition}`);
    }

    overlayRoot.classList.add(`position-${selectedPosition}`);
}

function setSize(size) {
    const selectedSize = SIZES.has(size) ? size : "medium";

    for (const availableSize of SIZES) {
        overlayRoot.classList.remove(`size-${availableSize}`);
    }

    overlayRoot.classList.add(`size-${selectedSize}`);
}

// ============================================================
// 6. Détection, nettoyage et chargement des médias
// ============================================================

function isVideoMedia(mediaUrl, mediaType = "") {
    if (mediaType.startsWith("video/")) {
        return true;
    }

    return /\.(mp4|webm|mov|m4v|ogg)(?:$|[?#])/i.test(mediaUrl);
}

function resetMedia() {
    contentElement.style.removeProperty("width");

    imageElement.hidden = true;
    imageElement.removeAttribute("src");

    videoElement.pause();
    videoElement.hidden = true;
    videoElement.removeAttribute("src");
    videoElement.load();
}

function waitForImageToLoad(signal) {
    if (imageElement.complete) {
        return Promise.resolve(!signal?.aborted);
    }

    return new Promise((resolve) => {
        function finish(loadedNormally) {
            imageElement.removeEventListener("load", handleLoad);
            imageElement.removeEventListener("error", handleError);
            signal?.removeEventListener("abort", handleAbort);
            resolve(loadedNormally);
        }

        function handleLoad() {
            finish(true);
        }

        function handleError() {
            finish(false);
        }

        function handleAbort() {
            finish(false);
        }

        imageElement.addEventListener("load", handleLoad, { once: true });
        imageElement.addEventListener("error", handleError, { once: true });
        signal?.addEventListener("abort", handleAbort, { once: true });
    });
}

function waitForVideoMetadata(signal) {
    if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
        return Promise.resolve(!signal?.aborted);
    }

    return new Promise((resolve) => {
        function finish(loadedNormally) {
            videoElement.removeEventListener("loadedmetadata", handleMetadata);
            videoElement.removeEventListener("error", handleError);
            signal?.removeEventListener("abort", handleAbort);
            resolve(loadedNormally);
        }

        function handleMetadata() {
            finish(true);
        }

        function handleError() {
            finish(false);
        }

        function handleAbort() {
            finish(false);
        }

        videoElement.addEventListener("loadedmetadata", handleMetadata, { once: true });
        videoElement.addEventListener("error", handleError, { once: true });
        signal?.addEventListener("abort", handleAbort, { once: true });
    });
}

function matchContentWidthToMedia() {
    const mediaWidth = mediaElement.getBoundingClientRect().width;

    // Le pseudo et le texte prennent exactement la largeur du média affiché.
    if (mediaWidth > 0) {
        contentElement.style.width = `${Math.ceil(mediaWidth)}px`;
    }
}

// ============================================================
// 7. Lecture d'une vidéo dans la limite de 60 secondes
// ============================================================

async function playVideoForAllowedDuration(signal) {
    if (videoElement.readyState < HTMLMediaElement.HAVE_METADATA) {
        await waitForVideoMetadata(signal);
    }

    if (signal.aborted) {
        return;
    }

    const naturalDuration = Number.isFinite(videoElement.duration)
        ? videoElement.duration
        : VIDEO_MAX_DISPLAY_DURATION_SECONDS;

    const displayDuration = Math.min(
        naturalDuration,
        VIDEO_MAX_DISPLAY_DURATION_SECONDS
    );

    try {
        await videoElement.play();
    } catch (error) {
        console.error("Impossible de lire la vidéo :", error);
    }

    await new Promise((resolve) => {
        const timer = setTimeout(
            finish,
            secondsToMilliseconds(displayDuration)
        );

        function finish() {
            clearTimeout(timer);
            videoElement.removeEventListener("ended", finish);
            signal.removeEventListener("abort", finish);
            resolve();
        }

        videoElement.addEventListener("ended", finish, { once: true });
        signal.addEventListener("abort", finish, { once: true });
    });

    videoElement.pause();
}

// ============================================================
// 8. Cycle complet d'affichage d'un message
// ============================================================

async function showMessage(message) {
    const displayController = new AbortController();
    const { signal } = displayController;
    activeDisplayController = displayController;

    // Nettoie le message précédent.
    resetMedia();

    // Ajoute l'auteur et le texte reçus depuis l'API.
    avatarElement.src = message.userProfilePicture || "";
    avatarElement.hidden = !message.userProfilePicture;
    usernameElement.textContent = message.username || "Utilisateur";
    textElement.textContent = message.texte || "";
    textElement.hidden = !message.texte;

    const mediaUrl = message.media || "";
    const videoMedia = isVideoMedia(mediaUrl, message.mediaType);

    // Prépare soit la balise vidéo, soit la balise image.
    if (videoMedia) {
        videoElement.src = mediaUrl;
        videoElement.hidden = false;
    } else {
        imageElement.src = mediaUrl;
        imageElement.hidden = false;
    }

    contentElement.hidden = false;
    contentElement.className = "livechat-content";

    // Attend les dimensions réelles avant de lancer l'animation.
    if (videoMedia) {
        await waitForVideoMetadata(signal);
    } else {
        await waitForImageToLoad(signal);
    }

    if (signal.aborted) {
        contentElement.hidden = true;
        resetMedia();
        activeDisplayController = null;
        return;
    }

    matchContentWidthToMedia();

    // Animation d'apparition.
    contentElement.className = "livechat-content is-entering";
    await wait(secondsToMilliseconds(ENTER_ANIMATION_DURATION_SECONDS), signal);
    contentElement.className = "livechat-content is-visible";

    // Durée d'affichage selon le type de média.
    if (videoMedia) {
        await playVideoForAllowedDuration(signal);
    } else {
        await wait(secondsToMilliseconds(IMAGE_DISPLAY_DURATION_SECONDS), signal);
    }

    // Animation de disparition et nettoyage final.
    contentElement.className = "livechat-content is-exiting";
    await wait(secondsToMilliseconds(EXIT_ANIMATION_DURATION_SECONDS));
    contentElement.hidden = true;
    resetMedia();
    activeDisplayController = null;
}

// ============================================================
// 9. Fonctions qui pourront être pilotées par l'application
// ============================================================

window.livechatOverlay = {
    setPosition,
    setSize,
    showMessage
};

// ============================================================
// 10. Réception des paramètres de la fenêtre principale
// ============================================================

function applySettings(settings = {}) {
    setPosition(settings.position);
    setSize(settings.size);
}

async function loadOverlaySettings() {
    if (!window.livechatOverlaySettings) {
        return;
    }

    const savedSettings = await window.livechatOverlaySettings.get();
    applySettings(savedSettings);

    window.livechatOverlaySettings.onUpdated((updatedSettings) => {
        applySettings(updatedSettings);
    });
}

// ============================================================
// 11. Communication avec l'API et file d'attente
// ============================================================

async function getPendingMessages() {
    const response = await fetch(LIVECHAT_API_URL, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Erreur API GET : ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.messages)) {
        throw new Error("La réponse de l'API ne contient pas de liste de messages.");
    }

    return data.messages;
}

async function markMessageAsConsumed(messageId) {
    const response = await fetch(LIVECHAT_API_URL, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: messageId })
    });

    if (!response.ok) {
        throw new Error(`Erreur API PATCH : ${response.status}`);
    }
}

async function getStopRequestNumber() {
    const response = await fetch(`${LIVECHAT_API_URL}/stop`, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Erreur API STOP : ${response.status}`);
    }

    const data = await response.json();

    if (!Number.isInteger(data.stopRequestNumber)) {
        throw new Error("Le signal d'arrêt reçu est invalide.");
    }

    return data.stopRequestNumber;
}

function stopCurrentMessage() {
    if (activeDisplayController && !activeDisplayController.signal.aborted) {
        activeDisplayController.abort();
    }
}

// Cette surveillance reste active même pendant la lecture d'une vidéo.
async function startStopWatcher() {
    while (true) {
        try {
            const stopRequestNumber = await getStopRequestNumber();

            if (lastStopRequestNumber === null || stopRequestNumber < lastStopRequestNumber) {
                lastStopRequestNumber = stopRequestNumber;
            } else if (stopRequestNumber > lastStopRequestNumber) {
                lastStopRequestNumber = stopRequestNumber;
                stopCurrentMessage();
            }
        } catch {
            // La file principale affichera déjà une erreur si l'API est coupée.
        }

        await wait(secondsToMilliseconds(STOP_POLL_INTERVAL_SECONDS));
    }
}

async function startMessageQueue() {
    while (true) {
        try {
            const pendingMessages = await getPendingMessages();

            for (const message of pendingMessages) {
                await showMessage(message);
                await markMessageAsConsumed(message.id);
            }
        } catch (error) {
            console.error("Erreur dans la file d'attente du LiveChat :", error);
        }

        await wait(secondsToMilliseconds(API_POLL_INTERVAL_SECONDS));
    }
}

async function initializeOverlay() {
    try {
        await loadOverlaySettings();
    } catch (error) {
        console.error("Impossible de charger les paramètres de l'overlay :", error);
    }

    try {
        // Mémorise l'état actuel avant que le premier message soit affiché.
        lastStopRequestNumber = await getStopRequestNumber();
    } catch {
        lastStopRequestNumber = null;
    }

    startStopWatcher();
    startMessageQueue();
}

initializeOverlay();
