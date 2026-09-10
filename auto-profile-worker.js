"use strict";

/*
 * CipherVault v1.1.2 — Google Chat automatic Profile resolver.
 *
 * The v1.1.1 worker remains the implementation for selection capture,
 * encryption/decryption and the Quick Cipher bubble. This layer only
 * changes credential resolution when the current tab is a mapped
 * chat.google.com conversation.
 */

const __cvOriginalRunQuickCipher = runQuickCipher;
const __cvOriginalGetQuickCredential = getQuickCredential;
let __cvQuickCipherTabUrl = "";

runQuickCipher = async function patchedRunQuickCipher(tab) {
    __cvQuickCipherTabUrl = tab?.url || "";

    if (!__cvQuickCipherTabUrl && tab?.id && chrome.tabs?.get) {
        try {
            __cvQuickCipherTabUrl = (await chrome.tabs.get(tab.id))?.url || "";
        } catch {
            __cvQuickCipherTabUrl = "";
        }
    }

    try {
        return await __cvOriginalRunQuickCipher(tab);
    } finally {
        __cvQuickCipherTabUrl = "";
    }
};

getQuickCredential = async function patchedGetQuickCredential() {
    const conversationId = cvNormalizeGoogleChatConversationId(__cvQuickCipherTabUrl);

    if (conversationId) {
        const savedProfiles = await loadProfiles();
        const mappedProfile = savedProfiles.find(
            profile => profile.googleChatId === conversationId
        );

        if (mappedProfile) {
            return {
                secret: mappedProfile.secretKey,
                profileName: `${mappedProfile.name} · AUTO`
            };
        }
    }

    return __cvOriginalGetQuickCredential();
};

function cvNormalizeGoogleChatConversationId(value) {
    const raw = String(value || "").trim();

    if (!raw) {
        return "";
    }

    if (/^[A-Za-z0-9_-]{3,160}$/.test(raw)) {
        return raw;
    }

    let parsed;

    try {
        parsed = new URL(raw);
    } catch {
        return "";
    }

    if (parsed.hostname.toLowerCase() !== "chat.google.com") {
        return "";
    }

    const match = parsed.pathname.match(/\/(?:u\/\d+\/)?app\/chat\/([^/?#]+)/i);

    if (!match?.[1]) {
        return "";
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}
