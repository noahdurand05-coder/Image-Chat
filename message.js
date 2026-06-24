const {sql} = require("./db")

async function insertDataBase({ media, texte, user }) {

     try {
        console.log("➡ INSERT START");

        const request = new sql.Request();

        request.input("media", sql.NVarChar(sql.MAX), media);
        request.input("texte", sql.NVarChar(sql.MAX), texte);
        request.input("avatar", sql.NVarChar(sql.MAX), user.avatar);
        request.input("username", sql.NVarChar(50), user.pseudo);

        const result = await request.query(`
            INSERT INTO Messages
            (media, texte, userProfilePicture, username)
            VALUES
            (@media, @texte, @avatar, @username)
        `);

        console.log("✅ INSERT SUCCESS");
        console.log("ROWS:", result.rowsAffected);

    } catch (err) {
        console.log("❌ SQL ERROR:", err);
    }
}


module.exports = {insertDataBase};
