const sql = require("mysql2/promise")
require("dotenv").config({ path: "../.env" });

/* Création d'un pool de connexions à la base de données MySQL en utilisant les informations de connexion stockées dans un fichier.
Le pool permet de gérer efficacement les connexions à la base de données, 
en réutilisant les connexions existantes au lieu d'en créer de nouvelles à chaque requête.*/

const pool = sql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.PORT_DB
});

// Fonction pour se connecter à la base de données MySQL en utilisant le pool de connexions créé précédemment.

async function connectDB() {
    try {
        await pool.getConnection();
        console.log("✅ Base de données connectée avec succès");
    } catch (err) {
        console.error("❌ Erreur SQL :", err.message);
        throw err;
    }
}

module.exports = {pool, connectDB}