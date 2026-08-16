const assert = require("node:assert/strict");

const originalFetch = global.fetch;
process.env.LIVECHAT_API_URL = "https://livechat.test/api/livechat";
process.env.LIVECHAT_BOT_API_KEY = "test-secret";

let requestedUrl = null;
let requestedOptions = null;
let authorizationResult = true;

global.fetch = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;

    return {
        ok: true,
        async json() {
            return { authorized: authorizationResult };
        }
    };
};

const { isLivechatUserAuthorized } = require("../services/livechatApi");

async function runTests() {
    try {
        assert.equal(
            await isLivechatUserAuthorized("123456789012345678"),
            true
        );
        assert.equal(
            requestedUrl,
            "https://livechat.test/api/livechat/access/123456789012345678"
        );
        assert.equal(
            requestedOptions.headers["X-Bot-Api-Key"],
            "test-secret"
        );

        authorizationResult = false;
        assert.equal(
            await isLivechatUserAuthorized("999999999999999999"),
            false
        );

        console.log("✅ Vérification d'accès LiveChat validée");
    } finally {
        global.fetch = originalFetch;
    }
}

runTests().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
