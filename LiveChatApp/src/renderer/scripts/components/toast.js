(() => {
    "use strict";

    const ALLOWED_TYPES = new Set(["success", "info", "error"]);
    const DEFAULT_DURATION_MILLISECONDS = 4000;
    const ICONS = {
        success: "✓",
        info: "i",
        error: "!"
    };

    const container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.append(container);

    function show(message, requestedType = "info", duration = DEFAULT_DURATION_MILLISECONDS) {
        const type = ALLOWED_TYPES.has(requestedType) ? requestedType : "info";
        const toast = document.createElement("div");
        toast.className = `app-toast is-${type}`;
        toast.setAttribute("role", type === "error" ? "alert" : "status");

        const icon = document.createElement("span");
        icon.className = "toast-icon";
        icon.textContent = ICONS[type];
        icon.setAttribute("aria-hidden", "true");

        const text = document.createElement("p");
        text.textContent = message;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "toast-close";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", "Fermer la notification");

        let removalTimer = null;
        let closed = false;

        function close() {
            if (closed) {
                return;
            }

            closed = true;
            clearTimeout(removalTimer);
            toast.classList.remove("is-visible");
            toast.addEventListener("transitionend", () => toast.remove(), { once: true });
            setTimeout(() => toast.remove(), 250);
        }

        closeButton.addEventListener("click", close);
        toast.append(icon, text, closeButton);
        container.append(toast);

        requestAnimationFrame(() => toast.classList.add("is-visible"));
        removalTimer = setTimeout(close, Math.max(1500, Number(duration) || 0));

        return { close };
    }

    window.livechatToast = { show };
})();
