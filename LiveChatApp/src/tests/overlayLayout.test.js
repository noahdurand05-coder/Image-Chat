const path = require("node:path");
const { app, BrowserWindow } = require("electron/main");

const EXPECTED_SCREEN_GAP = 32;
const ALLOWED_DIFFERENCE = 1;

function isExpectedGap(value) {
    return Math.abs(value - EXPECTED_SCREEN_GAP) <= ALLOWED_DIFFERENCE;
}

async function measureOverlayPositions(window) {
    const testImage = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
            <rect width="960" height="540" fill="#7048d8"/>
        </svg>
    `)}`;

    return window.webContents.executeJavaScript(`
        (async () => {
            const root = document.getElementById("overlay-root");
            const content = document.getElementById("livechat-content");
            const image = document.getElementById("livechat-image");
            const video = document.getElementById("livechat-video");
            const results = {};

            content.hidden = false;
            content.className = "livechat-content is-visible";
            image.hidden = false;
            image.src = ${JSON.stringify(testImage)};
            video.hidden = true;
            await image.decode();

            // Reproduit le calcul effectué par overlayDisplay.js après
            // le chargement réel d'une image ou d'une vidéo.
            content.style.width = Math.ceil(
                image.getBoundingClientRect().width
            ) + "px";

            for (const position of [
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right"
            ]) {
                root.className = "overlay-root position-" + position + " size-medium";

                await new Promise((resolve) => {
                    requestAnimationFrame(() => requestAnimationFrame(resolve));
                });

                const imageRectangle = image.getBoundingClientRect();
                results[position] = {
                    left: imageRectangle.left,
                    right: window.innerWidth - imageRectangle.right
                };
            }

            return results;
        })();
    `);
}

app.whenReady().then(async () => {
    const testWindow = new BrowserWindow({
        width: 535,
        height: 504,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    try {
        await testWindow.loadFile(
            path.join(__dirname, "../renderer/pages/overlay.html")
        );

        const positions = await measureOverlayPositions(testWindow);
        const valid = isExpectedGap(positions["top-left"].left)
            && isExpectedGap(positions["bottom-left"].left)
            && isExpectedGap(positions["top-right"].right)
            && isExpectedGap(positions["bottom-right"].right);

        if (!valid) {
            throw new Error(`Marges incorrectes : ${JSON.stringify(positions)}`);
        }

        console.log("Marges de l'overlay validées :", positions);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        testWindow.destroy();
        app.quit();
    }
});
