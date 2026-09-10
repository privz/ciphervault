"use strict";

(() => {
    const QUICK_SETTINGS_KEY = "ciphervault-quick-settings";
    const QUICK_THEME_KEY = "ciphervault-quick-theme";
    const THEME_KEY = "ciphervault-theme";

    const DEFAULT_SETTINGS = {
        actions: {
            copy: { key: "c", ctrl: false, shift: false, alt: false, meta: false },
            replace: { key: "r", ctrl: false, shift: false, alt: false, meta: false },
            profile: { key: "p", ctrl: false, shift: false, alt: false, meta: false },
            close: { key: "Escape", ctrl: false, shift: false, alt: false, meta: false }
        },
        smartTarget: {
            focusedEditor: true,
            hoveredGoogleChat: true
        }
    };

    const globalShortcut = document.getElementById("globalShortcut");
    const changeGlobalShortcut = document.getElementById("changeGlobalShortcut");
    const resetActionKeys = document.getElementById("resetActionKeys");
    const smartFocusedEditor = document.getElementById("smartFocusedEditor");
    const smartHoveredGoogleChat = document.getElementById("smartHoveredGoogleChat");
    const captureHint = document.getElementById("captureHint");
    const settingsError = document.getElementById("settingsError");
    const settingsThemeToggle = document.getElementById("settingsThemeToggle");
    const toast = document.getElementById("settingsToast");

    let settings = cloneDefaults();
    let listeningAction = null;
    let toastTimer = null;

    initialize();

    async function initialize() {
        applyStoredTheme();

        if (!canUseExtensionAPIs()) {
            showError("Quick Cipher settings are available from the installed browser extension.");
            document.querySelectorAll("button, input").forEach(element => { element.disabled = true; });
            return;
        }

        const stored = await chrome.storage.local.get(QUICK_SETTINGS_KEY);
        settings = normalizeSettings(stored[QUICK_SETTINGS_KEY]);
        renderSettings();
        await refreshGlobalShortcut();
        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll(".key-setting").forEach(button => {
            button.addEventListener("click", () => beginCapture(button.dataset.action));
        });

        document.addEventListener("keydown", handleCaptureKey, true);

        smartFocusedEditor.addEventListener("change", () => {
            settings.smartTarget.focusedEditor = smartFocusedEditor.checked;
            void persistSettings("Smart Target updated.");
        });

        smartHoveredGoogleChat.addEventListener("change", () => {
            settings.smartTarget.hoveredGoogleChat = smartHoveredGoogleChat.checked;
            void persistSettings("Smart Target updated.");
        });

        resetActionKeys.addEventListener("click", () => {
            settings.actions = cloneDefaults().actions;
            cancelCapture();
            renderSettings();
            void persistSettings("Action keys reset.");
        });

        changeGlobalShortcut.addEventListener("click", async () => {
            try {
                await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
                window.close();
            } catch {
                showError("Open chrome://extensions/shortcuts to change the global Quick Cipher shortcut.");
            }
        });

        settingsThemeToggle.addEventListener("click", () => {
            const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
            document.documentElement.dataset.theme = next;
            localStorage.setItem(THEME_KEY, next);
            void chrome.storage.local.set({ [QUICK_THEME_KEY]: next });
            updateThemeIcon();
        });

        window.addEventListener("focus", () => void refreshGlobalShortcut());
    }

    function beginCapture(action) {
        if (!settings.actions[action]) return;
        listeningAction = action;
        hideError();
        captureHint.hidden = false;

        document.querySelectorAll(".key-setting").forEach(button => {
            button.classList.toggle("listening", button.dataset.action === action);
        });

        const target = document.querySelector(`[data-binding="${action}"]`);
        if (target) target.textContent = "Press…";
    }

    function handleCaptureKey(event) {
        if (!listeningAction) return;

        event.preventDefault();
        event.stopPropagation();

        if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
            return;
        }

        const binding = eventToBinding(event);
        const duplicate = Object.entries(settings.actions).find(([name, value]) =>
            name !== listeningAction && sameBinding(value, binding)
        );

        if (duplicate) {
            showError(`That shortcut is already used by ${friendlyActionName(duplicate[0])}.`);
            renderSettings();
            cancelCapture(false);
            return;
        }

        settings.actions[listeningAction] = binding;
        const changedAction = listeningAction;
        cancelCapture(false);
        renderSettings();
        void persistSettings(`${friendlyActionName(changedAction)} shortcut saved.`);
    }

    function cancelCapture(hideHint = true) {
        listeningAction = null;
        if (hideHint) captureHint.hidden = true;
        document.querySelectorAll(".key-setting").forEach(button => button.classList.remove("listening"));
        if (!hideHint) window.setTimeout(() => { captureHint.hidden = true; }, 250);
    }

    function renderSettings() {
        Object.entries(settings.actions).forEach(([name, binding]) => {
            const element = document.querySelector(`[data-binding="${name}"]`);
            if (element) element.textContent = formatBinding(binding);
        });

        smartFocusedEditor.checked = settings.smartTarget.focusedEditor;
        smartHoveredGoogleChat.checked = settings.smartTarget.hoveredGoogleChat;

        document.getElementById("flowCopyKey").textContent = formatBinding(settings.actions.copy);
        document.getElementById("flowReplaceKey").textContent = formatBinding(settings.actions.replace);
        document.getElementById("flowProfileKey").textContent = formatBinding(settings.actions.profile);
    }

    async function refreshGlobalShortcut() {
        try {
            const commands = await chrome.commands.getAll();
            const command = commands.find(item => item.name === "quick-cipher");
            const shortcut = command?.shortcut || "Not assigned";
            globalShortcut.textContent = shortcut;
            document.getElementById("flowGlobalKey").textContent = shortcut;
        } catch {
            globalShortcut.textContent = "Unavailable";
        }
    }

    async function persistSettings(message) {
        hideError();
        await chrome.storage.local.set({ [QUICK_SETTINGS_KEY]: settings });
        showToast(message);
    }

    function eventToBinding(event) {
        let key = event.key;
        if (key.length === 1) key = key.toLowerCase();

        return {
            key,
            ctrl: Boolean(event.ctrlKey),
            shift: Boolean(event.shiftKey),
            alt: Boolean(event.altKey),
            meta: Boolean(event.metaKey)
        };
    }

    function sameBinding(left, right) {
        return left.key.toLowerCase() === right.key.toLowerCase() &&
            Boolean(left.ctrl) === Boolean(right.ctrl) &&
            Boolean(left.shift) === Boolean(right.shift) &&
            Boolean(left.alt) === Boolean(right.alt) &&
            Boolean(left.meta) === Boolean(right.meta);
    }

    function formatBinding(binding) {
        const parts = [];
        if (binding.ctrl) parts.push("Ctrl");
        if (binding.alt) parts.push("Alt");
        if (binding.shift) parts.push("Shift");
        if (binding.meta) parts.push("Cmd");

        let key = binding.key;
        if (key === "Escape") key = "Esc";
        else if (key === " ") key = "Space";
        else if (key.length === 1) key = key.toUpperCase();

        parts.push(key);
        return parts.join("+");
    }

    function normalizeSettings(value) {
        const source = value && typeof value === "object" ? value : {};
        const actions = source.actions && typeof source.actions === "object" ? source.actions : {};
        const smartTarget = source.smartTarget && typeof source.smartTarget === "object" ? source.smartTarget : {};

        return {
            actions: {
                copy: normalizeBinding(actions.copy, DEFAULT_SETTINGS.actions.copy),
                replace: normalizeBinding(actions.replace, DEFAULT_SETTINGS.actions.replace),
                profile: normalizeBinding(actions.profile, DEFAULT_SETTINGS.actions.profile),
                close: normalizeBinding(actions.close, DEFAULT_SETTINGS.actions.close)
            },
            smartTarget: {
                focusedEditor: smartTarget.focusedEditor !== false,
                hoveredGoogleChat: smartTarget.hoveredGoogleChat !== false
            }
        };
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

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function friendlyActionName(name) {
        return {
            copy: "Copy result",
            replace: "Replace target",
            profile: "Profile picker",
            close: "Close bubble"
        }[name] || name;
    }

    function applyStoredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        document.documentElement.dataset.theme = stored === "light" ? "light" : "dark";
        updateThemeIcon();
    }

    function updateThemeIcon() {
        settingsThemeToggle.textContent = document.documentElement.dataset.theme === "light" ? "☾" : "☀";
    }

    function canUseExtensionAPIs() {
        try {
            return Boolean(chrome?.runtime?.id && chrome?.storage?.local && chrome?.commands);
        } catch {
            return false;
        }
    }

    function showError(message) {
        settingsError.textContent = message;
        settingsError.hidden = false;
    }

    function hideError() {
        settingsError.hidden = true;
        settingsError.textContent = "";
    }

    function showToast(message) {
        toast.textContent = message;
        toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { toast.hidden = true; }, 1100);
    }
})();
