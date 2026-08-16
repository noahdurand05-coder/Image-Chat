const path = require("node:path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Le pool réutilise les connexions MySQL au lieu d'en ouvrir une à chaque requête.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.PORT_DB
});

async function connectDB() {
    try {
        const connection = await pool.getConnection();
        connection.release();
        console.log("✅ Base de données connectée avec succès");
    } catch (error) {
        console.error("❌ Connexion à la base de données impossible.");
        throw error;
    }
}

module.exports = { pool, connectDB };
