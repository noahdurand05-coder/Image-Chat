const WebSocket = require("ws");
const { API_BASE_URL } = require("../config/appConfig");

const RECONNECT_DELAY_MILLISECONDS = 3000;
const CONTROL_EVENT_TYPES = new Set([
    "livechat:next",
    "livechat:clear",
    "livechat:pause",
    "livechat:resume"
]);

function createRealtimeUrl() {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/$/, "")}/livechat/realtime`;
    url.search = "";
    url.hash = "";
    return url.toString();
}

function createRealtimeClient({
    getAccessToken,
    onConnected,
    onNewMessage,
    onStop,
    onControl,
    onConnectionStateChange = () => {}
}) {
    let socket = null;
    let reconnectTimer = null;
    let stopped = true;
    let connectionState = null;
    let wasAuthenticated = false;

    function updateConnectionState(state) {
        if (connectionState === state) {
            return;
        }

        connectionState = state;
        onConnectionStateChange(state);
    }

    function clearReconnectTimer() {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    function scheduleReconnect() {
        if (stopped || reconnectTimer) {
            return;
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, RECONNECT_DELAY_MILLISECONDS);
    }

    function handleEvent(rawData) {
        try {
            const event = JSON.parse(rawData.toString());

            if (event.type === "authenticated") {
                wasAuthenticated = true;
                updateConnectionState("online");
                onConnected();
            } else if (event.type === "livechat:new") {
                onNewMessage(event);
            } else if (event.type === "livechat:stop") {
                onStop(event);
            } else if (CONTROL_EVENT_TYPES.has(event.type)) {
                onControl(event);
            }
        } catch {
            // Un événement inconnu est ignoré sans interrompre la connexion.
        }
    }

    function connect() {
        if (stopped || socket) {
            return;
        }

        const accessToken = getAccessToken();

        if (!accessToken) {
            wasAuthenticated = false;
            updateConnectionState("login-required");
            scheduleReconnect();
            return;
        }

        if (connectionState !== "unavailable") {
            updateConnectionState(wasAuthenticated ? "reconnecting" : "connecting");
        }

        const currentSocket = new WebSocket(createRealtimeUrl());
        socket = currentSocket;

        currentSocket.on("open", () => {
            currentSocket.send(JSON.stringify({
                type: "authenticate",
                accessToken
            }));
        });

        currentSocket.on("message", handleEvent);

        currentSocket.on("close", () => {
            if (socket === currentSocket) {
                socket = null;
                updateConnectionState(
                    wasAuthenticated ? "reconnecting" : "unavailable"
                );
                scheduleReconnect();
            }
        });

        currentSocket.on("error", () => {
            // close déclenchera automatiquement la tentative de reconnexion.
        });
    }

    function closeCurrentSocket() {
        const currentSocket = socket;
        socket = null;

        if (currentSocket) {
            currentSocket.removeAllListeners();
            currentSocket.terminate();
        }
    }

    function start() {
        stopped = false;
        clearReconnectTimer();
        connect();
    }

    function refreshAuthentication() {
        clearReconnectTimer();
        closeCurrentSocket();

        if (!stopped) {
            connect();
        }
    }

    function stop() {
        stopped = true;
        clearReconnectTimer();
        closeCurrentSocket();
        updateConnectionState("stopped");
    }

    return { start, refreshAuthentication, stop };
}

module.exports = { createRealtimeClient };
