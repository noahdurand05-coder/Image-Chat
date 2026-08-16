// ============================================================
// Règles communes de fréquence des LiveChats
// ============================================================

const USER_COOLDOWN_MILLISECONDS = 20 * 1000;

function createUserCooldown() {
    const expirationByUser = new Map();

    function reserve(userId, currentTime = Date.now()) {
        const key = String(userId || "");
        const previousExpiration = expirationByUser.get(key) || 0;

        if (previousExpiration > currentTime) {
            return {
                accepted: false,
                retryAfterSeconds: Math.ceil(
                    (previousExpiration - currentTime) / 1000
                )
            };
        }

        const expiration = currentTime + USER_COOLDOWN_MILLISECONDS;
        expirationByUser.set(key, expiration);

        return {
            accepted: true,
            retryAfterSeconds: 0,

            // Utilisé si l'envoi échoue : l'utilisateur peut alors réessayer.
            release() {
                if (expirationByUser.get(key) === expiration) {
                    expirationByUser.delete(key);
                }
            }
        };
    }

    return { reserve };
}

module.exports = {
    USER_COOLDOWN_MILLISECONDS,
    createUserCooldown
};
