// ======================================================
// CIPHERVAULT
// ======================================================


// ======================================================
// CRYPTO CONFIGURATION
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
// LOCAL STORAGE KEYS
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


const input =
    document.getElementById(
        "input"
    );


const password =
    document.getElementById(
        "password"
    );


const output =
    document.getElementById(
        "output"
    );


const status =
    document.getElementById(
        "status"
    );


const statusContainer =
    document.getElementById(
        "statusContainer"
    );


const processButton =
    document.getElementById(
        "process"
    );


const processText =
    document.getElementById(
        "processText"
    );


const processIcon =
    document.getElementById(
        "processIcon"
    );


const encryptModeButton =
    document.getElementById(
        "encryptMode"
    );


const decryptModeButton =
    document.getElementById(
        "decryptMode"
    );


const modeSwitch =
    document.getElementById(
        "modeSwitch"
    );


const copyButton =
    document.getElementById(
        "copy"
    );


const clearButton =
    document.getElementById(
        "clear"
    );


const togglePassword =
    document.getElementById(
        "togglePassword"
    );


const inputCounter =
    document.getElementById(
        "inputCounter"
    );


const themeToggle =
    document.getElementById(
        "themeToggle"
    );


const themeIcon =
    document.getElementById(
        "themeIcon"
    );


const rememberKey =
    document.getElementById(
        "rememberKey"
    );


const forgetKey =
    document.getElementById(
        "forgetKey"
    );



// ======================================================
// APPLICATION STATE
// ======================================================


let currentMode =
    "encrypt";



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
        cleanedBase64.length === 0
    ) {

        throw new Error(
            "Invalid Base64 payload."
        );
    }


    /*
        Base64 should normally have
        a length divisible by 4.
    */

    if (
        cleanedBase64.length % 4 !== 0
    ) {

        throw new Error(
            "Invalid Base64 payload."
        );
    }


    /*
        Only allow standard Base64
        characters.
    */

    if (
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

    /*
        Import the user's password
        as PBKDF2 key material.
    */

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


    /*
        Derive a 256-bit AES key
        using PBKDF2-SHA256.
    */

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
// ENCRYPTION
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



    /*
        Generate a new random salt
        for every encryption.
    */

    const salt =
        crypto.getRandomValues(

            new Uint8Array(
                SALT_LENGTH
            )
        );



    /*
        AES-GCM recommends a
        96-bit / 12-byte IV.
    */

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



    /*
        AES-GCM encrypts and also
        generates an authentication tag.
    */

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
        CipherVault payload format:

        [ VERSION ]
        1 byte

        [ SALT ]
        16 bytes

        [ IV ]
        12 bytes

        [ CIPHERTEXT + GCM TAG ]
        variable
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



    // VERSION

    payload[offset] =
        VERSION;


    offset +=
        1;



    // SALT

    payload.set(
        salt,
        offset
    );


    offset +=
        SALT_LENGTH;



    // IV

    payload.set(
        iv,
        offset
    );


    offset +=
        IV_LENGTH;



    // CIPHERTEXT + TAG

    payload.set(
        ciphertext,
        offset
    );



    return bytesToBase64(
        payload
    );
}



// ======================================================
// DECRYPTION
// ======================================================


async function decryptMessage(
    encryptedBase64,
    passwordValue
) {

    if (
        !encryptedBase64
    ) {

        throw new Error(
            "Enter an encrypted Base64 message."
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
        Minimum:

        version = 1
        salt = 16
        iv = 12
        GCM tag = 16

        45 bytes minimum.
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



    // CIPHERTEXT + TAG

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

        /*
            AES-GCM authentication means
            this will fail if:

            - password is wrong
            - ciphertext changed
            - IV changed
            - tag changed
        */

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
// STATUS FUNCTIONS
// ======================================================


function setReadyStatus() {

    statusContainer.className =
        "status-container";


    status.textContent =
        "READY";
}



function setProcessingStatus() {

    statusContainer.className =
        "status-container processing";


    status.textContent =

        currentMode ===
        "encrypt"

            ? "DERIVING KEY AND ENCRYPTING"

            : "VERIFYING AND DECRYPTING";
}



function setSuccessStatus() {

    statusContainer.className =
        "status-container success";


    status.textContent =

        currentMode ===
        "encrypt"

            ? "ENCRYPTION COMPLETE"

            : "DECRYPTION COMPLETE";
}



function setErrorStatus(
    message
) {

    statusContainer.className =
        "status-container error";


    status.textContent =
        message.toUpperCase();
}



function setCustomSuccessStatus(
    message
) {

    statusContainer.className =
        "status-container success";


    status.textContent =
        message.toUpperCase();
}



// ======================================================
// MODE
// ======================================================


function activateEncryptMode() {

    currentMode =
        "encrypt";


    encryptModeButton
        .classList
        .add(
            "active"
        );


    decryptModeButton
        .classList
        .remove(
            "active"
        );


    modeSwitch
        .classList
        .remove(
            "decrypt"
        );


    processText.textContent =
        "ENCRYPT MESSAGE";


    processIcon.textContent =
        "◇";


    input.placeholder =
        "Enter message to encrypt...";


    output.placeholder =
        "Encrypted Base64 output will appear here...";


    output.value =
        "";


    setReadyStatus();
}



function activateDecryptMode() {

    currentMode =
        "decrypt";


    decryptModeButton
        .classList
        .add(
            "active"
        );


    encryptModeButton
        .classList
        .remove(
            "active"
        );


    modeSwitch
        .classList
        .add(
            "decrypt"
        );


    processText.textContent =
        "DECRYPT MESSAGE";


    processIcon.textContent =
        "◆";


    input.placeholder =
        "Paste encrypted Base64 payload...";


    output.placeholder =
        "Decrypted message will appear here...";


    output.value =
        "";


    setReadyStatus();
}



// ======================================================
// MODE EVENTS
// ======================================================


encryptModeButton.addEventListener(
    "click",
    activateEncryptMode
);



decryptModeButton.addEventListener(
    "click",
    activateDecryptMode
);



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


    if (
        theme ===
        "dark"
    ) {

        themeIcon.textContent =
            "☾";

    } else {

        themeIcon.textContent =
            "☀";
    }
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



    /*
        If user never selected a theme,
        follow the operating system.
    */

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
// REMEMBER KEY
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


            setCustomSuccessStatus(
                "KEY REMEMBERING ENABLED"
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


            setCustomSuccessStatus(
                "SAVED KEY REMOVED"
            );
        }
    }
);



password.addEventListener(
    "input",
    () => {

        if (
            rememberKey.checked
        ) {

            saveRememberedKey();
        }
    }
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


        setCustomSuccessStatus(
            "SAVED KEY FORGOTTEN"
        );


        password.focus();
    }
);



// ======================================================
// CHARACTER COUNTER
// ======================================================


input.addEventListener(
    "input",
    () => {

        const count =
            input.value.length;


        inputCounter.textContent =
            `${count} ${
                count === 1
                    ? "char"
                    : "chars"
            }`;
    }
);



// ======================================================
// SHOW / HIDE PASSWORD
// ======================================================


togglePassword.addEventListener(
    "click",
    () => {

        const isVisible =
            password.type ===
            "text";



        if (
            isVisible
        ) {

            password.type =
                "password";


            togglePassword.textContent =
                "◉";


            togglePassword.setAttribute(
                "aria-label",
                "Show password"
            );


        } else {

            password.type =
                "text";


            togglePassword.textContent =
                "◎";


            togglePassword.setAttribute(
                "aria-label",
                "Hide password"
            );
        }


        password.focus();
    }
);



// ======================================================
// PROCESS
// ======================================================


processButton.addEventListener(
    "click",
    async () => {

        /*
            Ignore repeated clicks while
            crypto operation is running.
        */

        if (
            processButton
                .classList
                .contains(
                    "processing"
                )
        ) {

            return;
        }



        output.value =
            "";



        setProcessingStatus();



        processButton
            .classList
            .add(
                "processing"
            );



        processIcon.textContent =
            "◌";



        processText.textContent =

            currentMode ===
            "encrypt"

                ? "ENCRYPTING..."

                : "DECRYPTING...";



        try {

            let result;



            if (
                currentMode ===
                "encrypt"
            ) {

                result =
                    await encryptMessage(

                        input.value,

                        password.value
                    );


            } else {

                result =
                    await decryptMessage(

                        input.value,

                        password.value
                    );
            }



            output.value =
                result;



            /*
                If remember key is enabled,
                make sure current value is saved.
            */

            saveRememberedKey();



            setSuccessStatus();



            processButton
                .classList
                .remove(
                    "processing"
                );



            processButton
                .classList
                .add(
                    "success"
                );



            processIcon.textContent =
                "✓";



            processText.textContent =

                currentMode ===
                "encrypt"

                    ? "ENCRYPTED"

                    : "DECRYPTED";



            setTimeout(
                () => {

                    processButton
                        .classList
                        .remove(
                            "success"
                        );


                    processIcon.textContent =

                        currentMode ===
                        "encrypt"

                            ? "◇"

                            : "◆";


                    processText.textContent =

                        currentMode ===
                        "encrypt"

                            ? "ENCRYPT MESSAGE"

                            : "DECRYPT MESSAGE";

                },

                800
            );


        } catch (
            error
        ) {

            processButton
                .classList
                .remove(
                    "processing",
                    "success"
                );


            processIcon.textContent =
                "×";


            processText.textContent =

                currentMode ===
                "encrypt"

                    ? "ENCRYPT MESSAGE"

                    : "DECRYPT MESSAGE";


            setErrorStatus(
                error.message
            );
        }
    }
);



// ======================================================
// COPY
// ======================================================


copyButton.addEventListener(
    "click",
    async () => {

        if (
            !output.value
        ) {

            setErrorStatus(
                "Nothing to copy."
            );

            return;
        }



        try {

            await navigator
                .clipboard
                .writeText(
                    output.value
                );


            setCustomSuccessStatus(
                "COPIED TO CLIPBOARD"
            );


        } catch {

            /*
                Compatibility fallback.
            */

            output.focus();


            output.select();



            try {

                document.execCommand(
                    "copy"
                );


                setCustomSuccessStatus(
                    "COPIED TO CLIPBOARD"
                );


            } catch {

                setErrorStatus(
                    "Could not copy to clipboard."
                );
            }
        }
    }
);



// ======================================================
// CLEAR
// ======================================================


clearButton.addEventListener(
    "click",
    () => {

        input.value =
            "";


        output.value =
            "";


        inputCounter.textContent =
            "0 chars";



        /*
            If the user explicitly chose
            to remember the key, Clear
            keeps it available.

            Otherwise it is erased from
            the input field.
        */

        if (
            !rememberKey.checked
        ) {

            password.value =
                "";
        }



        password.type =
            "password";


        togglePassword.textContent =
            "◉";


        togglePassword.setAttribute(
            "aria-label",
            "Show password"
        );



        processButton
            .classList
            .remove(
                "processing",
                "success"
            );



        processIcon.textContent =

            currentMode ===
            "encrypt"

                ? "◇"

                : "◆";



        processText.textContent =

            currentMode ===
            "encrypt"

                ? "ENCRYPT MESSAGE"

                : "DECRYPT MESSAGE";



        setReadyStatus();


        input.focus();
    }
);



// ======================================================
// KEYBOARD SHORTCUT
// ======================================================


document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key ===
            "Enter"
        ) {

            event.preventDefault();


            processButton.click();
        }
    }
);



// ======================================================
// WEB CRYPTO CHECK
// ======================================================


function checkCryptoAvailability() {

    if (
        !window.crypto ||
        !window.crypto.subtle
    ) {

        setErrorStatus(
            "Web Crypto API is not available in this browser."
        );


        processButton.disabled =
            true;


        return false;
    }


    return true;
}



// ======================================================
// INITIALIZATION
// ======================================================


function initializeApp() {

    /*
        Theme first so the interface
        does not visibly flash.
    */

    loadTheme();



    activateEncryptMode();



    loadSavedKey();



    inputCounter.textContent =
        "0 chars";



    checkCryptoAvailability();



    console.log(
        "%cCipherVault",
        "color: #54ffc2; font-size: 18px; font-weight: bold;"
    );


    console.log(
        "Cryptographic operations are performed locally using the Web Crypto API."
    );


    console.log(
        "Warning: a remembered key is stored in browser localStorage and can be inspected by JavaScript running under the same origin."
    );
}



initializeApp();
