// ============================================================
// Éléments de la page et état local
// ============================================================

const accessCheck = document.getElementById("admin-access-check");
const adminPageContent = document.getElementById("admin-page-content");
const adminUsers = document.getElementById("admin-users");
const adminStatus = document.getElementById("admin-status");
const refreshUsersButton = document.getElementById("refresh-users");
const filterButtons = [...document.querySelectorAll("[data-admin-filter]")];

const countElements = {
    all: document.getElementById("admin-count-all"),
    online: document.getElementById("admin-count-online"),
    offline: document.getElementById("admin-count-offline"),
    pending: document.getElementById("admin-count-pending")
};

const confirmDialog = document.getElementById("admin-confirm-dialog");
const confirmMessage = document.getElementById("admin-confirm-message");

const STATUS_LABELS = {
    pending: "En attente",
    active: "Autorisé",
    rejected: "Refusé",
    blocked: "Bloqué"
};

let loadedUsers = [];
let selectedFilter = "all";
let pendingUserAction = null;

// ============================================================
// État visuel et actions disponibles pour un utilisateur
// ============================================================

function getUserIndicatorState(user) {
    if (user.status === "pending") {
        return "waiting";
    }

    return user.status === "active" && user.online
        ? "online"
        : "offline";
}

function getUserActions(user) {
    if (user.role === "admin") {
        return [];
    }

    if (user.status === "pending") {
        return [
            { label: "Accepter", status: "active", style: "approve" },
            { label: "Refuser", status: "rejected", style: "reject" }
        ];
    }

    if (user.status === "active") {
        return [{ label: "Bloquer", status: "blocked", style: "reject" }];
    }

    return [{ label: "Autoriser", status: "active", style: "approve" }];
}

function createUserBadge(label, style) {
    const badge = document.createElement("span");
    badge.className = `admin-user-badge is-${style}`;
    badge.textContent = label;
    return badge;
}

// ============================================================
// Construction d'une carte utilisateur
// ============================================================

function createUserRow(user) {
    const row = document.createElement("article");
    row.className = "admin-user";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "admin-user-avatar-wrapper";

    const avatar = document.createElement("img");
    avatar.className = "admin-user-avatar";
    avatar.src = user.avatarUrl || "";
    avatar.alt = "";

    const indicatorState = getUserIndicatorState(user);
    const statusDot = document.createElement("span");
    statusDot.className = `admin-user-status-dot is-${indicatorState}`;
    statusDot.setAttribute("aria-hidden", "true");
    avatarWrapper.append(avatar, statusDot);

    const identity = document.createElement("div");
    identity.className = "admin-user-identity";

    const name = document.createElement("strong");
    name.textContent = user.username;

    const badges = document.createElement("div");
    badges.className = "admin-user-badges";

    const accountLabel = user.role === "admin"
        ? "Administrateur"
        : STATUS_LABELS[user.status] || user.status;
    const accountStyle = user.role === "admin" ? "admin" : user.status;
    const presenceLabel = indicatorState === "online"
        ? "En ligne"
        : indicatorState === "waiting" ? "Validation requise" : "Hors ligne";

    badges.append(
        createUserBadge(accountLabel, accountStyle),
        createUserBadge(presenceLabel, indicatorState)
    );

    if (user.role !== "admin") {
        badges.append(
            createUserBadge(`${user.deviceCount} appareil(s)`, "device")
        );
    }

    identity.append(name, badges);

    const actions = document.createElement("div");
    actions.className = "admin-user-actions";

    for (const action of getUserActions(user)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `user-action user-action-${action.style}`;
        button.textContent = action.label;
        button.addEventListener("click", () => requestUserAction(user, action));
        actions.append(button);
    }

    row.append(avatarWrapper, identity, actions);
    return row;
}

// ============================================================
// Compteurs et filtres
// ============================================================

function updateCounters() {
    const counts = {
        all: loadedUsers.length,
        online: loadedUsers.filter(
            (user) => getUserIndicatorState(user) === "online"
        ).length,
        offline: loadedUsers.filter(
            (user) => getUserIndicatorState(user) === "offline"
        ).length,
        pending: loadedUsers.filter(
            (user) => getUserIndicatorState(user) === "waiting"
        ).length
    };

    for (const [filter, count] of Object.entries(counts)) {
        countElements[filter].textContent = count;
    }
}

function renderUsers() {
    const visibleUsers = selectedFilter === "all"
        ? loadedUsers
        : loadedUsers.filter(
            (user) => getUserIndicatorState(user) === selectedFilter
        );

    if (visibleUsers.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.className = "admin-empty-state";
        emptyState.textContent = loadedUsers.length === 0
            ? "Aucun utilisateur n'est encore enregistré."
            : "Aucun utilisateur ne correspond à ce filtre.";
        adminUsers.replaceChildren(emptyState);
        return;
    }

    adminUsers.replaceChildren(...visibleUsers.map(createUserRow));
}

function selectFilter(filter) {
    selectedFilter = filter;

    for (const button of filterButtons) {
        const selected = button.dataset.adminFilter === selectedFilter;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    }

    renderUsers();
}

// ============================================================
// Confirmation et modification d'un compte
// ============================================================

function requestUserAction(user, action) {
    const requiresConfirmation = action.status === "blocked"
        || action.status === "rejected";

    if (!requiresConfirmation) {
        updateAdminUser(user.id, action.status, user.username);
        return;
    }

    pendingUserAction = {
        userId: user.id,
        status: action.status,
        username: user.username
    };
    confirmMessage.textContent = action.status === "blocked"
        ? `Bloquer ${user.username} déconnectera immédiatement ses appareils.`
        : `Refuser la demande de ${user.username} empêchera sa connexion.`;
    confirmDialog.showModal();
}

confirmDialog.addEventListener("close", () => {
    const confirmedAction = pendingUserAction;
    pendingUserAction = null;

    if (confirmDialog.returnValue === "confirm" && confirmedAction) {
        updateAdminUser(
            confirmedAction.userId,
            confirmedAction.status,
            confirmedAction.username
        );
    }
});

// ============================================================
// Chargement des comptes depuis l'API
// ============================================================

async function loadAdminUsers() {
    refreshUsersButton.disabled = true;
    adminStatus.textContent = "Chargement des utilisateurs…";

    try {
        const { users } = await window.livechatAuth.getUsers();
        loadedUsers = users;
        updateCounters();
        renderUsers();
        adminStatus.textContent = `${users.length} utilisateur(s) enregistré(s).`;
    } catch (error) {
        console.error("Impossible de charger les utilisateurs :", error);
        adminStatus.textContent = "Impossible de charger les utilisateurs.";
        window.livechatToast.show("Impossible de charger les utilisateurs.", "error");
    } finally {
        refreshUsersButton.disabled = false;
    }
}

async function updateAdminUser(userId, status, username) {
    adminStatus.textContent = "Mise à jour de l'utilisateur…";

    try {
        await window.livechatAuth.updateUser(userId, status);
        await loadAdminUsers();
        window.livechatToast.show(
            `${username} a bien été mis à jour.`,
            "success"
        );
    } catch (error) {
        console.error("Impossible de modifier l'utilisateur :", error);
        adminStatus.textContent = "La modification a échoué.";
        window.livechatToast.show("La modification a échoué.", "error");
    }
}

// ============================================================
// Protection et initialisation de la page
// ============================================================

async function initializeAdministrationPage() {
    try {
        const authState = await window.livechatAuth.getState();

        if (!authState.authenticated || authState.user.role !== "admin") {
            window.location.replace("index.html");
            return;
        }

        accessCheck.hidden = true;
        adminPageContent.hidden = false;
        refreshUsersButton.addEventListener("click", loadAdminUsers);

        for (const button of filterButtons) {
            button.addEventListener("click", () => {
                selectFilter(button.dataset.adminFilter);
            });
        }

        await loadAdminUsers();
    } catch {
        window.location.replace("index.html");
    }
}

initializeAdministrationPage();
