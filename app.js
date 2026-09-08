"use strict";

/* =========================================================
   CipherVault
   Client-side AES-256-GCM + PBKDF2-SHA256
   ========================================================= */

const VERSION = 1;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const GCM_TAG_LENGTH = 128;
const PBKDF2_ITERATIONS = 300000;
const MAX_MESSAGE_LENGTH = 10000;

const DB_NAME = "ciphervault";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const DATA_STORE = "data";
const WRAP_KEY_ID = "profile-wrap-key";
const PROFILES_BLOB_ID = "profiles-v1";

const THEME_KEY = "ciphervault-theme";
const ACTIVE_PROFILE_KEY = "ciphervault-active-profile";
const STORAGE_PREFIX = "ciphervault-";

const EJECT_HOLD_DURATION = 900;
const EJECT_DESTINATION = "https://github.com/";

// SHA-256("admin"). The literal trigger is intentionally not stored as plaintext.
// This is an application-level decoy feature, not cryptographic plausible deniability.
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

let dbInstance = null;
let profiles = [];
let editingProfileId = null;
let clearTarget = null;
let toastTimer = null;
let ejectHoldTimer = null;
let ejectCommitted = false;

/* =========================================================
   DOM
   ========================================================= */

const root = document.documentElement;

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const credentialsSection = document.getElementById("credentialsSection");
const credentialsSummary = document.getElementById("credentialsSummary");
const summaryProfileName = document.getElementById("summaryProfileName");
const summarySecret = document.getElementById("summarySecret");

const profileSelect = document.getElementById("profileSelect");
const addProfileButton = document.getElementById("addProfileButton");
const manageProfilesButton = document.getElementById("manageProfilesButton");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const sessionOverride = document.getElementById("sessionOverride");

const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
const cipherPanels = Array.from(document.querySelectorAll(".cipher-panel"));

const encryptInput = document.getElementById("encryptInput");
const encryptOutput = document.getElementById("encryptOutput");
const encryptButton = document.getElementById("encryptButton");
const encryptCount = document.getElementById("encryptCount");
const encryptResultBlock = document.getElementById("encryptResultBlock");
const encryptStatus = document.getElementById("encryptStatus");
const copyEncryptButton = document.getElementById("copyEncryptButton");
const clearEncryptButton = document.getElementById("clearEncryptButton");

const decryptInput = document.getElementById("decryptInput");
const decryptOutput = document.getElementById("decryptOutput");
const decryptButton = document.getElementById("decryptButton");
const decryptCount = document.getElementById("decryptCount");
const decryptResultBlock = document.getElementById("decryptResultBlock");
const decryptStatus = document.getElementById("decryptStatus");
const copyDecryptButton = document.getElementById("copyDecryptButton");
const clearDecryptButton = document.getElementById("clearDecryptButton");

const ejectButton = document.getElementById("ejectButton");

const profileModal = document.getElementById("profileModal");
const profileModalTitle = document.getElementById("profileModalTitle");
const profileName = document.getElementById("profileName");
const profileSecret = document.getElementById("profileSecret");
const toggleProfileSecret = document.getElementById("toggleProfileSecret");
const profileModalError = document.getElementById("profileModalError");
const closeProfileModal = document.getElementById("closeProfileModal");
const cancelProfileButton = document.getElementById("cancelProfileButton");
const saveProfileButton = document.getElementById("saveProfileButton");

const manageProfilesModal = document.getElementById("manageProfilesModal");
const profilesList = document.getElementById("profilesList");
const closeManageProfilesModal = document.getElementById("closeManageProfilesModal");
const manageAddProfileButton = document.getElementById("manageAddProfileButton");

const clearModal = document.getElementById("clearModal");
const clearModalTitle = document.getElementById("clearModalTitle");
const clearModalText = document.getElementById("clearModalText");
const closeClearModal = document.getElementById("closeClearModal");
const cancelClearButton = document.getElementById("cancelClearButton");
const confirmClearButton = document.getElementById("confirmClearButton");

const toast = document.getElementById("toast");

/* =========================================================
   Initialization
   ========================================================= */

async function initializeApp() {
    detectExtensionMode();
    initializeTheme();
    bindEvents();
    setMobileMode("encrypt");
    updateEncryptCount();
    updateDecryptCount();

    try {
        profiles = await loadProfiles();
        renderProfileSelect();
        await restoreActiveProfile();
    } catch (error) {
        console.error("Profile storage initialization failed:", error);
        showToast("Profiles could not be loaded.", true);
    }
}

function detectExtensionMode() {
    let extensionRuntime = false;

    try {
        extensionRuntime = Boolean(
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.id
        );
    } catch {
        extensionRuntime = false;
    }

    root.classList.toggle("extension-mode", extensionRuntime);
    root.classList.toggle("web-mode", !extensionRuntime);
    root.dataset.runtime = extensionRuntime ? "extension" : "web";
}

function isExtensionMode() {
    return root.classList.contains("extension-mode");
}

/* =========================================================
   Theme
   ========================================================= */

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const preferredTheme = window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";

    applyTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : preferredTheme);
}

function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const isLight = root.getAttribute("data-theme") === "light";
    themeIcon.textContent = isLight ? "☾" : "☀";
    themeToggle.title = isLight ? "Switch to dark mode" : "Switch to light mode";
    themeToggle.setAttribute("aria-label", themeToggle.title);
}

function toggleTheme() {
    const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
}

/* =========================================================
   IndexedDB profile storage
   ========================================================= */

function openVaultDB() {
    if (dbInstance) {
        return Promise.resolve(dbInstance);
    }

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

        request.onsuccess = () => {
            dbInstance = request.result;
            dbInstance.onversionchange = () => {
                dbInstance?.close();
                dbInstance = null;
            };
            resolve(dbInstance);
        };

        request.onerror = () => reject(request.error || new Error("Unable to open IndexedDB."));
    });
}

async function idbGet(storeName, key) {
    const db = await openVaultDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB read failed."));
    });
}

async function idbPut(storeName, key, value) {
    const db = await openVaultDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        transaction.objectStore(storeName).put(value, key);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("IndexedDB write failed."));
        transaction.onabort = () => reject(transaction.error || new Error("IndexedDB write aborted."));
    });
}

async function getWrappingKey() {
    const existing = await idbGet(KEY_STORE, WRAP_KEY_ID);

    if (existing) {
        return existing;
    }

    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    await idbPut(KEY_STORE, WRAP_KEY_ID, key);
    return key;
}

async function loadProfiles() {
    const record = await idbGet(DATA_STORE, PROFILES_BLOB_ID);

    if (!record) {
        return [];
    }

    try {
        const wrappingKey = await getWrappingKey();
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
        console.error("Unable to decrypt saved profiles:", error);
        return [];
    }
}

async function persistProfiles() {
    const wrappingKey = await getWrappingKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const plaintext = encoder.encode(JSON.stringify(profiles));

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: GCM_TAG_LENGTH },
        wrappingKey,
        plaintext
    );

    await idbPut(DATA_STORE, PROFILES_BLOB_ID, {
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    });
}

function makeProfileId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

/* =========================================================
   Profiles UI
   ========================================================= */

function renderProfileSelect() {
    const selectedValue = profileSelect.value;

    profileSelect.innerHTML = "";

    const temporary = document.createElement("option");
    temporary.value = "";
    temporary.textContent = "Temporary Session";
    profileSelect.appendChild(temporary);

    for (const profile of profiles) {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name;
        profileSelect.appendChild(option);
    }

    if (profiles.some(profile => profile.id === selectedValue)) {
        profileSelect.value = selectedValue;
    }
}

async function restoreActiveProfile() {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (!activeId) {
        expandCredentials();
        return;
    }

    const profile = profiles.find(item => item.id === activeId);

    if (!profile) {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        expandCredentials();
        return;
    }

    profileSelect.value = profile.id;
    password.value = profile.secretKey;
    sessionOverride.hidden = true;
    collapseCredentials(profile.name);
}

function collapseCredentials(profileNameValue) {
    if (!isExtensionMode() || !profileNameValue) {
        return;
    }

    summaryProfileName.textContent = profileNameValue;
    summarySecret.textContent = "••••••••";
    credentialsSection.classList.add("is-collapsed");
    credentialsSummary.hidden = false;
    credentialsSummary.setAttribute("aria-expanded", "false");
}

function expandCredentials() {
    credentialsSection.classList.remove("is-collapsed");
    credentialsSummary.hidden = true;
    credentialsSummary.setAttribute("aria-expanded", "true");
}

function handleProfileSelection() {
    const profile = profiles.find(item => item.id === profileSelect.value);

    if (!profile) {
        password.value = "";
        sessionOverride.hidden = true;
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        expandCredentials();
        return;
    }

    password.value = profile.secretKey;
    sessionOverride.hidden = true;
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    collapseCredentials(profile.name);
}

function handleSecretOverride() {
    const profile = profiles.find(item => item.id === profileSelect.value);

    if (!profile) {
        sessionOverride.hidden = true;
        return;
    }

    sessionOverride.hidden = password.value === profile.secretKey;
}

function openProfileEditor(profileId = null) {
    editingProfileId = profileId;
    const profile = profiles.find(item => item.id === profileId);

    profileModalTitle.textContent = profile ? "Edit profile" : "Add profile";
    profileName.value = profile?.name || "";
    profileSecret.value = profile?.secretKey || "";
    profileSecret.type = "password";
    toggleProfileSecret.textContent = "◉";
    profileModalError.hidden = true;
    profileModalError.textContent = "";
    profileModal.hidden = false;

    window.setTimeout(() => profileName.focus(), 0);
}

function closeProfileEditor() {
    profileModal.hidden = true;
    editingProfileId = null;
    profileName.value = "";
    profileSecret.value = "";
    profileModalError.hidden = true;
}

async function saveProfileFromModal() {
    const name = profileName.value.trim();
    const secretKey = profileSecret.value;

    profileModalError.hidden = true;

    if (!name) {
        return showProfileModalError("Enter a profile name.");
    }

    if (!secretKey) {
        return showProfileModalError("Enter a shared secret key.");
    }

    if (await isAdminSecret(secretKey)) {
        return showProfileModalError("This secret key is reserved and cannot be saved as a real profile key.");
    }

    const duplicate = profiles.find(item =>
        item.id !== editingProfileId &&
        item.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0
    );

    if (duplicate) {
        return showProfileModalError("A profile with this name already exists.");
    }

    if (editingProfileId) {
        const profile = profiles.find(item => item.id === editingProfileId);

        if (!profile) {
            return showProfileModalError("Profile not found.");
        }

        profile.name = name;
        profile.secretKey = secretKey;
        profile.updatedAt = Date.now();
    } else {
        const newProfile = {
            id: makeProfileId(),
            name,
            secretKey,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        profiles.push(newProfile);
        editingProfileId = newProfile.id;
    }

    await persistProfiles();
    renderProfileSelect();

    const savedId = editingProfileId;
    profileSelect.value = savedId;

    const savedProfile = profiles.find(item => item.id === savedId);
    password.value = savedProfile?.secretKey || "";

    if (savedProfile) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, savedProfile.id);
    }

    closeProfileEditor();
    renderManageProfiles();

    if (savedProfile) {
        collapseCredentials(savedProfile.name);
    }

    showToast("Profile saved.");
}

function showProfileModalError(message) {
    profileModalError.textContent = message;
    profileModalError.hidden = false;
}

function openManageProfiles() {
    renderManageProfiles();
    manageProfilesModal.hidden = false;
}

function closeManageProfiles() {
    manageProfilesModal.hidden = true;
}

function renderManageProfiles() {
    profilesList.innerHTML = "";

    if (profiles.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No saved profiles yet.";
        profilesList.appendChild(empty);
        return;
    }

    const ordered = [...profiles].sort((a, b) => a.name.localeCompare(b.name));

    for (const profile of ordered) {
        const item = document.createElement("div");
        item.className = "profile-list-item";

        const main = document.createElement("div");
        main.className = "profile-list-main";

        const name = document.createElement("div");
        name.className = "profile-list-name";
        name.textContent = profile.name;

        const subtitle = document.createElement("div");
        subtitle.className = "profile-list-subtitle";
        subtitle.textContent = "Encrypted local profile";

        main.append(name, subtitle);

        const actions = document.createElement("div");
        actions.className = "profile-list-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            closeManageProfiles();
            openProfileEditor(profile.id);
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-profile";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteProfile(profile.id));

        actions.append(edit, remove);
        item.append(main, actions);
        profilesList.appendChild(item);
    }
}

async function deleteProfile(profileId) {
    const profile = profiles.find(item => item.id === profileId);

    if (!profile) {
        return;
    }

    const approved = window.confirm(`Delete profile "${profile.name}"? This cannot be undone.`);

    if (!approved) {
        return;
    }

    profiles = profiles.filter(item => item.id !== profileId);
    await persistProfiles();

    if (profileSelect.value === profileId) {
        profileSelect.value = "";
        password.value = "";
        sessionOverride.hidden = true;
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        expandCredentials();
    }

    renderProfileSelect();
    renderManageProfiles();
    showToast("Profile deleted.");
}

/* =========================================================
   Crypto helpers
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
        throw new Error("This secret key is reserved and cannot encrypt real messages.");
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
        payload = base64ToBytes(encoded.trim());
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

async function isAdminSecret(secret) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    return bytesToHex(new Uint8Array(digest)) === ADMIN_KEY_HASH;
}

async function deterministicDecoy(line, lineIndex, wholeInput) {
    const seedMaterial = `${wholeInput}\n${lineIndex}\n${line}`;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(seedMaterial)));
    const index = ((digest[0] << 8) | digest[1]) % DECOY_MESSAGES.length;
    return DECOY_MESSAGES[index];
}

function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

function base64ToBytes(value) {
    const normalized = value.replace(/\s+/g, "");

    if (!normalized) {
        throw new Error("Empty Base64 payload.");
    }

    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/* =========================================================
   Encrypt / Decrypt
   ========================================================= */

async function handleEncrypt() {
    const plaintext = encryptInput.value;
    const secret = password.value;

    if (!plaintext) {
        return showToast("Type a message to encrypt.", true);
    }

    if (plaintext.length > MAX_MESSAGE_LENGTH) {
        return showToast(`Message is limited to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`, true);
    }

    setButtonBusy(encryptButton, true, "ENCRYPTING…");
    encryptStatus.textContent = "";

    try {
        const result = await encryptMessage(plaintext, secret);
        encryptOutput.value = result;
        encryptResultBlock.hidden = false;
        copyEncryptButton.disabled = false;
        encryptStatus.textContent = "Ready";
    } catch (error) {
        encryptResultBlock.hidden = true;
        copyEncryptButton.disabled = true;
        showToast(error.message || "Encryption failed.", true);
    } finally {
        setButtonBusy(encryptButton, false, "ENCRYPT MESSAGE");
    }
}

async function handleDecrypt() {
    const input = decryptInput.value;
    const secret = password.value;

    if (!input.trim()) {
        return showToast("Paste at least one encrypted message.", true);
    }

    if (!secret) {
        return showToast("Enter a secret key.", true);
    }

    setButtonBusy(decryptButton, true, "DECRYPTING…");
    decryptStatus.textContent = "";

    try {
        const lines = input.split(/\r?\n/);
        const decoyMode = await isAdminSecret(secret);
        let failures = 0;

        const outputLines = [];

        for (let index = 0; index < lines.length; index += 1) {
            const originalLine = lines[index];
            const trimmed = originalLine.trim();

            if (!trimmed) {
                outputLines.push("");
                continue;
            }

            if (decoyMode) {
                outputLines.push(await deterministicDecoy(trimmed, index, input));
                continue;
            }

            try {
                outputLines.push(await decryptMessage(trimmed, secret));
            } catch (error) {
                failures += 1;
                outputLines.push(`[ERROR line ${index + 1}: ${error.message}]`);
            }
        }

        decryptOutput.value = outputLines.join("\n");
        decryptResultBlock.hidden = false;
        copyDecryptButton.disabled = false;
        decryptStatus.textContent = failures ? `${failures} failed` : "Ready";
    } catch (error) {
        decryptResultBlock.hidden = true;
        copyDecryptButton.disabled = true;
        showToast(error.message || "Decryption failed.", true);
    } finally {
        setButtonBusy(decryptButton, false, "DECRYPT MESSAGE(S)");
    }
}

function setButtonBusy(button, busy, label) {
    button.disabled = busy;
    button.dataset.normalHtml ??= button.innerHTML;

    if (busy) {
        button.textContent = label;
        return;
    }

    button.innerHTML = button.dataset.normalHtml;
}

/* =========================================================
   Counts / mode switching
   ========================================================= */

function updateEncryptCount() {
    encryptCount.textContent = `${encryptInput.value.length.toLocaleString()}/${MAX_MESSAGE_LENGTH.toLocaleString()}`;
}

function updateDecryptCount() {
    const count = decryptInput.value
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .length;

    decryptCount.textContent = `${count} ${count === 1 ? "message" : "messages"}`;
}

function setMobileMode(mode) {
    for (const button of modeButtons) {
        button.classList.toggle("active", button.dataset.mode === mode);
    }

    for (const panel of cipherPanels) {
        panel.classList.toggle("active-mobile", panel.dataset.panel === mode);
    }
}

/* =========================================================
   Copy / Clear
   ========================================================= */

async function copyText(text, button, outputElement) {
    if (!text) {
        return;
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            fallbackCopy(text);
        }

        const oldText = button.textContent;
        button.textContent = "✓ COPIED";
        button.classList.add("copied");
        outputElement?.classList.add("copy-flash");

        window.setTimeout(() => {
            button.textContent = oldText;
            button.classList.remove("copied");
            outputElement?.classList.remove("copy-flash");
        }, 1200);
    } catch {
        fallbackCopy(text);
        showToast("Copied.");
    }
}

function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
}

function openClearConfirmation(target) {
    clearTarget = target;
    const isEncrypt = target === "encrypt";

    clearModalTitle.textContent = isEncrypt ? "Clear Encrypt panel?" : "Clear Decrypt panel?";
    clearModalText.textContent = "This clears only this panel. Your shared secret key and saved profiles are retained.";
    clearModal.hidden = false;
}

function closeClearConfirmation() {
    clearModal.hidden = true;
    clearTarget = null;
}

function confirmClearPanel() {
    if (clearTarget === "encrypt") {
        clearEncryptPanel();
    } else if (clearTarget === "decrypt") {
        clearDecryptPanel();
    }

    closeClearConfirmation();
}

function clearEncryptPanel() {
    encryptInput.value = "";
    encryptOutput.value = "";
    encryptStatus.textContent = "";
    encryptResultBlock.hidden = true;
    copyEncryptButton.disabled = true;
    updateEncryptCount();
}

function clearDecryptPanel() {
    decryptInput.value = "";
    decryptOutput.value = "";
    decryptStatus.textContent = "";
    decryptResultBlock.hidden = true;
    copyDecryptButton.disabled = true;
    updateDecryptCount();
}

/* =========================================================
   Eject
   First press clears the visible session immediately.
   Continuing to hold for 900 ms deletes saved CipherVault credentials.
   ========================================================= */

function clearVisibleSession() {
    password.value = "";
    profileSelect.value = "";
    sessionOverride.hidden = true;
    localStorage.removeItem(ACTIVE_PROFILE_KEY);

    clearEncryptPanel();
    clearDecryptPanel();
    setMobileMode("encrypt");
    expandCredentials();

    profileModal.hidden = true;
    manageProfilesModal.hidden = true;
    clearModal.hidden = true;

    document.body.classList.add("panic-cleared");

    window.setTimeout(() => {
        document.body.classList.remove("panic-cleared");
    }, 250);
}

function beginEjectHold(event) {
    if (event.type === "pointerdown" && event.button !== 0) {
        return;
    }

    if (ejectHoldTimer || ejectCommitted) {
        return;
    }

    clearVisibleSession();
    ejectButton.classList.add("eject-holding");

    ejectHoldTimer = window.setTimeout(async () => {
        ejectHoldTimer = null;
        ejectCommitted = true;
        ejectButton.classList.remove("eject-holding");
        ejectButton.classList.add("eject-triggered");

        try {
            await destroyCipherVaultData();
        } finally {
            await leaveCipherVault();
        }
    }, EJECT_HOLD_DURATION);
}

function cancelEjectHold() {
    if (ejectCommitted) {
        return;
    }

    if (ejectHoldTimer) {
        window.clearTimeout(ejectHoldTimer);
        ejectHoldTimer = null;
    }

    ejectButton.classList.remove("eject-holding");
}

async function destroyCipherVaultData() {
    clearVisibleSession();
    profiles = [];
    renderProfileSelect();

    // Preserve the user's theme preference; remove CipherVault session-related localStorage only.
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);

        if (key && key.startsWith(STORAGE_PREFIX) && key !== THEME_KEY) {
            localStorage.removeItem(key);
        }
    }

    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }

    await new Promise(resolve => {
        const request = indexedDB.deleteDatabase(DB_NAME);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
    });
}

async function leaveCipherVault() {
    try {
        if (
            isExtensionMode() &&
            typeof chrome !== "undefined" &&
            chrome.tabs &&
            typeof chrome.tabs.create === "function"
        ) {
            await chrome.tabs.create({ url: EJECT_DESTINATION });
            window.close();
            return;
        }
    } catch (error) {
        console.warn("Extension redirect failed; falling back to window navigation.", error);
    }

    window.location.replace(EJECT_DESTINATION);
}

/* =========================================================
   Misc UI helpers
   ========================================================= */

function togglePasswordVisibility(input, button) {
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.textContent = reveal ? "◌" : "◉";
    button.title = reveal ? "Hide secret key" : "Show secret key";
}

function showToast(message, isError = false) {
    if (toastTimer) {
        window.clearTimeout(toastTimer);
    }

    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.hidden = false;

    toastTimer = window.setTimeout(() => {
        toast.hidden = true;
        toast.classList.remove("error");
    }, 2600);
}

function closeModalOnBackdrop(event) {
    if (event.target !== event.currentTarget) {
        return;
    }

    event.currentTarget.hidden = true;
}

function handleGlobalKeydown(event) {
    if (event.key === "Escape") {
        profileModal.hidden = true;
        manageProfilesModal.hidden = true;
        clearModal.hidden = true;
        return;
    }

    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") {
        return;
    }

    if (document.activeElement === decryptInput) {
        event.preventDefault();
        handleDecrypt();
        return;
    }

    if (document.activeElement === encryptInput) {
        event.preventDefault();
        handleEncrypt();
    }
}

/* =========================================================
   Events
   ========================================================= */

function bindEvents() {
    themeToggle.addEventListener("click", toggleTheme);

    profileSelect.addEventListener("change", handleProfileSelection);
    password.addEventListener("input", handleSecretOverride);
    togglePassword.addEventListener("click", () => togglePasswordVisibility(password, togglePassword));
    credentialsSummary.addEventListener("click", expandCredentials);

    addProfileButton.addEventListener("click", () => openProfileEditor());
    manageProfilesButton.addEventListener("click", openManageProfiles);

    for (const button of modeButtons) {
        button.addEventListener("click", () => setMobileMode(button.dataset.mode));
    }

    encryptInput.addEventListener("input", updateEncryptCount);
    decryptInput.addEventListener("input", updateDecryptCount);

    encryptButton.addEventListener("click", handleEncrypt);
    decryptButton.addEventListener("click", handleDecrypt);

    copyEncryptButton.addEventListener("click", () => copyText(encryptOutput.value, copyEncryptButton, encryptOutput));
    copyDecryptButton.addEventListener("click", () => copyText(decryptOutput.value, copyDecryptButton, decryptOutput));

    clearEncryptButton.addEventListener("click", () => openClearConfirmation("encrypt"));
    clearDecryptButton.addEventListener("click", () => openClearConfirmation("decrypt"));

    closeProfileModal.addEventListener("click", closeProfileEditor);
    cancelProfileButton.addEventListener("click", closeProfileEditor);
    saveProfileButton.addEventListener("click", saveProfileFromModal);
    toggleProfileSecret.addEventListener("click", () => togglePasswordVisibility(profileSecret, toggleProfileSecret));

    profileName.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            profileSecret.focus();
        }
    });

    profileSecret.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            saveProfileFromModal();
        }
    });

    closeManageProfilesModal.addEventListener("click", closeManageProfiles);
    manageAddProfileButton.addEventListener("click", () => {
        closeManageProfiles();
        openProfileEditor();
    });

    closeClearModal.addEventListener("click", closeClearConfirmation);
    cancelClearButton.addEventListener("click", closeClearConfirmation);
    confirmClearButton.addEventListener("click", confirmClearPanel);

    profileModal.addEventListener("click", closeModalOnBackdrop);
    manageProfilesModal.addEventListener("click", closeModalOnBackdrop);
    clearModal.addEventListener("click", closeModalOnBackdrop);

    ejectButton.addEventListener("pointerdown", event => {
        ejectButton.setPointerCapture?.(event.pointerId);
        beginEjectHold(event);
    });

    ejectButton.addEventListener("pointerup", cancelEjectHold);
    ejectButton.addEventListener("pointercancel", cancelEjectHold);
    ejectButton.addEventListener("contextmenu", event => event.preventDefault());

    ejectButton.addEventListener("keydown", event => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            beginEjectHold(event);
        }
    });

    ejectButton.addEventListener("keyup", event => {
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            cancelEjectHold();
        }
    });

    document.addEventListener("keydown", handleGlobalKeydown);
}

initializeApp();
