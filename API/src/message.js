const { pool } = require("./db");

const CONSUMED_MESSAGE_RETENTION_HOURS = 24;

// ============================================================
// 1. Création d'un message
// ============================================================

async function insertDataBase({ media, texte, user }) {
    try {
        const query = `
            INSERT INTO messages (media, texte, userProfilePicture, username)
            VALUES (?, ?, ?, ?)
        `;
        const values = [media, texte, user.avatar, user.pseudo];

        await pool.query(query, values);
        console.log("Message ajouté dans la base de données.");
    } catch (error) {
        console.error("Erreur lors de l'insertion d'un message.");
        throw error;
    }
}

// ============================================================
// 2. Lecture des messages encore en attente
// ============================================================

async function getUnconsumedMessages() {
    try {
        const query = `
            SELECT id, media, texte, userProfilePicture, username, dateCrea
            FROM messages
            WHERE consumed = 0
            ORDER BY dateCrea ASC
        `;
        const [rows] = await pool.query(query);

        return rows;
    } catch (error) {
        console.error("Erreur lors de la récupération des messages.");
        throw error;
    }
}

// ============================================================
// 3. Consommation d'un message
// L'heure est enregistrée pour calculer les 24 heures de conservation.
// ============================================================

async function consumeMessages(id) {
    try {
        const query = `
            UPDATE messages
            SET consumed = 1, consumedAt = NOW()
            WHERE id = ? AND consumed = 0
        `;

        const [result] = await pool.query(query, [id]);
        console.log("Un message a été marqué comme consommé.");

        return result.affectedRows;
    } catch (error) {
        console.error("Erreur lors de la consommation d'un message.");
        throw error;
    }
}

// ============================================================
// 4. Préparation automatique de la colonne consumedAt
// ============================================================

async function initializeMessageCleanup() {
    const [columns] = await pool.query(
        "SHOW COLUMNS FROM messages LIKE 'consumedAt'"
    );

    if (columns.length === 0) {
        await pool.query(`
            ALTER TABLE messages
            ADD COLUMN consumedAt DATETIME NULL AFTER consumed
        `);

        console.log("Colonne consumedAt ajoutée à la table messages.");
    }

    // Les anciennes lignes consommées commencent leur délai de 24 h maintenant.
    await pool.query(`
        UPDATE messages
        SET consumedAt = NOW()
        WHERE consumed = 1 AND consumedAt IS NULL
    `);
}

// ============================================================
// 5. Suppression des messages consommés depuis au moins 24 heures
// ============================================================

async function deleteExpiredConsumedMessages() {
    const query = `
        DELETE FROM messages
        WHERE consumed = 1
          AND consumedAt <= DATE_SUB(
              NOW(),
              INTERVAL ${CONSUMED_MESSAGE_RETENTION_HOURS} HOUR
          )
    `;
    const [result] = await pool.query(query);

    if (result.affectedRows > 0) {
        console.log(`${result.affectedRows} message(s) consommé(s) supprimé(s).`);
    }

    return result.affectedRows;
}

module.exports = {
    insertDataBase,
    getUnconsumedMessages,
    consumeMessages,
    initializeMessageCleanup,
    deleteExpiredConsumedMessages
};
