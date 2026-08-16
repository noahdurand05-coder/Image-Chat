// Cette adresse n'est pas un secret. Elle sera remplacée par l'adresse HTTPS
// du serveur au moment de préparer la version distribuée de l'application.
const API_BASE_URL = process.env.LIVECHAT_API_URL
    || "http://127.0.0.1:3000/api";

module.exports = { API_BASE_URL };
