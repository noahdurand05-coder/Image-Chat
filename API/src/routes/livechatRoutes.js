
const express = require('express');
const router = express.Router();
const { insertDataBase, getUnconsumedMessages, consumeMessages} = require('../message');


router.post ('/', async (req, res) => {

    try {
        const livechat = req.body;
        await insertDataBase(livechat);
        console.log("Livechat reçu :", livechat);

        res.json({ message: 'Livechat reçu avec succès !' });


    }catch (err) {
        console.error("Erreur lors de la réception du livechat :", err);
        res.status(500).json({ error: 'Erreur lors de la réception du livechat' });
    }
})

router.get ('/', async (req, res) => {
    try {
        const messages = await getUnconsumedMessages();

        res.json({ messages });
        


    } catch (err) {
        console.error("Erreur lors de la récupération du message :", err);
        res.status(500).json({ error: 'Erreur lors de la récupération du message' });
    }
})

router.patch('/', async (req, res) => {
    try {
        const { id } = req.body;

       const consume =  await consumeMessages(id);

        res.json({ message: 'Message marqué comme consommé avec succès !' });

    } catch (err) {
        console.error("Erreur lors du marquage du message comme consommé :", err);
        res.status(500).json({ error: 'Erreur lors du marquage du message comme consommé' });
    }
});

module.exports = router;