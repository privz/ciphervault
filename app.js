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
// STORAGE
// ======================================================

const THEME_STORAGE_KEY =
    "ciphervault-theme";

const KEY_STORAGE_KEY =
    "ciphervault-saved-key";

const REMEMBER_STORAGE_KEY =
    "ciphervault-remember-key";


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

    const cleanedBase64 =
        base64
            .trim()
            .replace(
                /\s+/g,
                ""
            );


    if (

        cleanedBase64.length === 0 ||

        cleanedBase64.length % 4 !== 0 ||

        !/^[A-Za-z0-9+/]*={0,2}$/
            .test(
                cleanedBase64
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
                cleanedBase64
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
// KEY DERIVATION
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
// ENCRYPT
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


    const encryptedBuffer =
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
            encryptedBuffer
        );


    /*
        Payload:

        VERSION       1 byte
        SALT          16 bytes
        IV            12 bytes
        CIPHERTEXT    variable
        GCM TAG       included by WebCrypto
    */

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


    offset +=
        1;


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


    /*
        minimum:

        1  version
        16 salt
        12 IV
        16 authentication tag
    */

    const minimumPayloadLength =

        1 +

        SALT_LENGTH +

        IV_LENGTH +

        16;


    if (
        payload.length <
        minimumPayloadLength
    ) {

        throw new Error(
            "Invalid encrypted payload."
        );
    }


    let offset =
        0;


    // VERSION

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


    // SALT

    const salt =
        payload.slice(

            offset,

            offset +
            SALT_LENGTH
        );


    offset +=
        SALT_LENGTH;


    // IV

    const iv =
        payload.slice(

            offset,

            offset +
            IV_LENGTH
        );


    offset +=
        IV_LENGTH;


    // CIPHER

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

        const decryptedBuffer =
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
            decryptedBuffer
        );


    } catch {

        throw new Error(
            "Wrong secret key or corrupted message."
        );
    }
}


// ======================================================
// MULTI-LINE DECRYPT
// ======================================================

async function decryptLines(
    inputValue,
    passwordValue
) {

    if (
        !passwordValue
    ) {

        throw new Error(
            "Enter the secret key."
        );
    }


    /*
        Cada linha não vazia é considerada
        uma mensagem CipherVault independente.
    */

    const lines =
        inputValue
            .replace(
                /\r/g,
                ""
            )
            .split(
                "\n"
            );


    const nonEmptyCount =
        lines
            .filter(
                line =>
                    line
                        .trim()
                        .length > 0
            )
            .length;


    if (
        nonEmptyCount === 0
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


    /*
        Processamento sequencial proposital.

        Evita disparar dezenas de operações
        PBKDF2 pesadas simultaneamente.
    */

    for (
        let index = 0;
        index < lines.length;
        index++
    ) {

        const line =
            lines[index]
                .trim();


        /*
            Preserva linhas vazias
            no resultado.
        */

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


            successCount +=
                1;


        } catch (
            error
        ) {

            results.push(

                `[ERROR line ${index + 1}: ${error.message}]`

            );


            errorCount +=
                1;
        }
    }


    return {

        text:
            results.join(
                "\n"
            ),

        total:
            nonEmptyCount,

        successCount:
            successCount,

        errorCount:
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

    const savedTheme =
        localStorage.getItem(
            THEME_STORAGE_KEY
        );


    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {

        applyTheme(
            savedTheme
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
// SAVED KEY
// ======================================================

function loadSavedKey() {

    const shouldRemember =
        localStorage.getItem(
            REMEMBER_STORAGE_KEY
        ) === "true";


    rememberKey.checked =
        shouldRemember;


    if (
        !shouldRemember
    ) {

        forgetKey
            .classList
            .remove(
                "visible"
            );


        return;
    }


    const savedKey =
        localStorage.getItem(
            KEY_STORAGE_KEY
        );


    if (
        savedKey
    ) {

        password.value =
            savedKey;


        forgetKey
            .classList
            .add(
                "visible"
            );
    }
}


function saveRememberedKey() {

    if (
        !rememberKey.checked
    ) {

        return;
    }


    localStorage.setItem(
        REMEMBER_STORAGE_KEY,
        "true"
    );


    if (
        password.value
    ) {

        localStorage.setItem(

            KEY_STORAGE_KEY,

            password.value
        );


        forgetKey
            .classList
            .add(
                "visible"
            );


    } else {

        localStorage.removeItem(
            KEY_STORAGE_KEY
        );


        forgetKey
            .classList
            .remove(
                "visible"
            );
    }
}


// ======================================================
// MOBILE MODE
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


    /*
        Fallback.
    */

    const helper =
        document.createElement(
            "textarea"
        );


    helper.value =
        text;


    helper.setAttribute(
        "readonly",
        ""
    );


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
// COPY VISUAL FEEDBACK
// ======================================================

function showCopiedFeedback(
    button,
    outputElement
) {

    /*
        Evita timers duplicados
        se o usuário clicar várias vezes.
    */

    if (
        button._copyTimer
    ) {

        window.clearTimeout(
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


    /*
        Reinicia a animação do textarea.
    */

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

        /*
            Normal webpage mode.
        */

    }
}


// ======================================================
// THEME EVENT
// ======================================================

themeToggle.addEventListener(
    "click",
    () => {

        const currentTheme =
            document
                .documentElement
                .dataset
                .theme;


        const newTheme =

            currentTheme ===
            "dark"

                ? "light"

                : "dark";


        applyTheme(
            newTheme
        );


        localStorage.setItem(

            THEME_STORAGE_KEY,

            newTheme
        );
    }
);


// ======================================================
// REMEMBER KEY EVENTS
// ======================================================

rememberKey.addEventListener(
    "change",
    () => {

        if (
            rememberKey.checked
        ) {

            localStorage.setItem(

                REMEMBER_STORAGE_KEY,

                "true"
            );


            saveRememberedKey();


            setPanelStatus(

                encryptStatusContainer,

                encryptStatus,

                "success",

                "Key remembering enabled."

            );


            setPanelStatus(

                decryptStatusContainer,

                decryptStatus,

                "success",

                "Key remembering enabled."

            );


        } else {

            localStorage.removeItem(
                REMEMBER_STORAGE_KEY
            );


            localStorage.removeItem(
                KEY_STORAGE_KEY
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
    }
);


password.addEventListener(
    "input",
    saveRememberedKey
);


forgetKey.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            KEY_STORAGE_KEY
        );


        localStorage.removeItem(
            REMEMBER_STORAGE_KEY
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
// SHOW / HIDE KEY
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


        togglePassword.setAttribute(

            "aria-label",

            visible

                ? "Show password"

                : "Hide password"
        );


        password.focus();
    }
);


// ======================================================
// COUNTER EVENTS
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
// MOBILE EVENTS
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
// ENCRYPT EVENT
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


            saveRememberedKey();


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
// BULK DECRYPT EVENT
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

            "Decrypting each non-empty line."

        );


        try {

            const result =
                await decryptLines(

                    decryptInput.value,

                    password.value
                );


            decryptOutput.value =
                result.text;


            saveRememberedKey();


            /*
                Todas funcionaram.
            */

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

                /*
                    Algumas falharam,
                    mas o restante continua sendo exibido.
                */

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
// COPY EVENTS
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
// CLEAR ENCRYPT
// ======================================================

clearEncrypt.addEventListener(
    "click",
    () => {

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
);


// ======================================================
// CLEAR DECRYPT
// ======================================================

clearDecrypt.addEventListener(
    "click",
    () => {

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
);


// ======================================================
// CTRL + ENTER
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (

            !event.ctrlKey ||

            event.key !== "Enter"

        ) {

            return;
        }


        event.preventDefault();


        /*
            Se estiver escrevendo no decrypt,
            executa decrypt.

            Caso contrário executa encrypt.
        */

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
// CRYPTO CHECK
// ======================================================

function checkCryptoAvailability() {

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

            "Web Crypto API is not available in this browser."

        );


        setPanelStatus(

            decryptStatusContainer,

            decryptStatus,

            "error",

            "Web Crypto API is not available in this browser."

        );


        return false;
    }


    return true;
}


// ======================================================
// INITIALIZATION
// ======================================================

function initializeApp() {

    detectExtensionMode();

    loadTheme();

    loadSavedKey();


    /*
        Mobile / extension começa no Encrypt.
        Isso não afeta desktop, onde os dois
        permanecem visíveis.
    */

    setMobileMode(
        "encrypt"
    );


    updateEncryptCounter();

    updateDecryptCounter();

    checkCryptoAvailability();
}


initializeApp();