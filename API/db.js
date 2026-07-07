const sql = require("mssql")

module.exports = {sql, connectDB}

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

async function connectDB() {

    try{
        await sql.connect(config)
        console.log("✅ Base de données connectée avec succès")
    }catch(err){
        console.error("❌ Erreur SQL :", err.message)
        throw err
        }
    
}