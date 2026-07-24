const { pool } = require("./db");

//
async function insertDataBase({ media, texte, user }) {

    try {
        console.log("Insertion dans la base de données ...")

        const query = "INSERT INTO messages (media, texte, userProfilePicture, username) VALUES (?, ?, ?, ?)";
        const values = [media,
                       texte,
                       user.avatar,
                       user.pseudo
        ];

        await pool.query(query, values);

        console.log("Insertion réussie !");




    } catch (err) {
        console.log("Erreur lors de l'insertion dans la base de données :", err);
        throw err;
    }
}

async function getUnconsumedMessages() {
    try {
        console.log("Récupération des messages non consommés depuis la base de données ...")
        const [rows] = await pool.query("SELECT * FROM messages WHERE consumed = 0 ORDER BY dateCrea DESC");
        console.log("Messages récupérés avec succès !");
        return rows;
    } catch (err) {
        console.error("Erreur lors de la récupération des messages :", err);
        throw err;
    }
}

async function consumeMessages(id) {
    try {
        console.log(`Marquage du message ${id} comme consommé ...`);
        await pool.query("UPDATE messages SET consumed = 1 WHERE id = ?", [id]);
        console.log(`Message ${id} marqué comme consommé !`);
    } catch (err) {
        console.error(`Erreur lors du marquage du message ${id} comme consommé :`, err);
        throw err;
    }
}

module.exports = { insertDataBase, getUnconsumedMessages, consumeMessages };
