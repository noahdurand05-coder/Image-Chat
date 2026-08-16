(() => {
"use strict";

// ============================================================
// Constantes visuelles de l'overlay
// ============================================================

const PREVIEW_DISPLAY_DURATION_SECONDS = 5;
const IMAGE_DISPLAY_DURATION_SECONDS = 15;
const VIDEO_MAX_DISPLAY_DURATION_SECONDS = 60;
const ENTER_ANIMATION_DURATION_SECONDS = 0.36;
const EXIT_ANIMATION_DURATION_SECONDS = 0.28;
const MILLISECONDS_PER_SECOND = 1000;

const ALLOWED_POSITIONS = new Set([
    "top-left",
    "top-right",
    "center",
    "bottom-left",
    "bottom-right"
]);

const ALLOWED_SIZES = new Set(["small", "medium", "large"]);

// ============================================================
// Éléments de la page
// ============================================================

const overlayRoot = document.getElementById("overlay-root");
const contentElement = document.getElementById("livechat-content");
const avatarElement = document.getElementById("livechat-avatar");
const usernameElement = document.getElementById("livechat-username");
const textElement = document.getElementById("livechat-text");
const mediaElement = document.getElementById("livechat-media");
const imageElement = document.getElementById("livechat-image");
const videoElement = document.getElementById("livechat-video");

// Ce contrôleur permet à la commande !stop d'interrompre l'affichage en cours.
let activeDisplayController = null;

// ============================================================
// Outils de temporisation et de chargement
// ============================================================

function secondsToMilliseconds(durationInSeconds) {
    return durationInSeconds * MILLISECONDS_PER_SECOND;
}

// Attend une durée, sauf si le signal d'arrêt est déclenché avant la fin.
function waitForDuration(duration, signal) {
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

// Cette même logique sert au chargement d'une image et d'une vidéo.
function waitForMediaEvent(element, successEvent, isAlreadyReady, signal) {
    if (isAlreadyReady()) {
        return Promise.resolve(!signal?.aborted);
    }

    return new Promise((resolve) => {
        function finish(loadedNormally) {
            element.removeEventListener(successEvent, handleSuccess);
            element.removeEventListener("error", handleError);
            signal?.removeEventListener("abort", handleAbort);
            resolve(loadedNormally);
        }

        function handleSuccess() {
            finish(true);
        }

        function handleError() {
            finish(false);
        }

        function handleAbort() {
            finish(false);
        }

        element.addEventListener(successEvent, handleSuccess, { once: true });
        element.addEventListener("error", handleError, { once: true });
        signal?.addEventListener("abort", handleAbort, { once: true });
    });
}

function waitForImageToLoad(signal) {
    return waitForMediaEvent(
        imageElement,
        "load",
        () => imageElement.complete && imageElement.naturalWidth > 0,
        signal
    );
}

function waitForVideoMetadata(signal) {
    return waitForMediaEvent(
        videoElement,
        "loadedmetadata",
        () => videoElement.readyState >= HTMLMediaElement.HAVE_METADATA,
        signal
    );
}

// ============================================================
// Position, taille et volume
// ============================================================

function replaceClassFromList(prefix, selectedValue, allowedValues, defaultValue) {
    const safeValue = allowedValues.has(selectedValue) ? selectedValue : defaultValue;

    for (const value of allowedValues) {
        overlayRoot.classList.remove(`${prefix}-${value}`);
    }

    overlayRoot.classList.add(`${prefix}-${safeValue}`);
}

function applySettings(settings = {}) {
    replaceClassFromList("position", settings.position, ALLOWED_POSITIONS, "center");
    replaceClassFromList("size", settings.size, ALLOWED_SIZES, "medium");

    const requestedVolume = Number(settings.volume);
    const safeVolume = Number.isFinite(requestedVolume)
        ? Math.min(100, Math.max(0, requestedVolume))
        : 100;

    // La propriété volume d'une vidéo utilise une valeur comprise entre 0 et 1.
    videoElement.volume = safeVolume / 100;
    videoElement.muted = safeVolume === 0;
}

// ============================================================
// Préparation du média
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

function matchContentWidthToMedia(displayedMediaElement) {
    const mediaWidth = displayedMediaElement.getBoundingClientRect().width;

    // Le pseudo et le texte prennent exactement la largeur du média affiché.
    if (mediaWidth > 0) {
        contentElement.style.width = `${Math.ceil(mediaWidth)}px`;
    }
}

async function playVideoForAllowedDuration(signal) {
    const naturalDuration = Number.isFinite(videoElement.duration)
        ? videoElement.duration
        : VIDEO_MAX_DISPLAY_DURATION_SECONDS;
    const displayDuration = Math.min(naturalDuration, VIDEO_MAX_DISPLAY_DURATION_SECONDS);

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
// Cycle complet d'affichage d'un LiveChat
// ============================================================

async function showMessage(message) {
    const displayController = new AbortController();
    const { signal } = displayController;
    activeDisplayController = displayController;

    resetMedia();

    avatarElement.src = message.userProfilePicture || "";
    avatarElement.hidden = !message.userProfilePicture;
    usernameElement.textContent = message.username || "Utilisateur";
    textElement.textContent = message.texte || "";
    textElement.hidden = !message.texte;

    const mediaUrl = message.media || "";
    const videoMedia = isVideoMedia(mediaUrl, message.mediaType);

    if (videoMedia) {
        videoElement.src = mediaUrl;
        videoElement.hidden = false;
    } else {
        imageElement.src = mediaUrl;
        imageElement.hidden = false;
    }

    contentElement.hidden = false;
    contentElement.className = "livechat-content";

    const mediaLoaded = videoMedia
        ? await waitForVideoMetadata(signal)
        : await waitForImageToLoad(signal);

    if (!mediaLoaded || signal.aborted) {
        contentElement.hidden = true;
        resetMedia();
        activeDisplayController = null;
        return;
    }

    matchContentWidthToMedia(videoMedia ? videoElement : imageElement);

    contentElement.className = "livechat-content is-entering";
    await waitForDuration(secondsToMilliseconds(ENTER_ANIMATION_DURATION_SECONDS), signal);
    contentElement.className = "livechat-content is-visible";

    if (videoMedia) {
        await playVideoForAllowedDuration(signal);
    } else {
        const imageDuration = message.isPreview
            ? PREVIEW_DISPLAY_DURATION_SECONDS
            : IMAGE_DISPLAY_DURATION_SECONDS;

        await waitForDuration(secondsToMilliseconds(imageDuration), signal);
    }

    contentElement.className = "livechat-content is-exiting";
    await waitForDuration(secondsToMilliseconds(EXIT_ANIMATION_DURATION_SECONDS));
    contentElement.hidden = true;
    resetMedia();
    activeDisplayController = null;
}

function stopCurrentMessage() {
    if (activeDisplayController && !activeDisplayController.signal.aborted) {
        activeDisplayController.abort();
    }
}

// Un seul objet public regroupe les fonctions utilisées par overlay.js.
window.livechatOverlayDisplay = {
    applySettings,
    showMessage,
    stopCurrentMessage
};
})();
