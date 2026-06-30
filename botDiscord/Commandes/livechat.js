const Discord = require("discord.js")
const { insertDataBase } = require("../message")

module.exports = {

    name: "livechat",

    async execute(bot, message, args ){

        const attachments = message.attachments;

        

        if(!attachments || attachments.size === 0){
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }

        const livechat = {
            media : attachments.first().url,
            texte : message.content.replace("!livechat", "").trim(),
            user : {
            pseudo : message.author.username,
            avatar : message.author.displayAvatarURL()
        }
    }
       
        if(!livechat.texte && livechat.media){
            console.log("Utilisateur : ", livechat.user)
            console.log("Lien : ", livechat.media);
            await insertDataBase(livechat);
            message.reply(" ✅ LiveChat envoyé !")
            
            
        }

        if(livechat.texte && !livechat.media){
           return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }



        if(livechat.texte && livechat.media) {
        console.log("Utilisateur : ", livechat.user)
        console.log("Lien : ", livechat.media);
        console.log("Message : ", livechat.texte)
        await insertDataBase(livechat);
        message.reply(" ✅ LiveChat envoyé !")
        }
    }

}


