const Discord = require("discord.js")
const bot = new.Discord.Client()
const config = require("/config")

bot.login(config.DISCORD_TOKEN)