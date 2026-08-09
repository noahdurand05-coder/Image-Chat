const Discord = require("discord.js")

module.exports = {

//Commande de test pour vérifier si le bot est bien en ligne et répond aux commandes. Cette commande répond "Pong !" lorsque l'utilisateur tape "!ping" dans le chat Discord.
    name: "ping",

    execute(bot, message, args){
        message.reply("Pong !")
    }
}
   