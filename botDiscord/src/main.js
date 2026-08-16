const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { Client, Collection, GatewayIntentBits } = require("discord.js");
const loadCommands = require("./loaders/loadCommands");
const { isLivechatUserAuthorized } = require("./services/livechatApi");

const COMMAND_PREFIX = "!";

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

bot.commands = new Collection();
loadCommands(bot);

bot.once("ready", () => {
    console.log(`🤖 ${bot.user.tag} est bien en ligne`);
});

// Ignore rapidement les messages qui ne peuvent pas être une commande autorisée.
bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== process.env.CHANNEL_ID) return;
    if (!message.content.startsWith(COMMAND_PREFIX)) return;

    const args = message.content
        .slice(COMMAND_PREFIX.length)
        .trim()
        .split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = bot.commands.get(commandName);

    if (!command) return;

    try {
        const authorized = await isLivechatUserAuthorized(message.author.id);

        if (!authorized) {
            await message.reply(
                "Ton compte Discord n'est pas autorisé à utiliser LiveChat."
            );
            return;
        }

        await command.execute(bot, message, args);
    } catch (error) {
        console.error(
            "La commande Discord n'a pas pu être exécutée :",
            error.message
        );
        await message.reply("Erreur commande");
    }
});

bot.login(process.env.TOKEN);
