const { WebSocketServer, WebSocket } = require("ws");
const { findAuthenticatedUser } = require("./authService");

const AUTHENTICATION_TIMEOUT_MILLISECONDS = 5000;
const HEARTBEAT_INTERVAL_MILLISECONDS = 30000;
const connectionsByUserId = new Map();

function addConnection(userId, socket) {
    const userConnections = connectionsByUserId.get(userId) || new Set();
    userConnections.add(socket);
    connectionsByUserId.set(userId, userConnections);
}

function removeConnection(socket) {
    if (!socket.userId) {
        return;
    }

    const userConnections = connectionsByUserId.get(socket.userId);
    userConnections?.delete(socket);

    if (userConnections?.size === 0) {
        connectionsByUserId.delete(socket.userId);
    }
}

function closeSocket(socket, code, reason) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.close(code, reason);
    }
}

async function authenticateSocket(socket, rawMessage, authenticationTimer) {
    if (socket.userId || socket.authenticationInProgress) {
        return;
    }

    socket.authenticationInProgress = true;

    try {
        const message = JSON.parse(rawMessage.toString());

        if (message.type !== "authenticate") {
            closeSocket(socket, 4001, "Authentification requise");
            return;
        }

        const user = await findAuthenticatedUser(message.accessToken);

        if (!user) {
            closeSocket(socket, 4001, "Session invalide");
            return;
        }

        clearTimeout(authenticationTimer);
        socket.userId = user.id;
        addConnection(user.id, socket);
        socket.send(JSON.stringify({ type: "authenticated" }));
    } catch {
        closeSocket(socket, 4002, "Message invalide");
    } finally {
        socket.authenticationInProgress = false;
    }
}

// ============================================================
// 1. Connexions temps réel et présence des applications
// ============================================================

function initializeRealtimeServer(httpServer) {
    const webSocketServer = new WebSocketServer({
        server: httpServer,
        path: "/api/livechat/realtime",
        maxPayload: 8 * 1024
    });

    webSocketServer.on("connection", (socket) => {
        socket.isAlive = true;

        const authenticationTimer = setTimeout(() => {
            closeSocket(socket, 4001, "Délai d'authentification dépassé");
        }, AUTHENTICATION_TIMEOUT_MILLISECONDS);

        socket.on("pong", () => {
            socket.isAlive = true;
        });

        socket.on("message", (rawMessage) => {
            authenticateSocket(socket, rawMessage, authenticationTimer);
        });

        socket.on("close", () => {
            clearTimeout(authenticationTimer);
            removeConnection(socket);
        });

        socket.on("error", () => {
            // L'événement close nettoie ensuite la présence de l'utilisateur.
        });
    });

    const heartbeat = setInterval(() => {
        for (const socket of webSocketServer.clients) {
            if (!socket.isAlive) {
                socket.terminate();
                continue;
            }

            socket.isAlive = false;
            socket.ping();
        }
    }, HEARTBEAT_INTERVAL_MILLISECONDS);

    heartbeat.unref();
    return webSocketServer;
}

// ============================================================
// 2. Destinataires connectés et envoi des événements
// ============================================================

function getConnectedUserIds() {
    return [...connectionsByUserId.keys()];
}

function sendEventToUsers(userIds, event) {
    const serializedEvent = JSON.stringify(event);

    for (const userId of new Set(userIds)) {
        const userConnections = connectionsByUserId.get(userId);

        for (const socket of userConnections || []) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(serializedEvent);
            }
        }
    }
}

function sendEventToAllConnectedUsers(event) {
    sendEventToUsers(getConnectedUserIds(), event);
}

function disconnectUser(userId) {
    const userConnections = connectionsByUserId.get(userId);

    for (const socket of userConnections || []) {
        closeSocket(socket, 4003, "Compte désactivé");
    }
}

module.exports = {
    initializeRealtimeServer,
    getConnectedUserIds,
    sendEventToUsers,
    sendEventToAllConnectedUsers,
    disconnectUser
};
