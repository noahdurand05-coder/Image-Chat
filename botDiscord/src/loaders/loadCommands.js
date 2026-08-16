const fs = require("node:fs");
const path = require("node:path");

module.exports = function loadCommands(bot) {
    const commandsDirectory = path.join(__dirname, "../commands");
    const commandFiles = fs.readdirSync(commandsDirectory)
        .filter((fileName) => fileName.endsWith(".js"))
        .sort();

    for (const fileName of commandFiles) {
        const command = require(path.join(commandsDirectory, fileName));

        if (!command.name || typeof command.name !== "string") {
            throw new TypeError(`La commande ${fileName} n'a pas de nom valide.`);
        }

        if (typeof command.execute !== "function") {
            throw new TypeError(`La commande ${fileName} n'a pas de fonction execute.`);
        }

        bot.commands.set(command.name, command);
        console.log(`Commande ${fileName} chargée avec succès !`);
    }
};
