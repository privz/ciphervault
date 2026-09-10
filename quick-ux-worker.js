"use strict";

/* =========================================================
   CipherVault v1.2.0 — Quick Cipher UX / Smart Target layer
   ========================================================= */

const CV_QUICK_SETTINGS_KEY = "ciphervault-quick-settings";
const CV_TEMP_PROFILE_ID = "__temporary__";
const CV_SESSION_RUNTIME_SECRET_KEY = "ciphervault-session-runtime-secret";
const CV_SESSION_PROFILE_NAME_KEY = "ciphervault-session-profile-name";

const CV_DEFAULT_QUICK_SETTINGS = Object.freeze({
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
});

// service-worker.js registered the command listener already. That listener
// resolves the global runQuickCipher binding at invocation time, so replacing
// it here upgrades the behavior without touching the validated crypto core.
runQuickCipher = async function v120RunQuickCipher(commandTab) {
    const tab = commandTab?.id ? commandTab : await getActiveTab();

    if (!tab?.id) {
        return;
    }

    const settings = await cvGetQuickSettings();
    const theme = await getQuickTheme();

    try {
        const injections = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ["quick-cipher-v120.js"]
        });

        const frameIds = [...new Set(
            (injections || [])
                .map(item => item.frameId)
                .filter(frameId => Number.isInteger(frameId))
        )];

        if (!frameIds.includes(0)) {
            frameIds.unshift(0);
        }

        const captures = [];

        for (const frameId of frameIds) {
            try {
                const capture = await chrome.tabs.sendMessage(
                    tab.id,
                    { type: "CV_QUICK_CAPTURE", settings },
                    { frameId }
                );

                if (capture) {
                    captures.push({ frameId, ...capture });
                }
            } catch {
                // Ignore inaccessible embedded frames and continue.
            }
        }

        const successful = captures.filter(item => item.ok && item.text?.trim());
        const capture =
            successful.find(item => item.captureKind === "selection" && item.frameFocused) ||
            successful.find(item => item.captureKind === "selection") ||
            successful.find(item => item.captureKind === "hovered-message" && item.strongIntent) ||
            successful.find(item => item.captureKind === "focused-field" && item.frameFocused) ||
            successful.find(item => item.captureKind === "focused-field") ||
            successful.find(item => item.captureKind === "hovered-message" && item.frameFocused) ||
            successful.find(item => item.captureKind === "hovered-message") ||
            null;

        const frameId = capture?.frameId ?? 0;

        if (!capture) {
            await showBubble(tab.id, 0, {
                status: "error",
                label: "NO TARGET",
                message: "Select text, focus a text editor, or point to a Google Chat message.",
                profileName: "",
                replaceable: false,
                allowProfilePicker: true,
                settings,
                theme
            });
            return;
        }

        const credential = await getQuickCredential();

        if (!credential.secret) {
            await showBubble(tab.id, frameId, {
                status: "error",
                label: "PROFILE REQUIRED",
                message: "Choose a Profile or enter a Temporary Session key, then try again.",
                profileName: "",
                replaceable: false,
                allowProfilePicker: true,
                settings,
                theme
            });
            return;
        }

        const operation = detectSmartOperation(capture.text);
        const result = operation === "decrypt"
            ? await decryptSelectedText(capture.text, credential.secret)
            : await encryptMessage(capture.text, credential.secret);

        await showBubble(tab.id, frameId, {
            status: "success",
            label: operation === "decrypt" ? "DECRYPTED" : "ENCRYPTED",
            operation,
            result,
            profileName: credential.profileName,
            replaceable: Boolean(capture.replaceable),
            captureKind: capture.captureKind,
            allowProfilePicker: true,
            settings,
            theme
        });
    } catch (error) {
        console.warn("CipherVault v1.2 Quick Cipher failed:", error);

        try {
            await showBubble(tab.id, 0, {
                status: "error",
                label: "CIPHERVAULT",
                message: friendlyError(error),
                profileName: "",
                replaceable: false,
                allowProfilePicker: false,
                settings,
                theme
            });
        } catch {
            // Protected browser pages can reject both injection and messaging.
        }
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "CV_QUICK_GET_PROFILES") {
        void cvGetQuickProfileOptions()
            .then(profiles => sendResponse({ ok: true, profiles }))
            .catch(error => sendResponse({ ok: false, message: friendlyError(error) }));
        return true;
    }

    if (message?.type === "CV_QUICK_REPROCESS_PROFILE") {
        void cvReprocessWithProfile(message.profileId, message.text)
            .then(result => sendResponse({ ok: true, ...result }))
            .catch(error => sendResponse({ ok: false, message: friendlyError(error) }));
        return true;
    }
});

async function cvGetQuickSettings() {
    const stored = await chrome.storage.local.get(CV_QUICK_SETTINGS_KEY);
    return cvNormalizeQuickSettings(stored[CV_QUICK_SETTINGS_KEY]);
}

function cvNormalizeQuickSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const actions = source.actions && typeof source.actions === "object" ? source.actions : {};
    const target = source.smartTarget && typeof source.smartTarget === "object" ? source.smartTarget : {};

    return {
        actions: {
            copy: cvNormalizeBinding(actions.copy, CV_DEFAULT_QUICK_SETTINGS.actions.copy),
            replace: cvNormalizeBinding(actions.replace, CV_DEFAULT_QUICK_SETTINGS.actions.replace),
            profile: cvNormalizeBinding(actions.profile, CV_DEFAULT_QUICK_SETTINGS.actions.profile),
            close: cvNormalizeBinding(actions.close, CV_DEFAULT_QUICK_SETTINGS.actions.close)
        },
        smartTarget: {
            focusedEditor: target.focusedEditor !== false,
            hoveredGoogleChat: target.hoveredGoogleChat !== false
        }
    };
}

function cvNormalizeBinding(value, fallback) {
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

async function cvGetQuickProfileOptions() {
    await purgeExpiredTemporarySession();

    const profiles = await loadProfiles();
    const options = profiles
        .map(profile => ({ id: profile.id, name: profile.name }))
        .sort((left, right) => left.name.localeCompare(right.name));

    const session = await chrome.storage.session.get([
        CV_SESSION_RUNTIME_SECRET_KEY,
        CV_SESSION_PROFILE_NAME_KEY
    ]);

    if (session[CV_SESSION_RUNTIME_SECRET_KEY]) {
        options.unshift({
            id: CV_TEMP_PROFILE_ID,
            name: session[CV_SESSION_PROFILE_NAME_KEY] || "Temporary Session",
            temporary: true
        });
    }

    return options;
}

async function cvReprocessWithProfile(profileId, text) {
    const input = String(text || "");

    if (!input.trim()) {
        throw new Error("No text is available to process.");
    }

    let secret = "";
    let profileName = "";

    if (profileId === CV_TEMP_PROFILE_ID) {
        await purgeExpiredTemporarySession();
        const session = await chrome.storage.session.get([
            CV_SESSION_RUNTIME_SECRET_KEY,
            CV_SESSION_PROFILE_NAME_KEY
        ]);
        secret = session[CV_SESSION_RUNTIME_SECRET_KEY] || "";
        profileName = `${session[CV_SESSION_PROFILE_NAME_KEY] || "Temporary Session"} · TEMP`;
    } else {
        const profiles = await loadProfiles();
        const profile = profiles.find(item => item.id === profileId);

        if (!profile) {
            throw new Error("Profile not found.");
        }

        secret = profile.secretKey;
        profileName = `${profile.name} · MANUAL`;
    }

    if (!secret) {
        throw new Error("The selected Profile does not have an available secret key.");
    }

    const operation = detectSmartOperation(input);
    const result = operation === "decrypt"
        ? await decryptSelectedText(input, secret)
        : await encryptMessage(input, secret);

    return {
        operation,
        label: operation === "decrypt" ? "DECRYPTED" : "ENCRYPTED",
        result,
        profileName,
        profileId,
        profileSource: profileId === CV_TEMP_PROFILE_ID ? "temp" : "manual"
    };
}
