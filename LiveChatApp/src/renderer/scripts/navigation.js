// Affiche le lien d'administration uniquement pour le compte administrateur.
async function initializePrivateNavigation() {
    const adminNavigation = document.getElementById("admin-navigation");

    if (!adminNavigation || !window.livechatAuth) {
        return;
    }

    try {
        const authState = await window.livechatAuth.getState();
        adminNavigation.hidden = !(
            authState.authenticated && authState.user.role === "admin"
        );
    } catch {
        adminNavigation.hidden = true;
    }
}

initializePrivateNavigation();
