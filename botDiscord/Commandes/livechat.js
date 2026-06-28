const Discord = require("discord.js")
const { insertDataBase } = require("../message")

module.exports = {

    name: "livechat",

    async execute(bot, message, args ){

        const attachments = message.attachments;

        

        if(!attachments || attachments.size === 0){
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }

        const attachement = attachments.first();
        const media =  attachement.url;
        const texte =  message.content.replace("!livechat", "").trim();
        const user = {
            pseudo : message.author.username,
            avatar : message.author.displayAvatarURL()
        };

        
        if(!texte && media){
            console.log("Utilisateur : ", user)
            console.log("Lien : ", media);
            await insertDataBase({media,texte,user});
            message.reply(" ✅ LiveChat envoyé !")
            
            
        }

        if(texte && !media){
           return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }



        if(texte && media) {
        console.log("Utilisateur : ", user)
        console.log("Lien : ", media);
        console.log("Message : ", texte)
        await insertDataBase({media,texte,user});
        message.reply(" ✅ LiveChat envoyé !")
        }
    }

}


