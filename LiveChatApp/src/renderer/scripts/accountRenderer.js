// ============================================================
// Éléments de l'espace compte
// ============================================================

const authStatusElement = document.getElementById("auth-status");
const disconnectedView = document.getElementById("account-disconnected");
const waitingView = document.getElementById("account-waiting");
const connectedView = document.getElementById("account-connected");
const discordLoginButton = document.getElementById("discord-login");
const logoutButton = document.getElementById("logout");
const accountAvatar = document.getElementById("account-avatar");
const accountUsername = document.getElementById("account-username");
const accountRole = document.getElementById("account-role");
const adminNavigation = document.getElementById("admin-navigation");

const AUTH_POLL_INTERVAL_MILLISECONDS = 2000;
let activeLoginSessionId = null;

// ============================================================
// Affichage des états du compte
// ============================================================

function setAccountElementVisible(element, visible) {
    element.hidden = !visible;
}

function showDisconnectedAccount(message = "") {
    setAccountElementVisible(disconnectedView, true);
    setAccountElementVisible(waitingView, false);
    setAccountElementVisible(connectedView, false);
    setAccountElementVisible(adminNavigation, false);

    authStatusElement.textContent = message;
    authStatusElement.hidden = !message;
}

function showWaitingAccount() {
    setAccountElementVisible(disconnectedView, false);
    setAccountElementVisible(waitingView, true);
    setAccountElementVisible(connectedView, false);
    setAccountElementVisible(adminNavigation, false);

    authStatusElement.textContent = "";
    authStatusElement.hidden = true;
}

function showConnectedAccount(user) {
    setAccountElementVisible(disconnectedView, false);
    setAccountElementVisible(waitingView, false);
    setAccountElementVisible(connectedView, true);
    setAccountElementVisible(adminNavigation, user.role === "admin");

    accountAvatar.src = user.avatarUrl || "";
    accountAvatar.alt = user.username
        ? `Avatar de ${user.username}`
        : "Avatar Discord";
    accountUsername.textContent = user.username;
    accountRole.textContent = user.role === "admin"
        ? "Administrateur"
        : "Utilisateur autorisé";

    authStatusElement.textContent = "";
    authStatusElement.hidden = true;

    // Les autres composants de la page peuvent réagir à la connexion sans
    // dépendre directement du fonctionnement interne de ce fichier.
    window.dispatchEvent(new CustomEvent("livechat:user-authenticated", {
        detail: { user }
    }));
}

function wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}

// ============================================================
// Connexion avec Discord
// ============================================================

async function pollDiscordLogin(sessionId, expiresInSeconds) {
    const expiresAt = Date.now() + (expiresInSeconds * 1000);

    while (activeLoginSessionId === sessionId && Date.now() < expiresAt) {
        try {
            const result = await window.livechatAuth.pollDiscordLogin(sessionId);

            if (result.state === "active") {
                activeLoginSessionId = null;
                showConnectedAccount(result.user);
                window.livechatToast.show(
                    `Connecté avec le compte ${result.user.username}.`,
                    "success"
                );
                return;
            }

            if (result.state === "pending" || result.state === "waiting_discord") {
                showWaitingAccount();
            } else if (result.state === "rejected") {
                activeLoginSessionId = null;
                showDisconnectedAccount("Cette demande a été refusée par l'administrateur.");
                window.livechatToast.show("Demande de connexion refusée.", "error");
                return;
            } else if (result.state === "blocked") {
                activeLoginSessionId = null;
                showDisconnectedAccount("Ce compte a été bloqué par l'administrateur.");
                window.livechatToast.show("Ce compte est actuellement bloqué.", "error");
                return;
            } else if (result.state === "expired" || result.state === "already_claimed") {
                activeLoginSessionId = null;
                showDisconnectedAccount("La demande a expiré. Tu peux recommencer.");
                window.livechatToast.show("La demande de connexion a expiré.", "info");
                return;
            }
        } catch (error) {
            // Une erreur temporaire ne doit pas interrompre toute la connexion.
            console.error("Impossible de vérifier la connexion Discord :", error);
        }

        await wait(AUTH_POLL_INTERVAL_MILLISECONDS);
    }

    if (activeLoginSessionId === sessionId) {
        activeLoginSessionId = null;
        showDisconnectedAccount("La demande a expiré. Tu peux recommencer.");
    }
}

async function startDiscordLogin() {
    discordLoginButton.disabled = true;

    try {
        const login = await window.livechatAuth.startDiscordLogin();
        activeLoginSessionId = login.sessionId;
        showWaitingAccount();
        await pollDiscordLogin(login.sessionId, login.expiresInSeconds);
    } catch (error) {
        console.error("Impossible de démarrer la connexion Discord :", error);
        showDisconnectedAccount(error.message || "La connexion Discord est indisponible.");
        window.livechatToast.show("La connexion Discord est indisponible.", "error");
    } finally {
        discordLoginButton.disabled = false;
    }
}

async function logout() {
    activeLoginSessionId = null;
    logoutButton.disabled = true;

    try {
        await window.livechatAuth.logout();
        showDisconnectedAccount("Tu es maintenant déconnecté.");
        window.livechatToast.show("Déconnexion effectuée.", "success");
    } finally {
        logoutButton.disabled = false;
    }
}

// ============================================================
// Initialisation du compte au chargement de la page
// ============================================================

async function initializeAccount() {
    discordLoginButton.addEventListener("click", startDiscordLogin);
    logoutButton.addEventListener("click", logout);

    try {
        const authState = await window.livechatAuth.getState();

        if (authState.authenticated) {
            showConnectedAccount(authState.user);
        } else {
            showDisconnectedAccount();
        }
    } catch (error) {
        console.error("Impossible de vérifier la session :", error);
        showDisconnectedAccount("L'API est actuellement inaccessible.");
        window.livechatToast.show("L'API LiveChat est inaccessible.", "error");
    }
}

initializeAccount();
