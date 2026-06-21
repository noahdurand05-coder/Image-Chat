const Discord = require("discord.js")

module.exports = {

    name: "livechat",

    async execute(bot, message, args ){

        const attachments = message.attachments;

        

        if(!attachments || attachments.size === 0){
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }

        const attachement = attachments.first();
        const URL = attachement.url;
        const texte = message.content.replace("!livechat", "").trim();
        
        if(!texte && URL){
            message.reply(" ✅ LiveChat envoyé !")
            console.log("Lien : ", URL);
        }

        if(texte && !URL){
           return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }



        if(texte && URL) {
        console.log("Lien : ", URL);
        console.log("Message : ", texte)
        message.reply(" ✅ LiveChat envoyé !")
        }
    }

}


