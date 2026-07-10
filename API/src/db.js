const sql = require("mysql2/promise")
require("dotenv").config({ path: "../.env" });

const pool = sql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.PORT_DB
});

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