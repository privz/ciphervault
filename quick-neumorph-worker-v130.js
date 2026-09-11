"use strict";

/* CipherVault v1.3.0 — install the pure-neumorphism Quick Cipher skin before the validated runner executes. */
const cvV130PreviousRunQuickCipher = runQuickCipher;

runQuickCipher = async function cvV130RunQuickCipher(commandTab) {
    const tab = commandTab?.id ? commandTab : await getActiveTab();

    if (tab?.id) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                files: ["quick-neumorph-v130.js"]
            });
        } catch {
            // Protected pages are handled by the existing Quick Cipher error flow.
        }
    }

    return cvV130PreviousRunQuickCipher(tab);
};
