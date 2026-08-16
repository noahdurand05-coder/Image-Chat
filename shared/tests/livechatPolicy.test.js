const assert = require("node:assert/strict");
const {
    USER_COOLDOWN_MILLISECONDS,
    createUserCooldown
} = require("../livechatPolicy");

const cooldown = createUserCooldown();
const startTime = 1_000_000;

const firstAttempt = cooldown.reserve("discord-user-1", startTime);
assert.equal(firstAttempt.accepted, true);

const immediateAttempt = cooldown.reserve("discord-user-1", startTime + 1);
assert.equal(immediateAttempt.accepted, false);
assert.equal(immediateAttempt.retryAfterSeconds, 20);

const otherUserAttempt = cooldown.reserve("discord-user-2", startTime + 1);
assert.equal(otherUserAttempt.accepted, true);

const attemptAfterCooldown = cooldown.reserve(
    "discord-user-1",
    startTime + USER_COOLDOWN_MILLISECONDS
);
assert.equal(attemptAfterCooldown.accepted, true);

attemptAfterCooldown.release();
const attemptAfterFailure = cooldown.reserve(
    "discord-user-1",
    startTime + USER_COOLDOWN_MILLISECONDS + 1
);
assert.equal(attemptAfterFailure.accepted, true);

console.log("Tests de la protection anti-spam réussis.");
