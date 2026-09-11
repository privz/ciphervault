"use strict";

// Load the validated core and UX layers first. The v1.2.2 stability guard below
// runs last so it wraps the final Quick Cipher runner/result delivery.
importScripts(
    "service-worker.js",
    "quick-ux-worker.js",
    "auto-profile-worker.js"
);

/* =========================================================
   CipherVault v1.2.2 — Quick Cipher stability layer
   ========================================================= */

const CV_STABILITY_COOLDOWN_MS = 420;
const cvRunStates = new Map();
const cvLastFinishedAt = new Map();
let cvRunSequence = 0;

const cvPreviousRunQuickCipher = runQuickCipher;
const cvPreviousShowBubble = showBubble;

showBubble = async function cvStableShowBubble(tabId, frameId, payload) {
    const state = cvRunStates.get(tabId);

    if (state?.cancelled) {
        return { ok: false, cancelled: true };
    }

    return cvPreviousShowBubble(tabId, frameId, payload);
};

runQuickCipher = async function cvStableRunQuickCipher(commandTab) {
    const tab = commandTab?.id ? commandTab : await getActiveTab();

    if (!tab?.id) {
        return;
    }

    const tabId = tab.id;
    const running = cvRunStates.get(tabId);

    // Ignore accidental double-triggering while the same operation is active.
    if (running?.promise) {
        return running.promise;
    }

    const now = Date.now();
    const lastFinished = cvLastFinishedAt.get(tabId) || 0;

    if (now - lastFinished < CV_STABILITY_COOLDOWN_MS) {
        return;
    }

    const state = {
        id: ++cvRunSequence,
        cancelled: false,
        startedAt: now,
        promise: null
    };

    const task = (async () => {
        try {
            await cvInjectStabilityLayer(tabId);

            if (state.cancelled) {
                return;
            }

            return await cvPreviousRunQuickCipher(tab);
        } finally {
            if (cvRunStates.get(tabId)?.id === state.id) {
                cvRunStates.delete(tabId);
                cvLastFinishedAt.set(tabId, Date.now());
            }
        }
    })();

    state.promise = task;
    cvRunStates.set(tabId, state);
    return task;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "CV_QUICK_DISMISS") {
        return;
    }

    const tabId = sender.tab?.id;

    if (Number.isInteger(tabId)) {
        const state = cvRunStates.get(tabId);
        if (state) {
            state.cancelled = true;
        }
        cvLastFinishedAt.set(tabId, Date.now());
    }

    sendResponse({ ok: true });
});

chrome.tabs?.onRemoved?.addListener(tabId => {
    cvRunStates.delete(tabId);
    cvLastFinishedAt.delete(tabId);
});

async function cvInjectStabilityLayer(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ["quick-stability.js"]
        });
    } catch (error) {
        // The validated Quick Cipher core handles protected-page errors.
        console.debug("CipherVault stability layer unavailable:", error?.message || error);
    }
}
