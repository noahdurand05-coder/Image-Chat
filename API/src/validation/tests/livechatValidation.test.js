const assert = require("node:assert/strict");
const { validateLivechat } = require("../livechatValidation");

function createValidLivechat(overrides = {}) {
    return {
        media: "https://cdn.discordapp.com/attachments/123/456/photo.png",
        mediaType: "image/png",
        mediaSize: 500_000,
        texte: "Message de test",
        user: {
            discordId: "123456789012345678",
            pseudo: "Utilisateur test",
            avatar: "https://cdn.discordapp.com/avatars/123/avatar.png"
        },
        ...overrides
    };
}

const validResult = validateLivechat(createValidLivechat());
assert.ok(validResult.livechat);
assert.equal(validResult.error, null);

const externalUrlResult = validateLivechat(createValidLivechat({
    media: "https://example.com/photo.png"
}));
assert.equal(externalUrlResult.livechat, null);
assert.match(externalUrlResult.error, /Discord/i);

const wrongTypeResult = validateLivechat(createValidLivechat({
    mediaType: "text/html"
}));
assert.equal(wrongTypeResult.livechat, null);
assert.match(wrongTypeResult.error, /type réel/i);

const missingDiscordIdResult = validateLivechat(createValidLivechat({
    user: {
        pseudo: "Utilisateur test",
        avatar: "https://cdn.discordapp.com/avatars/123/avatar.png"
    }
}));
assert.equal(missingDiscordIdResult.livechat, null);
assert.match(missingDiscordIdResult.error, /profil/i);

console.log("Tests de validation des LiveChats réussis.");
