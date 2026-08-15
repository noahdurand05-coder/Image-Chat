const ALLOWED_MEDIA_TYPES = ["image/", "video/"];

function isImageOrVideo(attachment) {
    return typeof attachment.contentType === "string"
        && ALLOWED_MEDIA_TYPES.some((type) => attachment.contentType.startsWith(type));
}

async function sendToApi(livechat) {
    const response = await fetch("http://127.0.0.1:3000/api/livechat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(livechat)
    });

    if (!response.ok) {
        throw new Error(`Erreur API : ${response.status}`);
    }

    return response.json();
}

module.exports = {

    

//Commande pour envoyer un message dans le livechat.
    name: "livechat",

    async execute(bot, message, args ){

        const attachments = message.attachments;

        
//Vérification si l'utilisateur a bien envoyé une image ou une vidéo. Si ce n'est pas le cas, envoyer un message d'erreur.

        if (!attachments || attachments.size === 0) {
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }

        const attachment = attachments.first();

        if (!isImageOrVideo(attachment)) {
            return message.reply("❌ Le fichier doit être une image ou une vidéo !")
        }
//Création d'un objet livechat contenant le lien de l'image ou de la vidéo, le texte du message et les informations de l'utilisateur (pseudo et avatar).

        const livechat = {
            media : attachment.url,
            texte : message.content.replace("!livechat", "").trim(),
            user : {
            pseudo : message.author.username,
            avatar : message.author.displayAvatarURL()
        }
    }
//Vérification si l'utilisateur a bien envoyé un message. Si ce n'est pas le cas, envoyer un message d'erreur.

        if(!livechat.texte && livechat.media){
            await sendToApi(livechat);
            message.reply(" ✅ LiveChat envoyé !")
            
            
        }
//Vérification si l'utilisateur a bien envoyé un message et une image ou une vidéo. Si ce n'est pas le cas, envoyer un message d'erreur.

        if(livechat.texte && !livechat.media){
           return message.reply("❌ Tu dois envoyer une image ou une vidéo !")
        }


//Vérification si l'utilisateur a bien envoyé un message et une image ou une vidéo. Si c'est le cas, envoyer le message dans le livechat.

        if(livechat.texte && livechat.media) {
        await sendToApi(livechat);
        message.reply(" ✅ LiveChat envoyé !")
        }
    }

}


