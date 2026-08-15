const STOP_API_URL = "http://127.0.0.1:3000/api/livechat/stop";

// ============================================================
// Commande Discord : !stop
// ============================================================

async function requestLivechatStop() {
    const response = await fetch(STOP_API_URL, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(`Erreur API : ${response.status}`);
    }
}

module.exports = {
    name: "stop",

    async execute(bot, message) {
        await requestLivechatStop();
        await message.reply("LiveChat Stoppé");
    }
};
