"use strict";

(() => {
    const previous = globalThis.__cipherVaultStabilityV122;
    if (previous?.arm) {
        previous.arm();
        return;
    }

    const SETTINGS_KEY = "ciphervault-quick-settings";
    const DEFAULT_CLOSE = { key: "Escape", ctrl: false, shift: false, alt: false, meta: false };
    const DEFAULT_REPLACE = { key: "r", ctrl: false, shift: false, alt: false, meta: false };
    const REPLACE_GUARD_MS = 900;

    let closeBinding = { ...DEFAULT_CLOSE };
    let replaceBinding = { ...DEFAULT_REPLACE };
    let lastReplaceAt = -Infinity;
    let armedUntil = 0;

    const enhancedHosts = new WeakSet();

    const api = {
        arm() {
            armedUntil = Date.now() + 3000;
            void refreshSettings();
            enhanceExistingHosts();
        }
    };

    globalThis.__cipherVaultStabilityV122 = api;
    api.arm();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("click", handleClick, true);

    chrome.storage?.onChanged?.addListener((changes, area) => {
        if (area === "local" && changes[SETTINGS_KEY]) {
            applySettings(changes[SETTINGS_KEY].newValue);
        }
    });

    const documentObserver = new MutationObserver(() => enhanceExistingHosts());
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });

    function handleKeydown(event) {
        if (!event.isTrusted || event.isComposing) return;

        const hosts = getHosts();
        const hasBubble = hosts.length > 0;

        if (matches(event, closeBinding)) {
            if (hasBubble) {
                event.preventDefault();
                dismissImmediately();
            } else if (Date.now() < armedUntil) {
                // Cancel a Quick Cipher run that is still deriving/encrypting before
                // its result bubble exists. Do not consume Escape from the page.
                notifyDismiss();
            }
            return;
        }

        if (!hasBubble || !matches(event, replaceBinding)) {
            return;
        }

        const now = performance.now();

        if (event.repeat || now - lastReplaceAt < REPLACE_GUARD_MS) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        // Mark before the original Quick Cipher handler runs so a second R keydown
        // cannot execute the same captured replacement twice.
        lastReplaceAt = now;
    }

    function handleClick(event) {
        const replaceButton = event.composedPath?.().find(node =>
            node instanceof Element && node.dataset?.action === "replace"
        );

        if (!replaceButton) return;

        const now = performance.now();

        if (now - lastReplaceAt < REPLACE_GUARD_MS) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        lastReplaceAt = now;
    }

    function dismissImmediately() {
        const hosts = getHosts();

        // Hide synchronously so Escape feels instant. Let the original Quick Cipher
        // listener receive the same key event and clean its internal handler/state.
        hosts.forEach(host => {
            host.style.transition = "none";
            host.style.opacity = "0";
            host.style.visibility = "hidden";
            host.style.pointerEvents = "none";
        });

        notifyDismiss();

        // If the Profile picker was open, the legacy handler uses the first Escape
        // only to close the picker. Synthetic cleanup events then let it run its own
        // removeBubble() path, avoiding leaked document key handlers.
        window.setTimeout(() => {
            try {
                document.dispatchEvent(new KeyboardEvent("keydown", {
                    key: "Escape", bubbles: true, composed: true
                }));

                document.dispatchEvent(new KeyboardEvent("keydown", {
                    key: closeBinding.key,
                    ctrlKey: Boolean(closeBinding.ctrl),
                    shiftKey: Boolean(closeBinding.shift),
                    altKey: Boolean(closeBinding.alt),
                    metaKey: Boolean(closeBinding.meta),
                    bubbles: true,
                    composed: true
                }));
            } catch {}

            hosts.forEach(host => host.remove());
        }, 0);
    }

    function notifyDismiss() {
        try {
            const pending = chrome.runtime.sendMessage({ type: "CV_QUICK_DISMISS" });
            pending?.catch?.(() => {});
        } catch {}
    }

    function enhanceExistingHosts() {
        getHosts().forEach(enhanceHost);
    }

    function enhanceHost(host) {
        if (enhancedHosts.has(host)) return;
        enhancedHosts.add(host);

        host.style.opacity = "0";
        host.style.transform = "translateY(-3px) scale(.992)";
        host.style.transformOrigin = "top left";
        host.style.transition = "opacity 90ms ease-out, transform 90ms ease-out";

        requestAnimationFrame(() => {
            if (!host.isConnected) return;
            host.style.opacity = "1";
            host.style.transform = "translateY(0) scale(1)";
        });

        const shadow = host.shadowRoot;
        if (!shadow) return;

        let closing = false;
        const feedbackObserver = new MutationObserver(() => {
            if (closing || !host.isConnected) return;
            const text = shadow.textContent || "";

            if (!text.includes("✓ COPIED") && !text.includes("✓ REPLACED")) {
                return;
            }

            closing = true;
            window.setTimeout(() => {
                if (!host.isConnected) return;
                host.style.opacity = "0";
                host.style.transform = "translateY(-2px) scale(.995)";
                window.setTimeout(() => host.remove(), 75);
            }, 90);
        });

        feedbackObserver.observe(shadow, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    function getHosts() {
        return Array.from(document.querySelectorAll("[data-ciphervault-quick]"));
    }

    async function refreshSettings() {
        try {
            const stored = await chrome.storage.local.get(SETTINGS_KEY);
            applySettings(stored[SETTINGS_KEY]);
        } catch {
            closeBinding = { ...DEFAULT_CLOSE };
            replaceBinding = { ...DEFAULT_REPLACE };
        }
    }

    function applySettings(value) {
        const actions = value?.actions && typeof value.actions === "object" ? value.actions : {};
        closeBinding = normalizeBinding(actions.close, DEFAULT_CLOSE);
        replaceBinding = normalizeBinding(actions.replace, DEFAULT_REPLACE);
    }

    function normalizeBinding(value, fallback) {
        if (!value || typeof value !== "object" || typeof value.key !== "string" || !value.key.trim()) {
            return { ...fallback };
        }

        return {
            key: value.key.length === 1 ? value.key.toLowerCase() : value.key,
            ctrl: Boolean(value.ctrl),
            shift: Boolean(value.shift),
            alt: Boolean(value.alt),
            meta: Boolean(value.meta)
        };
    }

    function matches(event, binding) {
        const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const bindingKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;

        return eventKey === bindingKey &&
            Boolean(event.ctrlKey) === Boolean(binding.ctrl) &&
            Boolean(event.shiftKey) === Boolean(binding.shift) &&
            Boolean(event.altKey) === Boolean(binding.alt) &&
            Boolean(event.metaKey) === Boolean(binding.meta);
    }
})();
