const { goToNextLivechat } = require("../services/livechatApi");

module.exports = {
    name: "next",

    async execute(_bot, message) {
        await goToNextLivechat();
        await message.reply("Passage au LiveChat suivant.");
    }
};
