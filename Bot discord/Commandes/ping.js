const Discord = require("discord.js")

module.exports = {

    name: "ping",

    execute(bot, message, args){
        message.reply("Pong !")
    }
}
        