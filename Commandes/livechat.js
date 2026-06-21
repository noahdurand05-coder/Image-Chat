const Discord = require("discord.js")

module.exports = {

    name: "livechat",

    async execute(bot, message, args ){

        const attachments = message.attachments;

        

        if(!attachments || attachments.size === 0){
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }

        const attachement = attachments.first();
        const URL = {lien : attachement.url};
        const texte = { message : message.content.replace("!livechat", "").trim()};
        const user = {
            pseudo : message.author.username,
            avatar : message.author.displayAvatarURL()
        };

        
        if(!texte && URL){
            console.log("Utilisateur : ", user)
            console.log("Lien : ", URL);
            message.reply(" ✅ LiveChat envoyé !")
            
        }

        if(texte && !URL){
           return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }



        if(texte && URL) {
        console.log("Utilisateur : ", user)
        console.log("Lien : ", URL);
        console.log("Message : ", texte)
        
        message.reply(" ✅ LiveChat envoyé !")
        }
    }

}


