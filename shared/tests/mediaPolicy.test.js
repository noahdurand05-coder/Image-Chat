const assert = require("node:assert/strict");
const {
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    validateMediaMetadata
} = require("../mediaPolicy");

function expectValid(media) {
    assert.equal(validateMediaMetadata(media).valid, true);
}

function expectRejected(media, expectedMessagePart) {
    const result = validateMediaMetadata(media);

    assert.equal(result.valid, false);
    assert.match(result.error, new RegExp(expectedMessagePart, "i"));
}

expectValid({
    fileName: "photo.JPG",
    contentType: "image/jpeg",
    size: MAX_IMAGE_SIZE_BYTES
});

expectValid({
    fileName: "/attachments/123/video.mp4?exemple=1",
    contentType: "video/mp4",
    size: MAX_VIDEO_SIZE_BYTES
});

expectRejected({
    fileName: "image.svg",
    contentType: "image/svg+xml",
    size: 1000
}, "Format non autorisé");

expectRejected({
    fileName: "fausse-image.png",
    contentType: "text/html",
    size: 1000
}, "type réel");

expectRejected({
    fileName: "trop-lourde.webp",
    contentType: "image/webp",
    size: MAX_IMAGE_SIZE_BYTES + 1
}, "10 Mo");

expectRejected({
    fileName: "sans-taille.webm",
    contentType: "video/webm"
}, "taille");

console.log("Tests de sécurité des médias réussis.");
