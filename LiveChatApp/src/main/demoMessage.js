// Médias intégrés à l'application pour tester l'overlay sans Discord ni API.
const TEST_MEDIA = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
        <defs>
            <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#8b5cf6"/>
                <stop offset="1" stop-color="#312e81"/>
            </linearGradient>
        </defs>
        <rect width="960" height="540" rx="28" fill="url(#background)"/>
        <circle cx="480" cy="218" r="76" fill="#ffffff" fill-opacity="0.13"/>
        <text x="480" y="240" fill="#ffffff" font-family="Arial, sans-serif"
            font-size="58" font-weight="700" text-anchor="middle">LC</text>
        <text x="480" y="345" fill="#ffffff" font-family="Arial, sans-serif"
            font-size="42" font-weight="700" text-anchor="middle">APERÇU OVERLAY</text>
        <text x="480" y="395" fill="#ddd6fe" font-family="Arial, sans-serif"
            font-size="24" text-anchor="middle">Position et taille actuellement sélectionnées</text>
    </svg>
`;

const TEST_AVATAR = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <rect width="128" height="128" rx="64" fill="#8b5cf6"/>
        <text x="64" y="82" fill="#ffffff" font-family="Arial, sans-serif"
            font-size="56" font-weight="700" text-anchor="middle">T</text>
    </svg>
`;

function svgToDataUrl(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createDemoMessage() {
    return {
        media: svgToDataUrl(TEST_MEDIA),
        userProfilePicture: svgToDataUrl(TEST_AVATAR),
        username: "Aperçu LiveChat",
        texte: "Voici un exemple affiché sans Discord ni base de données.",
        isPreview: true
    };
}

module.exports = { createDemoMessage };
