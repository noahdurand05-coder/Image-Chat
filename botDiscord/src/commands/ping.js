module.exports = {
    // Commande simple qui vérifie que le bot répond correctement.
    name: "ping",

    async execute(_bot, message) {
        await message.reply("Pong !");
    }
};
