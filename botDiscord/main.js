require("dotenv").config();
const Discord = require("discord.js")
const { GatewayIntentBits } = require("discord.js");
const bot = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})
const loadCommands = require("./Loader/loadCommands.js")



bot.commands = new Discord.Collection()

bot.login(process.env.TOKEN)    
loadCommands(bot)

bot.on("ready", () => {
    console.log("🤖 "+ `${bot.user.tag}` + " est bien en ligne")
})



bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.channel.id !== process.env.CHANNEL_ID) return;

    const prefix = "!"

    if (!message.content.startsWith(prefix)) return;


    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = bot.commands.get(commandName);
    if (!command) return;

    try {
        command.execute(bot, message, args)
    } catch (err) {
        console.error(err);
        message.reply('Erreur commande')
    }
})





