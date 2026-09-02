const encoder = new TextEncoder();
const decoder = new TextDecoder();

const VERSION = 1;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const PBKDF2_ITERATIONS = 300000;


// ======================================================
// DOM ELEMENTS
// ======================================================

const input =
    document.getElementById("input");

const password =
    document.getElementById("password");

const output =
    document.getElementById("output");

const status =
    document.getElementById("status");

const statusContainer =
    document.getElementById("statusContainer");

const processButton =
    document.getElementById("process");

const processText =
    document.getElementById("processText");

const processIcon =
    document.getElementById("processIcon");

const encryptModeButton =
    document.getElementById("encryptMode");

const decryptModeButton =
    document.getElementById("decryptMode");

const copyButton =
    document.getElementById("copy");

const clearButton =
    document.getElementById("clear");

const togglePassword =
    document.getElementById("togglePassword");

const inputCounter =
    document.getElementById("inputCounter");


// ======================================================
// APP STATE
// ======================================================

let currentMode = "encrypt";


// ======================================================
// BASE64 FUNCTIONS
// ======================================================

function bytesToBase64(bytes) {

    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}


function base64ToBytes(base64) {

    const cleanedBase64 =
        base64
            .trim()
            .replace(/\s+/g, "");

    /*
        Validação simples para impedir entradas
        que claramente não sejam Base64.
    */

    if (
        cleanedBase64.length === 0 ||
        cleanedBase64.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanedBase64)
    ) {
        throw new Error(
            "Invalid Base64 payload."
        );
    }

    let binary;

    try {

        binary = atob(cleanedBase64);

    } catch {

        throw new Error(
            "Invalid Base64 payload."
        );
    }

    const bytes =
        new Uint8Array(binary.length);

    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        bytes[i] =
            binary.charCodeAt(i);
    }

    return bytes;
}


// ======================================================
// PASSWORD -> AES KEY
// ======================================================

async function deriveKey(
    passwordValue,
    salt
) {

    /*
        Primeiro importamos a senha como material
        de chave para o PBKDF2.
    */

    const passwordMaterial =
        await crypto.subtle.importKey(

            "raw",

            encoder.encode(
                passwordValue
            ),

            {
                name: "PBKDF2"
            },

            false,

            [
                "deriveKey"
            ]
        );


    /*
        PBKDF2 transforma a senha fornecida
        pelo usuário em uma chave AES-256.
    */

    return crypto.subtle.deriveKey(

        {
            name: "PBKDF2",

            salt: salt,

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

    if (!message) {

        throw new Error(
            "Enter a message to encrypt."
        );
    }


    if (!passwordValue) {

        throw new Error(
            "Enter a secret key."
        );
    }


    /*
        Salt aleatório.

        Ele será utilizado pelo PBKDF2
        para derivar a chave AES.
    */

    const salt =
        crypto.getRandomValues(
            new Uint8Array(
                SALT_LENGTH
            )
        );


    /*
        IV / Nonce do AES-GCM.

        Um IV novo deve ser criado
        para cada criptografia.
    */

    const iv =
        crypto.getRandomValues(
            new Uint8Array(
                IV_LENGTH
            )
        );


    /*
        Derivamos a chave AES-256
        utilizando:

        password
        +
        salt
        +
        PBKDF2-SHA256
    */

    const key =
        await deriveKey(
            passwordValue,
            salt
        );


    /*
        Executa AES-256-GCM.

        O Web Crypto retorna:

        ciphertext
        +
        authentication tag
    */

    const encryptedBuffer =
        await crypto.subtle.encrypt(

            {
                name:
                    "AES-GCM",

                iv:
                    iv,

                tagLength:
                    128
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
        Nosso formato:

        ┌─────────┐
        │ Version │ 1 byte
        ├─────────┤
        │ Salt    │ 16 bytes
        ├─────────┤
        │ IV      │ 12 bytes
        ├─────────┤
        │ Cipher  │ variável
        │ + Tag   │
        └─────────┘
    */

    const payload =
        new Uint8Array(

            1 +

            SALT_LENGTH +

            IV_LENGTH +

            ciphertext.length
        );


    let offset = 0;


    // VERSION

    payload[offset] =
        VERSION;

    offset += 1;


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


    // CIPHERTEXT + GCM TAG

    payload.set(
        ciphertext,
        offset
    );


    /*
        Transformamos todo o payload
        binário em Base64 para facilitar:

        - copiar
        - enviar
        - armazenar
    */

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

    if (!encryptedBase64) {

        throw new Error(
            "Enter an encrypted Base64 message."
        );
    }


    if (!passwordValue) {

        throw new Error(
            "Enter the secret key."
        );
    }


    /*
        Primeiro transformamos Base64
        novamente em bytes.
    */

    const payload =
        base64ToBytes(
            encryptedBase64
        );


    /*
        Tamanho mínimo esperado:

        version = 1
        salt    = 16
        IV      = 12
        tag     = 16

        Total mínimo = 45 bytes
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


    let offset = 0;


    // ==================================================
    // VERSION
    // ==================================================

    const version =
        payload[offset];

    offset += 1;


    if (
        version !== VERSION
    ) {

        throw new Error(
            `Unsupported payload version: ${version}`
        );
    }


    // ==================================================
    // SALT
    // ==================================================

    const salt =
        payload.slice(

            offset,

            offset +
            SALT_LENGTH
        );

    offset +=
        SALT_LENGTH;


    // ==================================================
    // IV
    // ==================================================

    const iv =
        payload.slice(

            offset,

            offset +
            IV_LENGTH
        );

    offset +=
        IV_LENGTH;


    // ==================================================
    // CIPHERTEXT + TAG
    // ==================================================

    const ciphertext =
        payload.slice(
            offset
        );


    /*
        Utilizamos a senha fornecida
        pelo usuário + o mesmo salt
        armazenado dentro do payload.

        Isso recria exatamente
        a mesma chave AES.
    */

    const key =
        await deriveKey(
            passwordValue,
            salt
        );


    try {

        /*
            O AES-GCM também valida
            automaticamente a integridade.

            Se:

            - senha estiver errada
            - mensagem for alterada
            - tag for inválida
            - IV estiver errado

            decrypt() falhará.
        */

        const decryptedBuffer =
            await crypto.subtle.decrypt(

                {
                    name:
                        "AES-GCM",

                    iv:
                        iv,

                    tagLength:
                        128
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
// UI HELPERS
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
        currentMode === "encrypt"

            ? "DERIVING KEY AND ENCRYPTING"

            : "VERIFYING AND DECRYPTING";
}


function setSuccessStatus() {

    statusContainer.className =
        "status-container success";

    status.textContent =
        currentMode === "encrypt"

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


// ======================================================
// MODE: ENCRYPT
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


// ======================================================
// MODE: DECRYPT
// ======================================================

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
// MODE BUTTON EVENTS
// ======================================================

encryptModeButton.addEventListener(
    "click",
    () => {

        activateEncryptMode();
    }
);


decryptModeButton.addEventListener(
    "click",
    () => {

        activateDecryptMode();
    }
);


// ======================================================
// CHARACTER COUNTER
// ======================================================

input.addEventListener(
    "input",
    () => {

        const characterCount =
            input.value.length;


        inputCounter.textContent =
            `${characterCount} ${
                characterCount === 1
                    ? "char"
                    : "chars"
            }`;
    }
);


// ======================================================
// PROCESS BUTTON
// ======================================================

processButton.addEventListener(
    "click",
    async () => {

        /*
            Impede clique repetido enquanto
            uma operação estiver rodando.
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
            currentMode === "encrypt"

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
                currentMode === "encrypt"

                    ? "ENCRYPTED"

                    : "DECRYPTED";


            /*
                Depois da animação,
                retorna o botão
                para o estado normal.
            */

            setTimeout(
                () => {

                    processButton
                        .classList
                        .remove(
                            "success"
                        );


                    processIcon.textContent =
                        currentMode === "encrypt"

                            ? "◇"

                            : "◆";


                    processText.textContent =
                        currentMode === "encrypt"

                            ? "ENCRYPT MESSAGE"

                            : "DECRYPT MESSAGE";

                },

                800
            );

        } catch (error) {

            processButton
                .classList
                .remove(
                    "processing"
                );


            processButton
                .classList
                .remove(
                    "success"
                );


            processIcon.textContent =
                "×";


            processText.textContent =
                currentMode === "encrypt"

                    ? "ENCRYPT MESSAGE"

                    : "DECRYPT MESSAGE";


            setErrorStatus(
                error.message
            );
        }
    }
);


// ======================================================
// COPY OUTPUT
// ======================================================

copyButton.addEventListener(
    "click",
    async () => {

        if (!output.value) {

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


            statusContainer.className =
                "status-container success";


            status.textContent =
                "COPIED TO CLIPBOARD";


        } catch {

            /*
                Fallback para navegadores
                onde Clipboard API falhe.
            */

            output.select();


            document.execCommand(
                "copy"
            );


            statusContainer.className =
                "status-container success";


            status.textContent =
                "COPIED TO CLIPBOARD";
        }
    }
);


// ======================================================
// CLEAR EVERYTHING
// ======================================================

clearButton.addEventListener(
    "click",
    () => {

        input.value =
            "";

        password.value =
            "";

        output.value =
            "";


        inputCounter.textContent =
            "0 chars";


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
            currentMode === "encrypt"

                ? "◇"

                : "◆";


        processText.textContent =
            currentMode === "encrypt"

                ? "ENCRYPT MESSAGE"

                : "DECRYPT MESSAGE";


        setReadyStatus();


        input.focus();
    }
);


// ======================================================
// SHOW / HIDE PASSWORD
// ======================================================

togglePassword.addEventListener(
    "click",
    () => {

        const passwordVisible =
            password.type ===
            "text";


        if (passwordVisible) {

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
// KEYBOARD SHORTCUT
// CTRL + ENTER
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            processButton.click();
        }
    }
);


// ======================================================
// SECURITY / ENVIRONMENT CHECK
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

    checkCryptoAvailability();


    activateEncryptMode();


    inputCounter.textContent =
        "0 chars";


    console.log(
        "%cCipherVault",
        "color: #54ffc2; font-size: 18px; font-weight: bold;"
    );


    console.log(
        "Cryptographic operations are performed locally using the Web Crypto API."
    );
}


initializeApp();