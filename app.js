// ======================================================
// CIPHERVAULT
// ======================================================


// ======================================================
// CRYPTO CONFIG
// ======================================================

const encoder =
    new TextEncoder();

const decoder =
    new TextDecoder();

const VERSION =
    1;

const SALT_LENGTH =
    16;

const IV_LENGTH =
    12;

const GCM_TAG_LENGTH =
    128;

const PBKDF2_ITERATIONS =
    300000;


// ======================================================
// LOCAL STORAGE
// ======================================================

const THEME_STORAGE_KEY =
    "ciphervault-theme";

/*
    Legacy keys from the previous version.

    These are migrated away from plaintext localStorage.
*/

const LEGACY_KEY_STORAGE_KEY =
    "ciphervault-saved-key";

const LEGACY_REMEMBER_STORAGE_KEY =
    "ciphervault-remember-key";


// ======================================================
// INDEXEDDB CONFIG
// ======================================================

const DB_NAME =
    "ciphervault-local-vault";

const DB_VERSION =
    1;

const DB_STORE =
    "secure-storage";

const IDB_DEVICE_KEY =
    "device-wrapping-key";

const IDB_SAVED_SECRET =
    "saved-secret";

const IDB_REMEMBER_FLAG =
    "remember-secret";

let databasePromise =
    null;


// ======================================================
// DOM
// ======================================================

const password =
    document.getElementById(
        "password"
    );

const togglePassword =
    document.getElementById(
        "togglePassword"
    );

const rememberKey =
    document.getElementById(
        "rememberKey"
    );

const forgetKey =
    document.getElementById(
        "forgetKey"
    );

const storageInfo =
    document.getElementById(
        "storageInfo"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const themeIcon =
    document.getElementById(
        "themeIcon"
    );


// Encrypt

const encryptPanel =
    document.getElementById(
        "encryptPanel"
    );

const encryptInput =
    document.getElementById(
        "encryptInput"
    );

const encryptOutput =
    document.getElementById(
        "encryptOutput"
    );

const encryptCounter =
    document.getElementById(
        "encryptCounter"
    );

const encryptButton =
    document.getElementById(
        "encryptButton"
    );

const encryptButtonText =
    document.getElementById(
        "encryptButtonText"
    );

const encryptIcon =
    document.getElementById(
        "encryptIcon"
    );

const copyEncrypted =
    document.getElementById(
        "copyEncrypted"
    );

const clearEncrypt =
    document.getElementById(
        "clearEncrypt"
    );

const encryptStatusContainer =
    document.getElementById(
        "encryptStatusContainer"
    );

const encryptStatus =
    document.getElementById(
        "encryptStatus"
    );


// Decrypt

const decryptPanel =
    document.getElementById(
        "decryptPanel"
    );

const decryptInput =
    document.getElementById(
        "decryptInput"
    );

const decryptOutput =
    document.getElementById(
        "decryptOutput"
    );

const decryptCounter =
    document.getElementById(
        "decryptCounter"
    );

const decryptButton =
    document.getElementById(
        "decryptButton"
    );

const decryptButtonText =
    document.getElementById(
        "decryptButtonText"
    );

const decryptIcon =
    document.getElementById(
        "decryptIcon"
    );

const copyDecrypted =
    document.getElementById(
        "copyDecrypted"
    );

const clearDecrypt =
    document.getElementById(
        "clearDecrypt"
    );

const decryptStatusContainer =
    document.getElementById(
        "decryptStatusContainer"
    );

const decryptStatus =
    document.getElementById(
        "decryptStatus"
    );


// Mobile

const mobileEncrypt =
    document.getElementById(
        "mobileEncrypt"
    );

const mobileDecrypt =
    document.getElementById(
        "mobileDecrypt"
    );


// Confirmation modal

const confirmModal =
    document.getElementById(
        "confirmModal"
    );

const confirmTitle =
    document.getElementById(
        "confirmTitle"
    );

const confirmMessage =
    document.getElementById(
        "confirmMessage"
    );

const cancelClear =
    document.getElementById(
        "cancelClear"
    );

const confirmClear =
    document.getElementById(
        "confirmClear"
    );

let pendingClearAction =
    null;


// ======================================================
// INDEXEDDB HELPERS
// ======================================================

function openDatabase() {

    if (
        databasePromise
    ) {

        return databasePromise;
    }


    databasePromise =
        new Promise(
            (
                resolve,
                reject
            ) => {

                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );


                request.onupgradeneeded =
                    event => {

                        const db =
                            event.target.result;


                        if (
                            !db.objectStoreNames.contains(
                                DB_STORE
                            )
                        ) {

                            db.createObjectStore(
                                DB_STORE
                            );
                        }
                    };


                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                        );
                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );
                    };

            }
        );


    return databasePromise;
}


async function idbGet(
    key
) {

    const db =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                db.transaction(
                    DB_STORE,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    DB_STORE
                );


            const request =
                store.get(
                    key
                );


            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );
                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );
                };

        }
    );
}


async function idbSet(
    key,
    value
) {

    const db =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                db.transaction(
                    DB_STORE,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    DB_STORE
                );


            store.put(
                value,
                key
            );


            transaction.oncomplete =
                () => resolve();


            transaction.onerror =
                () => {

                    reject(
                        transaction.error
                    );
                };

        }
    );
}


async function idbDelete(
    key
) {

    const db =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                db.transaction(
                    DB_STORE,
                    "readwrite"
                );


            transaction
                .objectStore(
                    DB_STORE
                )
                .delete(
                    key
                );


            transaction.oncomplete =
                () => resolve();


            transaction.onerror =
                () => {

                    reject(
                        transaction.error
                    );
                };

        }
    );
}


// ======================================================
// LOCAL SECRET STORAGE KEY
// ======================================================

async function getOrCreateDeviceKey() {

    let key =
        await idbGet(
            IDB_DEVICE_KEY
        );


    if (
        key
    ) {

        return key;
    }


    /*
        Important:

        extractable = false

        JavaScript can use the key for crypto,
        but Web Crypto refuses exportKey().
    */

    key =
        await crypto.subtle.generateKey(

            {
                name:
                    "AES-GCM",

                length:
                    256
            },

            false,

            [
                "encrypt",
                "decrypt"
            ]
        );


    await idbSet(
        IDB_DEVICE_KEY,
        key
    );


    return key;
}


// ======================================================
// ENCRYPT / DECRYPT REMEMBERED SECRET
// ======================================================

async function storeSecretLocally(
    secret
) {

    const key =
        await getOrCreateDeviceKey();


    const iv =
        crypto.getRandomValues(
            new Uint8Array(
                12
            )
        );


    const encrypted =
        await crypto.subtle.encrypt(

            {
                name:
                    "AES-GCM",

                iv:
                    iv
            },

            key,

            encoder.encode(
                secret
            )
        );


    await idbSet(

        IDB_SAVED_SECRET,

        {
            version:
                1,

            iv:
                Array.from(
                    iv
                ),

            ciphertext:
                Array.from(
                    new Uint8Array(
                        encrypted
                    )
                )
        }
    );
}


async function readStoredSecret() {

    const record =
        await idbGet(
            IDB_SAVED_SECRET
        );


    if (
        !record
    ) {

        return null;
    }


    if (
        record.version !== 1
    ) {

        throw new Error(
            "Unsupported local secret format."
        );
    }


    const key =
        await idbGet(
            IDB_DEVICE_KEY
        );


    if (
        !key
    ) {

        throw new Error(
            "Local encryption key is missing."
        );
    }


    const decrypted =
        await crypto.subtle.decrypt(

            {
                name:
                    "AES-GCM",

                iv:
                    new Uint8Array(
                        record.iv
                    )
            },

            key,

            new Uint8Array(
                record.ciphertext
            )
        );


    return decoder.decode(
        decrypted
    );
}


// ======================================================
// LEGACY PLAINTEXT MIGRATION
// ======================================================

async function migrateLegacySavedSecret() {

    const legacyRemember =
        localStorage.getItem(
            LEGACY_REMEMBER_STORAGE_KEY
        ) === "true";


    const legacySecret =
        localStorage.getItem(
            LEGACY_KEY_STORAGE_KEY
        );


    if (
        !legacyRemember ||
        !legacySecret
    ) {

        /*
            Remove stale legacy state if
            no plaintext key remains.
        */

        if (
            !legacySecret
        ) {

            localStorage.removeItem(
                LEGACY_REMEMBER_STORAGE_KEY
            );
        }


        return;
    }


    /*
        Migrate before deleting the plaintext copy.
    */

    await idbSet(
        IDB_REMEMBER_FLAG,
        true
    );


    await storeSecretLocally(
        legacySecret
    );


    localStorage.removeItem(
        LEGACY_KEY_STORAGE_KEY
    );


    localStorage.removeItem(
        LEGACY_REMEMBER_STORAGE_KEY
    );
}


// ======================================================
// BASE64
// ======================================================

function bytesToBase64(
    bytes
) {

    let binary =
        "";


    for (
        const byte
        of bytes
    ) {

        binary +=
            String.fromCharCode(
                byte
            );
    }


    return btoa(
        binary
    );
}


function base64ToBytes(
    base64
) {

    const cleaned =
        base64
            .trim()
            .replace(
                /\s+/g,
                ""
            );


    if (

        cleaned.length === 0 ||

        cleaned.length % 4 !== 0 ||

        !/^[A-Za-z0-9+/]*={0,2}$/
            .test(
                cleaned
            )

    ) {

        throw new Error(
            "Invalid Base64 payload."
        );
    }


    let binary;


    try {

        binary =
            atob(
                cleaned
            );

    } catch {

        throw new Error(
            "Invalid Base64 payload."
        );
    }


    const bytes =
        new Uint8Array(
            binary.length
        );


    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        bytes[i] =
            binary.charCodeAt(
                i
            );
    }


    return bytes;
}


// ======================================================
// MESSAGE KEY DERIVATION
// ======================================================

async function deriveKey(
    passwordValue,
    salt
) {

    const passwordMaterial =
        await crypto.subtle.importKey(

            "raw",

            encoder.encode(
                passwordValue
            ),

            {
                name:
                    "PBKDF2"
            },

            false,

            [
                "deriveKey"
            ]
        );


    return crypto.subtle.deriveKey(

        {
            name:
                "PBKDF2",

            salt:
                salt,

            iterations:
                PBKDF2_ITERATIONS,

            hash:
                "SHA-256"
        },

        passwordMaterial,

        {
            name:
                "AES-GCM",

            length:
                256
        },

        false,

        [
            "encrypt",
            "decrypt"
        ]
    );
}


// ======================================================
// MESSAGE ENCRYPT
// ======================================================

async function encryptMessage(
    message,
    passwordValue
) {

    if (
        !message
    ) {

        throw new Error(
            "Enter a message to encrypt."
        );
    }


    if (
        !passwordValue
    ) {

        throw new Error(
            "Enter a secret key."
        );
    }


    const salt =
        crypto.getRandomValues(
            new Uint8Array(
                SALT_LENGTH
            )
        );


    const iv =
        crypto.getRandomValues(
            new Uint8Array(
                IV_LENGTH
            )
        );


    const key =
        await deriveKey(
            passwordValue,
            salt
        );


    const encrypted =
        await crypto.subtle.encrypt(

            {
                name:
                    "AES-GCM",

                iv:
                    iv,

                tagLength:
                    GCM_TAG_LENGTH
            },

            key,

            encoder.encode(
                message
            )
        );


    const ciphertext =
        new Uint8Array(
            encrypted
        );


    const payload =
        new Uint8Array(

            1 +

            SALT_LENGTH +

            IV_LENGTH +

            ciphertext.length
        );


    let offset =
        0;


    payload[offset] =
        VERSION;


    offset += 1;


    payload.set(
        salt,
        offset
    );


    offset +=
        SALT_LENGTH;


    payload.set(
        iv,
        offset
    );


    offset +=
        IV_LENGTH;


    payload.set(
        ciphertext,
        offset
    );


    return bytesToBase64(
        payload
    );
}


// ======================================================
// SINGLE MESSAGE DECRYPT
// ======================================================

async function decryptMessage(
    encryptedBase64,
    passwordValue
) {

    if (
        !encryptedBase64
    ) {

        throw new Error(
            "Encrypted message is empty."
        );
    }


    if (
        !passwordValue
    ) {

        throw new Error(
            "Enter the secret key."
        );
    }


    const payload =
        base64ToBytes(
            encryptedBase64
        );


    const minimumLength =

        1 +

        SALT_LENGTH +

        IV_LENGTH +

        16;


    if (
        payload.length <
        minimumLength
    ) {

        throw new Error(
            "Invalid encrypted payload."
        );
    }


    let offset =
        0;


    const version =
        payload[offset];


    offset +=
        1;


    if (
        version !== VERSION
    ) {

        throw new Error(
            `Unsupported payload version: ${version}`
        );
    }


    const salt =
        payload.slice(

            offset,

            offset +
            SALT_LENGTH
        );


    offset +=
        SALT_LENGTH;


    const iv =
        payload.slice(

            offset,

            offset +
            IV_LENGTH
        );


    offset +=
        IV_LENGTH;


    const ciphertext =
        payload.slice(
            offset
        );


    const key =
        await deriveKey(
            passwordValue,
            salt
        );


    try {

        const decrypted =
            await crypto.subtle.decrypt(

                {
                    name:
                        "AES-GCM",

                    iv:
                        iv,

                    tagLength:
                        GCM_TAG_LENGTH
                },

                key,

                ciphertext
            );


        return decoder.decode(
            decrypted
        );


    } catch {

        throw new Error(
            "Wrong secret key or corrupted message."
        );
    }
}


// ======================================================
// BULK DECRYPT
// ======================================================

async function decryptLines(
    inputValue,
    passwordValue,
    progressCallback
) {

    if (
        !passwordValue
    ) {

        throw new Error(
            "Enter the secret key."
        );
    }


    const lines =
        inputValue
            .replace(
                /\r/g,
                ""
            )
            .split(
                "\n"
            );


    const total =
        lines.filter(
            line =>
                line
                    .trim()
                    .length > 0
        ).length;


    if (
        total === 0
    ) {

        throw new Error(
            "Enter at least one encrypted message."
        );
    }


    const results =
        [];


    let successCount =
        0;

    let errorCount =
        0;

    let processed =
        0;


    for (
        let index = 0;
        index < lines.length;
        index++
    ) {

        const line =
            lines[index]
                .trim();


        if (
            !line
        ) {

            results.push(
                ""
            );

            continue;
        }


        try {

            const decrypted =
                await decryptMessage(

                    line,

                    passwordValue
                );


            results.push(
                decrypted
            );


            successCount += 1;


        } catch (
            error
        ) {

            results.push(

                `[ERROR line ${index + 1}: ${error.message}]`

            );


            errorCount += 1;
        }


        processed += 1;


        if (
            progressCallback
        ) {

            progressCallback(
                processed,
                total
            );
        }
    }


    return {

        text:
            results.join(
                "\n"
            ),

        total,

        successCount,

        errorCount
    };
}


// ======================================================
// STATUS
// ======================================================

function setPanelStatus(
    container,
    textElement,
    type,
    message
) {

    container.className =
        "status-container";


    if (
        type &&
        type !== "ready"
    ) {

        container
            .classList
            .add(
                type
            );
    }


    textElement.textContent =
        message.toUpperCase();
}


// ======================================================
// BUTTON HELPERS
// ======================================================

function setButtonProcessing(
    button,
    textElement,
    iconElement,
    message
) {

    button
        .classList
        .remove(
            "success"
        );


    button
        .classList
        .add(
            "processing"
        );


    iconElement.textContent =
        "◌";


    textElement.textContent =
        message;
}


function finishButtonSuccess(
    button,
    textElement,
    iconElement,
    successText,
    idleText,
    idleIcon
) {

    button
        .classList
        .remove(
            "processing"
        );


    button
        .classList
        .add(
            "success"
        );


    iconElement.textContent =
        "✓";


    textElement.textContent =
        successText;


    window.setTimeout(
        () => {

            button
                .classList
                .remove(
                    "success"
                );


            iconElement.textContent =
                idleIcon;


            textElement.textContent =
                idleText;

        },

        850
    );
}


function resetButton(
    button,
    textElement,
    iconElement,
    idleText,
    idleIcon
) {

    button
        .classList
        .remove(
            "processing",
            "success"
        );


    iconElement.textContent =
        idleIcon;


    textElement.textContent =
        idleText;
}


// ======================================================
// THEME
// ======================================================

function applyTheme(
    theme
) {

    document
        .documentElement
        .dataset
        .theme =
            theme;


    themeIcon.textContent =

        theme === "dark"

            ? "☾"

            : "☀";
}


function loadTheme() {

    const saved =
        localStorage.getItem(
            THEME_STORAGE_KEY
        );


    if (
        saved === "dark" ||
        saved === "light"
    ) {

        applyTheme(
            saved
        );

        return;
    }


    const prefersDark =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


    applyTheme(

        prefersDark

            ? "dark"

            : "light"
    );
}


// ======================================================
// REMEMBERED KEY
// ======================================================

async function loadSavedKey() {

    try {

        const enabled =
            await idbGet(
                IDB_REMEMBER_FLAG
            ) === true;


        rememberKey.checked =
            enabled;


        if (
            !enabled
        ) {

            forgetKey
                .classList
                .remove(
                    "visible"
                );

            return;
        }


        const saved =
            await readStoredSecret();


        if (
            saved
        ) {

            password.value =
                saved;


            forgetKey
                .classList
                .add(
                    "visible"
                );
        }


    } catch (
        error
    ) {

        rememberKey.checked =
            false;


        storageInfo.textContent =
            "The saved secret could not be loaded. You can forget it and save it again.";


        console.warn(
            "CipherVault local secret load failed:",
            error
        );
    }
}


async function saveRememberedKey() {

    if (
        !rememberKey.checked
    ) {

        return;
    }


    await idbSet(
        IDB_REMEMBER_FLAG,
        true
    );


    if (
        !password.value
    ) {

        await idbDelete(
            IDB_SAVED_SECRET
        );


        forgetKey
            .classList
            .remove(
                "visible"
            );


        return;
    }


    await storeSecretLocally(
        password.value
    );


    forgetKey
        .classList
        .add(
            "visible"
        );
}


let secretSaveTimer =
    null;


function scheduleSecretSave() {

    if (
        !rememberKey.checked
    ) {

        return;
    }


    window.clearTimeout(
        secretSaveTimer
    );


    secretSaveTimer =
        window.setTimeout(
            () => {

                saveRememberedKey()
                    .catch(
                        error => {

                            console.warn(
                                "Could not save remembered key:",
                                error
                            );
                        }
                    );

            },

            400
        );
}


// ======================================================
// MOBILE
// ======================================================

function setMobileMode(
    mode
) {

    const encryptActive =
        mode === "encrypt";


    encryptPanel
        .classList
        .toggle(
            "active-mobile",
            encryptActive
        );


    decryptPanel
        .classList
        .toggle(
            "active-mobile",
            !encryptActive
        );


    mobileEncrypt
        .classList
        .toggle(
            "active",
            encryptActive
        );


    mobileDecrypt
        .classList
        .toggle(
            "active",
            !encryptActive
        );
}


// ======================================================
// COUNTERS
// ======================================================

function updateEncryptCounter() {

    const count =
        encryptInput
            .value
            .length;


    encryptCounter.textContent =

        `${count} ${
            count === 1
                ? "char"
                : "chars"
        }`;
}


function updateDecryptCounter() {

    const count =
        decryptInput
            .value
            .replace(
                /\r/g,
                ""
            )
            .split(
                "\n"
            )
            .filter(
                line =>
                    line
                        .trim()
                        .length > 0
            )
            .length;


    decryptCounter.textContent =

        `${count} ${
            count === 1
                ? "message"
                : "messages"
        }`;
}


// ======================================================
// CLIPBOARD
// ======================================================

async function writeClipboard(
    text
) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        await navigator
            .clipboard
            .writeText(
                text
            );


        return;
    }


    const helper =
        document.createElement(
            "textarea"
        );


    helper.value =
        text;


    helper.style.position =
        "fixed";


    helper.style.opacity =
        "0";


    document.body.appendChild(
        helper
    );


    helper.select();


    const copied =
        document.execCommand(
            "copy"
        );


    helper.remove();


    if (
        !copied
    ) {

        throw new Error(
            "Could not copy to clipboard."
        );
    }
}


// ======================================================
// COPY FEEDBACK
// ======================================================

function showCopiedFeedback(
    button,
    outputElement
) {

    if (
        button._copyTimer
    ) {

        clearTimeout(
            button._copyTimer
        );
    }


    button
        .classList
        .add(
            "copied"
        );


    button.textContent =
        "✓ COPIED";


    outputElement
        .classList
        .remove(
            "copy-flash"
        );


    void outputElement.offsetWidth;


    outputElement
        .classList
        .add(
            "copy-flash"
        );


    button._copyTimer =
        window.setTimeout(
            () => {

                button
                    .classList
                    .remove(
                        "copied"
                    );


                button.textContent =
                    "COPY";


                outputElement
                    .classList
                    .remove(
                        "copy-flash"
                    );

            },

            1300
        );
}


async function copyOutput(
    button,
    outputElement,
    statusContainer,
    statusText
) {

    if (
        !outputElement.value
    ) {

        setPanelStatus(

            statusContainer,

            statusText,

            "error",

            "Nothing to copy."

        );


        return;
    }


    try {

        await writeClipboard(
            outputElement.value
        );


        showCopiedFeedback(
            button,
            outputElement
        );


        setPanelStatus(

            statusContainer,

            statusText,

            "success",

            "Copied to clipboard."

        );


    } catch (
        error
    ) {

        setPanelStatus(

            statusContainer,

            statusText,

            "error",

            error.message
        );
    }
}


// ======================================================
// CLEAR CONFIRMATION MODAL
// ======================================================

function openClearConfirmation(
    title,
    message,
    callback
) {

    pendingClearAction =
        callback;


    confirmTitle.textContent =
        title;


    confirmMessage.textContent =
        message;


    confirmModal.hidden =
        false;


    requestAnimationFrame(
        () => {

            confirmModal
                .classList
                .add(
                    "visible"
                );


            cancelClear.focus();
        }
    );
}


function closeClearConfirmation() {

    confirmModal
        .classList
        .remove(
            "visible"
        );


    pendingClearAction =
        null;


    window.setTimeout(
        () => {

            confirmModal.hidden =
                true;

        },

        180
    );
}


cancelClear.addEventListener(
    "click",
    closeClearConfirmation
);


confirmClear.addEventListener(
    "click",
    () => {

        const action =
            pendingClearAction;


        confirmModal
            .classList
            .remove(
                "visible"
            );


        pendingClearAction =
            null;


        window.setTimeout(
            () => {

                confirmModal.hidden =
                    true;


                if (
                    action
                ) {

                    action();
                }

            },

            180
        );
    }
);


confirmModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            confirmModal
        ) {

            closeClearConfirmation();
        }
    }
);


// ======================================================
// EXTENSION DETECTION
// ======================================================

function detectExtensionMode() {

    try {

        const chromeExtension =

            typeof chrome !== "undefined" &&

            chrome.runtime &&

            chrome.runtime.id;


        const browserExtension =

            typeof browser !== "undefined" &&

            browser.runtime &&

            browser.runtime.id;


        if (
            chromeExtension ||
            browserExtension
        ) {

            document
                .documentElement
                .classList
                .add(
                    "extension-mode"
                );
        }


    } catch {

        // Normal webpage.

    }
}


// ======================================================
// THEME EVENT
// ======================================================

themeToggle.addEventListener(
    "click",
    () => {

        const current =
            document
                .documentElement
                .dataset
                .theme;


        const next =

            current === "dark"

                ? "light"

                : "dark";


        applyTheme(
            next
        );


        localStorage.setItem(
            THEME_STORAGE_KEY,
            next
        );
    }
);


// ======================================================
// REMEMBER EVENTS
// ======================================================

rememberKey.addEventListener(
    "change",
    async () => {

        try {

            if (
                rememberKey.checked
            ) {

                await idbSet(
                    IDB_REMEMBER_FLAG,
                    true
                );


                await saveRememberedKey();


                setPanelStatus(

                    encryptStatusContainer,

                    encryptStatus,

                    "success",

                    "Local key remembering enabled."

                );


                setPanelStatus(

                    decryptStatusContainer,

                    decryptStatus,

                    "success",

                    "Local key remembering enabled."

                );


            } else {

                await idbSet(
                    IDB_REMEMBER_FLAG,
                    false
                );


                await idbDelete(
                    IDB_SAVED_SECRET
                );


                forgetKey
                    .classList
                    .remove(
                        "visible"
                    );


                setPanelStatus(

                    encryptStatusContainer,

                    encryptStatus,

                    "success",

                    "Saved key removed."

                );


                setPanelStatus(

                    decryptStatusContainer,

                    decryptStatus,

                    "success",

                    "Saved key removed."

                );
            }


        } catch (
            error
        ) {

            rememberKey.checked =
                false;


            storageInfo.textContent =
                "Unable to use IndexedDB secure storage in this browser.";


            console.error(
                error
            );
        }
    }
);


password.addEventListener(
    "input",
    scheduleSecretSave
);


password.addEventListener(
    "blur",
    () => {

        if (
            rememberKey.checked
        ) {

            saveRememberedKey()
                .catch(
                    console.warn
                );
        }
    }
);


forgetKey.addEventListener(
    "click",
    async () => {

        await idbDelete(
            IDB_SAVED_SECRET
        );


        await idbDelete(
            IDB_REMEMBER_FLAG
        );


        /*
            Forget means forget everything
            related to local secret storage.
        */

        await idbDelete(
            IDB_DEVICE_KEY
        );


        password.value =
            "";


        rememberKey.checked =
            false;


        forgetKey
            .classList
            .remove(
                "visible"
            );


        setPanelStatus(

            encryptStatusContainer,

            encryptStatus,

            "success",

            "Saved key forgotten."

        );


        setPanelStatus(

            decryptStatusContainer,

            decryptStatus,

            "success",

            "Saved key forgotten."

        );


        password.focus();
    }
);


// ======================================================
// SHOW / HIDE PASSWORD
// ======================================================

togglePassword.addEventListener(
    "click",
    () => {

        const visible =
            password.type ===
            "text";


        password.type =

            visible

                ? "password"

                : "text";


        togglePassword.textContent =

            visible

                ? "◉"

                : "◎";


        password.focus();
    }
);


// ======================================================
// COUNTERS
// ======================================================

encryptInput.addEventListener(
    "input",
    updateEncryptCounter
);


decryptInput.addEventListener(
    "input",
    updateDecryptCounter
);


// ======================================================
// MOBILE
// ======================================================

mobileEncrypt.addEventListener(
    "click",
    () => {

        setMobileMode(
            "encrypt"
        );
    }
);


mobileDecrypt.addEventListener(
    "click",
    () => {

        setMobileMode(
            "decrypt"
        );
    }
);


// ======================================================
// ENCRYPT
// ======================================================

encryptButton.addEventListener(
    "click",
    async () => {

        if (
            encryptButton
                .classList
                .contains(
                    "processing"
                )
        ) {

            return;
        }


        encryptOutput.value =
            "";


        setButtonProcessing(

            encryptButton,

            encryptButtonText,

            encryptIcon,

            "ENCRYPTING..."

        );


        setPanelStatus(

            encryptStatusContainer,

            encryptStatus,

            "processing",

            "Deriving key and encrypting."

        );


        try {

            encryptOutput.value =
                await encryptMessage(

                    encryptInput.value,

                    password.value
                );


            if (
                rememberKey.checked
            ) {

                await saveRememberedKey();
            }


            setPanelStatus(

                encryptStatusContainer,

                encryptStatus,

                "success",

                "Encryption complete."

            );


            finishButtonSuccess(

                encryptButton,

                encryptButtonText,

                encryptIcon,

                "ENCRYPTED",

                "ENCRYPT MESSAGE",

                "◇"
            );


        } catch (
            error
        ) {

            resetButton(

                encryptButton,

                encryptButtonText,

                encryptIcon,

                "ENCRYPT MESSAGE",

                "◇"
            );


            setPanelStatus(

                encryptStatusContainer,

                encryptStatus,

                "error",

                error.message
            );
        }
    }
);


// ======================================================
// DECRYPT
// ======================================================

decryptButton.addEventListener(
    "click",
    async () => {

        if (
            decryptButton
                .classList
                .contains(
                    "processing"
                )
        ) {

            return;
        }


        decryptOutput.value =
            "";


        setButtonProcessing(

            decryptButton,

            decryptButtonText,

            decryptIcon,

            "DECRYPTING..."

        );


        setPanelStatus(

            decryptStatusContainer,

            decryptStatus,

            "processing",

            "Preparing messages..."

        );


        try {

            const result =
                await decryptLines(

                    decryptInput.value,

                    password.value,

                    (
                        processed,
                        total
                    ) => {

                        setPanelStatus(

                            decryptStatusContainer,

                            decryptStatus,

                            "processing",

                            `Decrypting ${processed}/${total} messages`

                        );
                    }
                );


            decryptOutput.value =
                result.text;


            if (
                rememberKey.checked
            ) {

                await saveRememberedKey();
            }


            if (
                result.errorCount === 0
            ) {

                setPanelStatus(

                    decryptStatusContainer,

                    decryptStatus,

                    "success",

                    `${result.successCount}/${result.total} messages decrypted.`

                );


            } else {

                setPanelStatus(

                    decryptStatusContainer,

                    decryptStatus,

                    "warning",

                    `${result.successCount}/${result.total} decrypted, ${result.errorCount} failed.`

                );
            }


            finishButtonSuccess(

                decryptButton,

                decryptButtonText,

                decryptIcon,

                "DECRYPTED",

                "DECRYPT MESSAGES",

                "◆"
            );


        } catch (
            error
        ) {

            resetButton(

                decryptButton,

                decryptButtonText,

                decryptIcon,

                "DECRYPT MESSAGES",

                "◆"
            );


            setPanelStatus(

                decryptStatusContainer,

                decryptStatus,

                "error",

                error.message
            );
        }
    }
);


// ======================================================
// COPY
// ======================================================

copyEncrypted.addEventListener(
    "click",
    () => {

        copyOutput(

            copyEncrypted,

            encryptOutput,

            encryptStatusContainer,

            encryptStatus
        );
    }
);


copyDecrypted.addEventListener(
    "click",
    () => {

        copyOutput(

            copyDecrypted,

            decryptOutput,

            decryptStatusContainer,

            decryptStatus
        );
    }
);


// ======================================================
// CLEAR
// ======================================================

function clearEncryptPanel() {

    encryptInput.value =
        "";


    encryptOutput.value =
        "";


    updateEncryptCounter();


    resetButton(

        encryptButton,

        encryptButtonText,

        encryptIcon,

        "ENCRYPT MESSAGE",

        "◇"
    );


    setPanelStatus(

        encryptStatusContainer,

        encryptStatus,

        "ready",

        "Ready"
    );


    encryptInput.focus();
}


function clearDecryptPanel() {

    decryptInput.value =
        "";


    decryptOutput.value =
        "";


    updateDecryptCounter();


    resetButton(

        decryptButton,

        decryptButtonText,

        decryptIcon,

        "DECRYPT MESSAGES",

        "◆"
    );


    setPanelStatus(

        decryptStatusContainer,

        decryptStatus,

        "ready",

        "Ready"
    );


    decryptInput.focus();
}


clearEncrypt.addEventListener(
    "click",
    () => {

        if (
            !encryptInput.value &&
            !encryptOutput.value
        ) {

            return;
        }


        openClearConfirmation(

            "Clear Encrypt panel?",

            "The original message and encrypted output will be removed. Your shared secret key will not be changed.",

            clearEncryptPanel
        );
    }
);


clearDecrypt.addEventListener(
    "click",
    () => {

        if (
            !decryptInput.value &&
            !decryptOutput.value
        ) {

            return;
        }


        openClearConfirmation(

            "Clear Decrypt panel?",

            "All encrypted messages and decrypted results in this panel will be removed. Your shared secret key will not be changed.",

            clearDecryptPanel
        );
    }
);


// ======================================================
// KEYBOARD SHORTCUTS
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !confirmModal.hidden
        ) {

            closeClearConfirmation();

            return;
        }


        if (
            !event.ctrlKey ||
            event.key !== "Enter"
        ) {

            return;
        }


        event.preventDefault();


        if (
            document.activeElement ===
            decryptInput
        ) {

            decryptButton.click();


        } else {

            encryptButton.click();
        }
    }
);


// ======================================================
// ENVIRONMENT CHECK
// ======================================================

function checkEnvironment() {

    if (
        !window.crypto ||
        !window.crypto.subtle
    ) {

        encryptButton.disabled =
            true;


        decryptButton.disabled =
            true;


        setPanelStatus(

            encryptStatusContainer,

            encryptStatus,

            "error",

            "Web Crypto API is unavailable."
        );


        setPanelStatus(

            decryptStatusContainer,

            decryptStatus,

            "error",

            "Web Crypto API is unavailable."
        );
    }


    if (
        !window.indexedDB
    ) {

        rememberKey.disabled =
            true;


        storageInfo.textContent =
            "IndexedDB is unavailable. Remember key has been disabled.";
    }
}


// ======================================================
// INITIALIZATION
// ======================================================

async function initializeApp() {

    detectExtensionMode();

    loadTheme();

    setMobileMode(
        "encrypt"
    );

    updateEncryptCounter();

    updateDecryptCounter();

    checkEnvironment();


    if (
        window.indexedDB &&
        window.crypto &&
        window.crypto.subtle
    ) {

        try {

            /*
                Automatically move plaintext key from
                the previous LocalStorage implementation.
            */

            await migrateLegacySavedSecret();


            await loadSavedKey();


        } catch (
            error
        ) {

            console.warn(
                "CipherVault secure local storage initialization failed:",
                error
            );


            storageInfo.textContent =
                "Local remembered-key storage could not be initialized.";
        }
    }
}


initializeApp();