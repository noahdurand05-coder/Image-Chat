// ============================================================
// Règles de sécurité communes aux médias LiveChat
// ============================================================

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 10 * BYTES_PER_MEGABYTE;
const MAX_VIDEO_SIZE_BYTES = 25 * BYTES_PER_MEGABYTE;

const MEDIA_RULES = Object.freeze({
    ".jpg": { category: "image", contentTypes: ["image/jpeg"] },
    ".jpeg": { category: "image", contentTypes: ["image/jpeg"] },
    ".png": { category: "image", contentTypes: ["image/png"] },
    ".gif": { category: "image", contentTypes: ["image/gif"] },
    ".webp": { category: "image", contentTypes: ["image/webp"] },
    ".avif": { category: "image", contentTypes: ["image/avif"] },
    ".mp4": { category: "video", contentTypes: ["video/mp4"] },
    ".webm": { category: "video", contentTypes: ["video/webm"] },
    ".mov": { category: "video", contentTypes: ["video/quicktime"] },
    ".m4v": { category: "video", contentTypes: ["video/x-m4v", "video/mp4"] }
});

const ALLOWED_FORMATS_LABEL = "JPG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV ou M4V";

function getFileExtension(fileName) {
    if (typeof fileName !== "string") {
        return "";
    }

    const nameWithoutParameters = fileName.split(/[?#]/, 1)[0].toLowerCase();
    const extensionStart = nameWithoutParameters.lastIndexOf(".");

    return extensionStart >= 0 ? nameWithoutParameters.slice(extensionStart) : "";
}

function normalizeContentType(contentType) {
    return typeof contentType === "string"
        ? contentType.split(";", 1)[0].trim().toLowerCase()
        : "";
}

function getMaximumSize(category) {
    return category === "image"
        ? MAX_IMAGE_SIZE_BYTES
        : MAX_VIDEO_SIZE_BYTES;
}

function validateMediaMetadata({ fileName, contentType, size }) {
    const extension = getFileExtension(fileName);
    const rule = MEDIA_RULES[extension];

    if (!rule) {
        return {
            valid: false,
            error: `Format non autorisé. Utilise : ${ALLOWED_FORMATS_LABEL}.`
        };
    }

    const normalizedContentType = normalizeContentType(contentType);

    if (!rule.contentTypes.includes(normalizedContentType)) {
        return {
            valid: false,
            error: "Le type réel du fichier ne correspond pas à son extension."
        };
    }

    const numericSize = Number(size);

    if (!Number.isSafeInteger(numericSize) || numericSize <= 0) {
        return {
            valid: false,
            error: "La taille du média est absente ou invalide."
        };
    }

    const maximumSize = getMaximumSize(rule.category);

    if (numericSize > maximumSize) {
        const maximumMegabytes = maximumSize / BYTES_PER_MEGABYTE;
        const mediaLabel = rule.category === "image" ? "image" : "vidéo";

        return {
            valid: false,
            error: `Cette ${mediaLabel} dépasse la limite de ${maximumMegabytes} Mo.`
        };
    }

    return {
        valid: true,
        category: rule.category,
        extension,
        contentType: normalizedContentType,
        size: numericSize
    };
}

module.exports = {
    ALLOWED_FORMATS_LABEL,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    validateMediaMetadata
};
