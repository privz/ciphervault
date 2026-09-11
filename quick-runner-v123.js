"use strict";

/* CipherVault v1.2.3 — safer Smart Target runner. */

const CV_V123_COOLDOWN_MS = 420;
const cvV123Runs = new Map();
const cvV123LastFinished = new Map();
let cvV123Sequence = 0;

runQuickCipher = async function cvV123RunQuickCipher(commandTab) {
    const tab = commandTab?.id ? commandTab : await getActiveTab();
    if (!tab?.id) return;

    const tabId = tab.id;
    const running = cvV123Runs.get(tabId);
    if (running?.promise) return running.promise;

    const now = Date.now();
    if (now - (cvV123LastFinished.get(tabId) || 0) < CV_V123_COOLDOWN_MS) return;

    const state = {
        id: ++cvV123Sequence,
        cancelled: false,
        promise: null
    };

    const task = (async () => {
        const settings = await cvGetQuickSettings();
        const theme = await getQuickTheme();

        try {
            const injections = await chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                files: ["quick-cipher-v120.js", "quick-stability.js", "quick-hover-v123.js"]
            });

            if (state.cancelled) return;

            const frameIds = [...new Set((injections || [])
                .map(item => item.frameId)
                .filter(Number.isInteger))];
            if (!frameIds.includes(0)) frameIds.unshift(0);

            const normalSettings = {
                ...settings,
                smartTarget: {
                    ...settings.smartTarget,
                    hoveredGoogleChat: false
                }
            };

            const normalCaptures = [];
            const hoverCaptures = [];

            for (const frameId of frameIds) {
                try {
                    const capture = await chrome.tabs.sendMessage(
                        tabId,
                        { type: "CV_QUICK_CAPTURE", settings: normalSettings },
                        { frameId }
                    );
                    if (capture) normalCaptures.push({ frameId, ...capture });
                } catch {}

                if (settings.smartTarget.hoveredGoogleChat) {
                    try {
                        const hover = await chrome.tabs.sendMessage(
                            tabId,
                            { type: "CV_V123_HOVER_CAPTURE" },
                            { frameId }
                        );
                        if (hover) hoverCaptures.push({ frameId, ...hover });
                    } catch {}
                }
            }

            if (state.cancelled) return;

            const normal = normalCaptures.filter(item => item.ok && item.text?.trim());
            const hovered = hoverCaptures.filter(item => item.ok && item.text?.trim());

            const capture =
                normal.find(item => item.captureKind === "selection" && item.frameFocused) ||
                normal.find(item => item.captureKind === "selection") ||
                hovered.find(item => item.strongIntent && item.frameFocused) ||
                hovered.find(item => item.strongIntent) ||
                normal.find(item => item.captureKind === "focused-field" && item.frameFocused) ||
                normal.find(item => item.captureKind === "focused-field") ||
                hovered.find(item => item.frameFocused) ||
                hovered[0] ||
                null;

            if (!capture) {
                return cvV123Show(state, tabId, 0, {
                    status: "error",
                    label: "NO TARGET",
                    message: "Select text, focus a text editor, or point to one Google Chat message.",
                    profileName: "",
                    replaceable: false,
                    allowProfilePicker: true,
                    settings,
                    theme
                });
            }

            const frameId = capture.frameId ?? 0;
            const credential = await cvV123Credential(tab);

            if (!credential.secret) {
                return cvV123Show(state, tabId, frameId, {
                    status: "error",
                    label: "PROFILE REQUIRED",
                    message: "Choose a Profile or enter a Temporary Session key, then try again.",
                    profileName: "",
                    replaceable: false,
                    allowProfilePicker: true,
                    settings,
                    theme
                });
            }

            const operation = detectSmartOperation(capture.text);
            const result = operation === "decrypt"
                ? await decryptSelectedText(capture.text, credential.secret)
                : await encryptMessage(capture.text, credential.secret);

            return cvV123Show(state, tabId, frameId, {
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
            if (state.cancelled) return;
            console.warn("CipherVault v1.2.3 Quick Cipher failed:", error);
            try {
                return await cvV123Show(state, tabId, 0, {
                    status: "error",
                    label: "CIPHERVAULT",
                    message: friendlyError(error),
                    profileName: "",
                    replaceable: false,
                    allowProfilePicker: false,
                    settings,
                    theme
                });
            } catch {}
        } finally {
            if (cvV123Runs.get(tabId)?.id === state.id) {
                cvV123Runs.delete(tabId);
                cvV123LastFinished.set(tabId, Date.now());
            }
        }
    })();

    state.promise = task;
    cvV123Runs.set(tabId, state);
    return task;
};

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== "CV_QUICK_DISMISS") return;
    const tabId = sender.tab?.id;
    if (!Number.isInteger(tabId)) return;
    const state = cvV123Runs.get(tabId);
    if (state) state.cancelled = true;
    cvV123LastFinished.set(tabId, Date.now());
});

async function cvV123Show(state, tabId, frameId, payload) {
    if (state.cancelled || cvV123Runs.get(tabId)?.id !== state.id) {
        return { ok: false, cancelled: true };
    }
    return showBubble(tabId, frameId, payload);
}

async function cvV123Credential(tab) {
    let url = tab?.url || "";
    if (!url && tab?.id && chrome.tabs?.get) {
        try { url = (await chrome.tabs.get(tab.id))?.url || ""; }
        catch { url = ""; }
    }

    const conversationId = typeof cvNormalizeGoogleChatConversationId === "function"
        ? cvNormalizeGoogleChatConversationId(url)
        : "";

    if (conversationId) {
        try {
            const profiles = await loadProfiles();
            const mapped = profiles.find(profile => profile.googleChatId === conversationId);
            if (mapped) {
                return {
                    secret: mapped.secretKey,
                    profileName: `${mapped.name} · AUTO`
                };
            }
        } catch {}
    }

    return getQuickCredential();
}
