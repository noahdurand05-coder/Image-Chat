const { createUserCooldown } = require("../../../shared/livechatPolicy");

// Cette instance est partagée par toutes les requêtes reçues par l'API.
const livechatUserCooldown = createUserCooldown();

function reserveLivechatForUser(discordUserId) {
    return livechatUserCooldown.reserve(discordUserId);
}

module.exports = { reserveLivechatForUser };
