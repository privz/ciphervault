"use strict";

/* =========================================================
   CipherVault Quick Cipher — Manifest V3 service worker
   ========================================================= */

const VERSION = 1;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const GCM_TAG_LENGTH = 128;
const PBKDF2_ITERATIONS = 300000;

const DB_NAME = "ciphervault";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const DATA_STORE = "data";
const WRAP_KEY_ID = "profile-wrap-key";
const PROFILES_BLOB_ID = "profiles-v1";

const SESSION_WORKSPACE_KEY = "ciphervault-session-workspace";
const SESSION_META_KEY = "ciphervault-session-meta";
const SESSION_RUNTIME_SECRET_KEY = "ciphervault-session-runtime-secret";
const SESSION_PROFILE_NAME_KEY = "ciphervault-session-profile-name";
const QUICK_ACTIVE_PROFILE_KEY = "ciphervault-quick-active-profile";
const QUICK_THEME_KEY = "ciphervault-quick-theme";

const ADMIN_KEY_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

const DECOY_MESSAGES = [
    "Cheguei agora. Te aviso quando estiver saindo.",
    "Fechado, amanhã depois do almoço funciona para mim.",
    "Beleza, confirmo de manhã quando eu tiver certeza do horário.",
    "Pode deixar, já vi aqui e está tudo certo.",
    "Vou terminar isso primeiro e depois te mando uma mensagem.",
    "Tranquilo, não precisa correr. A gente resolve depois.",
    "Acho melhor deixar para amanhã, hoje ficou meio apertado.",
    "Consegui ajustar. Quando puder, dá uma olhada para mim.",
    "Estou indo almoçar agora. Depois volto e continuo.",
    "Sim, esse horário funciona. Se mudar alguma coisa eu aviso.",
    "Acabei de chegar em casa, hoje foi corrido demais.",
    "Vi sua mensagem agora. Amanhã conversamos com mais calma.",
    "Pode ser naquele lugar de sempre, para mim é mais fácil.",
    "Perfeito. Vou anotar aqui para não esquecer.",
    "Terminei aquela parte que faltava. O resto fica para depois.",
    "Sem problema, eu também estava ocupado nessa hora.",
    "Vou conferir isso quando chegar e te respondo.",
    "A princípio está certo. Só quero confirmar mais uma coisa.",
    "Boa, então ficou combinado desse jeito.",
    "Valeu por avisar. Eu já estava me organizando por aqui."
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

chrome.commands.onCommand.addListener((command, commandTab) => {
    if (command !== "quick-cipher") {
        return;
    }

    void runQuickCipher(commandTab);
});

async function runQuickCipher(commandTab) {
    const tab = commandTab?.id
        ? commandTab
        : await getActiveTab();

    if (!tab?.id) {
        return;
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["quick-cipher.js"]
        });

        const capture = await chrome.tabs.sendMessage(tab.id, {
            type: "CV_QUICK_CAPTURE"
        });

        if (!capture?.ok || !capture.text?.trim()) {
            await showBubble(tab.id, {
                status: "error",
                label: "SELECT TEXT",
                message: capture?.message || "Select some text first.",
                profileName: "",
                replaceable: false,
                theme: await getQuickTheme()
            });
            return;
        }

        const credential = await getQuickCredential();

        if (!credential.secret) {
            await showBubble(tab.id, {
                status: "error",
                label: "PROFILE REQUIRED",
                message: "Open CipherVault once and choose a Profile or enter a Temporary Session key.",
                profileName: "",
                replaceable: false,
                theme: await getQuickTheme()
            });
            return;
        }

        const operation = detectSmartOperation(capture.text);
        let result;

        if (operation === "decrypt") {
            result = await decryptSelectedText(capture.text, credential.secret);
        } else {
            result = await encryptMessage(capture.text, credential.secret);
        }

        await showBubble(tab.id, {
            status: "success",
            label: operation === "decrypt" ? "DECRYPTED" : "ENCRYPTED",
            operation,
            result,
            profileName: credential.profileName,
            replaceable: Boolean(capture.replaceable),
            theme: await getQuickTheme()
        });
    } catch (error) {
        console.warn("CipherVault Quick Cipher failed:", error);

        try {
            await showBubble(tab.id, {
                status: "error",
                label: "CIPHERVAULT",
                message: friendlyError(error),
                profileName: "",
                replaceable: false,
                theme: await getQuickTheme()
            });
        } catch {
            // Browser-controlled pages may reject both injection and messaging.
        }
    }
}

async function getActiveTab() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    return tabs[0] || null;
}

async function showBubble(tabId, payload) {
    return chrome.tabs.sendMessage(tabId, {
        type: "CV_QUICK_SHOW_RESULT",
        payload
    });
}

function friendlyError(error) {
    const message = error?.message || "Quick Cipher could not run on this page.";

    if (
        /Cannot access|extensions gallery|Missing host permission|Cannot access contents of url|The page cannot be scripted/i.test(message)
    ) {
        return "CipherVault cannot access this protected browser page.";
    }

    return message;
}

function detectSmartOperation(text) {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length && lines.every(looksLikeCipherVaultPayload)) {
        return "decrypt";
    }

    return "encrypt";
}

function looksLikeCipherVaultPayload(value) {
    try {
        const bytes = base64ToBytes(value);
        const minimumLength = 1 + SALT_LENGTH + IV_LENGTH + 16;
        return bytes.length >= minimumLength && bytes[0] === VERSION;
    } catch {
        return false;
    }
}

/* =========================================================
   Active Profile / Temporary Session
   ========================================================= */

async function getQuickCredential() {
    await purgeExpiredTemporarySession();

    const session = await chrome.storage.session.get([
        SESSION_RUNTIME_SECRET_KEY,
        SESSION_PROFILE_NAME_KEY
    ]);

    const runtimeSecret = session[SESSION_RUNTIME_SECRET_KEY];

    if (runtimeSecret) {
        return {
            secret: runtimeSecret,
            profileName: session[SESSION_PROFILE_NAME_KEY] || "Temporary Session"
        };
    }

    const local = await chrome.storage.local.get(QUICK_ACTIVE_PROFILE_KEY);
    const activeProfileId = local[QUICK_ACTIVE_PROFILE_KEY];

    if (!activeProfileId) {
        return { secret: "", profileName: "" };
    }

    const profiles = await loadProfiles();
    const profile = profiles.find(item => item.id === activeProfileId);

    if (!profile) {
        await chrome.storage.local.remove(QUICK_ACTIVE_PROFILE_KEY);
        return { secret: "", profileName: "" };
    }

    return {
        secret: profile.secretKey,
        profileName: profile.name
    };
}

async function getQuickTheme() {
    const stored = await chrome.storage.local.get(QUICK_THEME_KEY);
    return stored[QUICK_THEME_KEY] === "light" ? "light" : "dark";
}

async function purgeExpiredTemporarySession() {
    const stored = await chrome.storage.session.get(SESSION_META_KEY);
    const meta = stored[SESSION_META_KEY];

    if (!meta?.expiresAt || Date.now() <= meta.expiresAt) {
        return;
    }

    await chrome.storage.session.remove([
        SESSION_WORKSPACE_KEY,
        SESSION_META_KEY,
        SESSION_RUNTIME_SECRET_KEY,
        SESSION_PROFILE_NAME_KEY
    ]);
}

/* =========================================================
   Profile storage
   ========================================================= */

function openVaultDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(KEY_STORE)) {
                db.createObjectStore(KEY_STORE);
            }

            if (!db.objectStoreNames.contains(DATA_STORE)) {
                db.createObjectStore(DATA_STORE);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Unable to open CipherVault storage."));
    });
}

async function idbGet(storeName, key) {
    const db = await openVaultDB();

    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const request = transaction.objectStore(storeName).get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("CipherVault storage read failed."));
        });
    } finally {
        db.close();
    }
}

async function loadProfiles() {
    const record = await idbGet(DATA_STORE, PROFILES_BLOB_ID);

    if (!record) {
        return [];
    }

    const wrappingKey = await idbGet(KEY_STORE, WRAP_KEY_ID);

    if (!wrappingKey) {
        return [];
    }

    try {
        const iv = base64ToBytes(record.iv);
        const ciphertext = base64ToBytes(record.ciphertext);

        const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: GCM_TAG_LENGTH },
            wrappingKey,
            ciphertext
        );

        const parsed = JSON.parse(decoder.decode(plaintext));
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Unable to read CipherVault profiles in Quick Cipher:", error);
        return [];
    }
}

/* =========================================================
   Crypto
   ========================================================= */

async function deriveAesKey(secret, salt) {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptMessage(plaintext, secret) {
    if (!secret) {
        throw new Error("Enter a secret key.");
    }

    if (await isAdminSecret(secret)) {
        throw new Error("The reserved admin key cannot encrypt real messages.");
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveAesKey(secret, salt);

    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
            tagLength: GCM_TAG_LENGTH
        },
        key,
        encoder.encode(plaintext)
    ));

    const payload = new Uint8Array(1 + SALT_LENGTH + IV_LENGTH + encrypted.length);
    let offset = 0;

    payload[offset] = VERSION;
    offset += 1;

    payload.set(salt, offset);
    offset += SALT_LENGTH;

    payload.set(iv, offset);
    offset += IV_LENGTH;

    payload.set(encrypted, offset);

    return bytesToBase64(payload);
}

async function decryptMessage(encoded, secret) {
    if (!secret) {
        throw new Error("Enter a secret key.");
    }

    let payload;

    try {
        payload = base64ToBytes(encoded);
    } catch {
        throw new Error("Invalid Base64 payload.");
    }

    const minimumLength = 1 + SALT_LENGTH + IV_LENGTH + 16;

    if (payload.length < minimumLength) {
        throw new Error("Invalid or incomplete payload.");
    }

    const version = payload[0];

    if (version !== VERSION) {
        throw new Error(`Unsupported CipherVault version: ${version}.`);
    }

    const saltStart = 1;
    const ivStart = saltStart + SALT_LENGTH;
    const cipherStart = ivStart + IV_LENGTH;

    const salt = payload.slice(saltStart, ivStart);
    const iv = payload.slice(ivStart, cipherStart);
    const ciphertext = payload.slice(cipherStart);
    const key = await deriveAesKey(secret, salt);

    try {
        const plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
                tagLength: GCM_TAG_LENGTH
            },
            key,
            ciphertext
        );

        return decoder.decode(plaintext);
    } catch {
        throw new Error("Wrong secret key or corrupted message.");
    }
}

async function decryptSelectedText(input, secret) {
    const lines = input.split(/\r?\n/);
    const decoyMode = await isAdminSecret(secret);
    const output = [];

    for (let index = 0; index < lines.length; index += 1) {
        const trimmed = lines[index].trim();

        if (!trimmed) {
            output.push("");
            continue;
        }

        if (decoyMode) {
            output.push(await deterministicDecoy(trimmed, index, input));
            continue;
        }

        try {
            output.push(await decryptMessage(trimmed, secret));
        } catch (error) {
            output.push(`[ERROR line ${index + 1}: ${error.message}]`);
        }
    }

    return output.join("\n");
}

async function isAdminSecret(secret) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    return bytesToHex(new Uint8Array(digest)) === ADMIN_KEY_HASH;
}

async function deterministicDecoy(line, lineIndex, wholeInput) {
    const seedMaterial = `${wholeInput}\n${lineIndex}\n${line}`;
    const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", encoder.encode(seedMaterial))
    );
    const index = ((digest[0] << 8) | digest[1]) % DECOY_MESSAGES.length;
    return DECOY_MESSAGES[index];
}

function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
}

function base64ToBytes(value) {
    const normalized = String(value || "").replace(/\s+/g, "");

    if (!normalized) {
        throw new Error("Empty Base64 payload.");
    }

    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}
