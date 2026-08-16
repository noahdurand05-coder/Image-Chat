(() => {
    "use strict";

    const tutorialSteps = [
        {
            illustration: "01",
            title: "Bienvenue dans LiveChat",
            description: "LiveChat affiche sur ton écran les images et vidéos envoyées depuis ton salon Discord.",
            points: [
                "L'overlay reste au-dessus des autres fenêtres.",
                "Il ne bloque jamais les clics de la souris.",
                "Les messages sont affichés automatiquement dans leur ordre d'arrivée."
            ]
        },
        {
            illustration: "02",
            title: "Connecte ton compte Discord",
            description: "La connexion permet de vérifier que tu fais partie des utilisateurs autorisés.",
            points: [
                "Clique sur « Connexion Discord » en haut à droite.",
                "Termine la connexion dans la page Discord ouverte.",
                "Un nouveau compte doit être accepté par l'administrateur."
            ]
        },
        {
            illustration: "03",
            title: "Choisis ton affichage",
            description: "La page Paramètres permet d'adapter l'overlay à ton écran et à ton jeu.",
            points: [
                "Choisis l'un des cinq emplacements proposés.",
                "Sélectionne une taille petite, moyenne ou grande.",
                "Règle le volume des vidéos avec le curseur."
            ]
        },
        {
            illustration: "04",
            title: "Teste avant de commencer",
            description: "Le bouton « Tester l'overlay » affiche un exemple local sans utiliser Discord.",
            points: [
                "Vérifie la position et la taille sélectionnées.",
                "Le test ne crée aucun message dans la base de données.",
                "Tu peux le recommencer après chaque modification."
            ]
        },
        {
            illustration: "05",
            title: "Envoie ton premier LiveChat",
            description: "Tout est prêt : utilise maintenant les commandes dans le salon Discord configuré.",
            points: [
                "Joins une image ou une vidéo à la commande !livechat.",
                "Ajoute ton texte après la commande si tu le souhaites.",
                "Retrouve !pause, !next, !clear et les autres commandes dans la page Commandes."
            ]
        }
    ];

    const dialog = document.getElementById("tutorial-dialog");
    const openButton = document.getElementById("open-tutorial");
    const closeButton = document.getElementById("tutorial-close");
    const skipButton = document.getElementById("tutorial-skip");
    const previousButton = document.getElementById("tutorial-previous");
    const nextButton = document.getElementById("tutorial-next");
    const stepLabel = document.getElementById("tutorial-step-label");
    const title = document.getElementById("tutorial-title");
    const illustration = document.getElementById("tutorial-illustration");
    const description = document.getElementById("tutorial-description");
    const points = document.getElementById("tutorial-points");
    const progress = document.getElementById("tutorial-progress");

    let currentStepIndex = 0;
    let automaticTutorialUserId = null;
    let mustSaveCompletion = false;

    function renderProgress() {
        const dots = tutorialSteps.map((_step, index) => {
            const dot = document.createElement("span");
            dot.className = "tutorial-progress-dot";
            dot.classList.toggle("is-current", index === currentStepIndex);
            dot.classList.toggle("is-completed", index < currentStepIndex);
            return dot;
        });

        progress.replaceChildren(...dots);
    }

    function renderCurrentStep() {
        const step = tutorialSteps[currentStepIndex];
        const pointElements = step.points.map((point) => {
            const item = document.createElement("li");
            item.textContent = point;
            return item;
        });

        stepLabel.textContent = `Étape ${currentStepIndex + 1} sur ${tutorialSteps.length}`;
        title.textContent = step.title;
        illustration.textContent = step.illustration;
        description.textContent = step.description;
        points.replaceChildren(...pointElements);
        previousButton.hidden = currentStepIndex === 0;
        nextButton.textContent = currentStepIndex === tutorialSteps.length - 1
            ? "Terminer"
            : "Suivant";
        renderProgress();
    }

    function openTutorial(saveCompletion = false) {
        currentStepIndex = 0;
        mustSaveCompletion = saveCompletion;
        renderCurrentStep();

        if (!dialog.open) {
            dialog.showModal();
        }
    }

    async function completeAndClose(showConfirmation = false) {
        let completionSaved = true;

        if (mustSaveCompletion) {
            try {
                await window.livechatTutorial.complete();
            } catch (error) {
                completionSaved = false;
                console.error("Impossible d'enregistrer la fin du tutoriel :", error);
                window.livechatToast.show(
                    "La fin du tutoriel n'a pas pu être enregistrée.",
                    "error"
                );
            }
        }

        mustSaveCompletion = false;
        dialog.close();

        if (showConfirmation && completionSaved) {
            window.livechatToast.show("Tutoriel terminé. LiveChat est prêt !", "success");
        }
    }

    nextButton.addEventListener("click", () => {
        if (currentStepIndex < tutorialSteps.length - 1) {
            currentStepIndex += 1;
            renderCurrentStep();
            return;
        }

        completeAndClose(true);
    });

    previousButton.addEventListener("click", () => {
        if (currentStepIndex > 0) {
            currentStepIndex -= 1;
            renderCurrentStep();
        }
    });

    // L'ouverture manuelle permet de revoir le guide sans modifier le compte.
    openButton.addEventListener("click", () => openTutorial(false));
    closeButton.addEventListener("click", () => completeAndClose());
    skipButton.addEventListener("click", () => completeAndClose());

    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        completeAndClose();
    });

    function openForNewUser(user) {
        if (!user || user.tutorialCompleted || automaticTutorialUserId === user.id) {
            return;
        }

        automaticTutorialUserId = user.id;
        setTimeout(() => openTutorial(true), 450);
    }

    // accountRenderer envoie cet évènement uniquement après une connexion
    // Discord active. Les comptes anciens ont tutorialCompleted à true.
    window.addEventListener("livechat:user-authenticated", (event) => {
        openForNewUser(event.detail?.user);
    });
})();
