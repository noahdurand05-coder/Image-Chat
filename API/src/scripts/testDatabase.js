const { connectDB, pool } = require("../config/db");

async function testDatabaseConnection() {
    try {
        await connectDB();
    } finally {
        // Sans cette fermeture, le pool garde le terminal ouvert.
        await pool.end();
    }
}

testDatabaseConnection().catch((error) => {
    console.error("Le test de connexion a échoué :", error.message);
    process.exitCode = 1;
});
