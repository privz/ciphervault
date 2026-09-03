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
// APPLICATION STORAGE
// ======================================================

const THEME_STORAGE_KEY =
    "ciphervault-theme";

const ACTIVE_PROFILE_STORAGE_KEY =
    "ciphervault-active-profile";


// Previous versions

const LEGACY_KEY_STORAGE_KEY =
    "ciphervault-saved-key";

const LEGACY_REMEMBER_STORAGE_KEY =
    "ciphervault-remember-key";


// ======================================================
// INDEXEDDB
// ======================================================

const DB_NAME =
    "ciphervault-local-vault";

const DB_VERSION =
    1;

const DB_STORE =
    "secure-storage";

const IDB_DEVICE_KEY =
    "device-wrapping-key";

const IDB_PROFILES =
    "profiles-v2";

const LEGACY_IDB_SECRET =
    "saved-secret";

const LEGACY_IDB_REMEMBER =
    "remember-secret";

let databasePromise =
    null;


// ======================================================
// ALTERNATE DISPLAY ROUTE
// ======================================================

/*
    SHA-256 of the default alternate access key.

    The literal key is intentionally not stored as a
    plaintext string in this source file.

    This is NOT cryptographic plausible deniability.
*/

const ALTERNATE_ROUTE_HASH =
    "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";


// ======================================================
// COVER CONVERSATIONS
// ======================================================

const COVER_THREADS = [

    [
        "Você conseguiu revisar o arquivo?",
        "Sim, terminei hoje de manhã.",
        "Tinha alguma coisa para alterar?",
        "Só alguns detalhes pequenos.",
        "Beleza, consegue me mandar depois?",
        "Consigo sim.",
        "Vou conferir quando chegar em casa.",
        "Tranquilo, sem pressa.",
        "Acho que amanhã já fica resolvido.",
        "Perfeito, qualquer coisa me avisa.",
        "Pode deixar.",
        "Valeu!"
    ],

    [
        "Que horas você acha que chega?",
        "Provavelmente por volta das sete.",
        "Beleza, eu ainda vou estar por aqui.",
        "Se eu atrasar eu te aviso.",
        "Tranquilo.",
        "Você vai de trem?",
        "Sim, acho que é mais fácil.",
        "Então deve estar tranquilo nesse horário.",
        "Espero que sim.",
        "Depois me manda mensagem.",
        "Pode deixar.",
        "Até mais!"
    ],

    [
        "Você conseguiu comprar aquilo?",
        "Ainda não, vou passar lá amanhã.",
        "Sem problema.",
        "Você sabe até que horas fica aberto?",
        "Acho que fecha às oito.",
        "Então dá tempo.",
        "Sim, vou depois do trabalho.",
        "Se não tiver eu vejo em outro lugar.",
        "Beleza.",
        "Quer que eu procure também?",
        "Não precisa, tranquilo.",
        "Fechado."
    ],

    [
        "Vai almoçar por aí hoje?",
        "Acho que sim.",
        "Já sabe onde?",
        "Ainda não, talvez naquele lugar de sempre.",
        "Faz tempo que eu não vou lá.",
        "Eu também.",
        "Se não estiver cheio pode ser.",
        "Normalmente nesse horário é tranquilo.",
        "Então fechou.",
        "Te aviso quando estiver saindo.",
        "Beleza.",
        "Até daqui a pouco."
    ],

    [
        "A reunião continua no mesmo horário?",
        "Sim, não mudaram nada.",
        "Beleza, achei que tinham alterado.",
        "Até agora continua igual.",
        "Você já terminou sua parte?",
        "Quase, falta revisar uma coisa.",
        "Eu também preciso conferir a minha.",
        "Acho que dá tempo tranquilo.",
        "Sim.",
        "Depois a gente compara antes de enviar.",
        "Boa ideia.",
        "Fechado."
    ],

    [
        "Conseguiu resolver aquele negócio?",
        "Mais ou menos.",
        "O que aconteceu?",
        "Faltou uma informação que eu não tinha.",
        "Ah, entendi.",
        "Vou tentar descobrir.",
        "Se conseguir me manda.",
        "Pode deixar.",
        "Acho que amanhã já dá para finalizar.",
        "Ótimo.",
        "Depois me fala como ficou.",
        "Falo sim."
    ],

    [
        "Você vai fazer alguma coisa no fim de semana?",
        "Ainda não decidi.",
        "Eu também estou sem planos.",
        "Talvez eu saia no sábado.",
        "Se o tempo estiver bom vale a pena.",
        "Sim, estava pensando nisso.",
        "Depois vê e me fala.",
        "Pode deixar.",
        "Se não der a gente marca outro dia.",
        "Tranquilo.",
        "Sem pressa.",
        "Fechado."
    ],

    [
        "Você recebeu minha mensagem de ontem?",
        "Recebi sim.",
        "Achei que não tinha chegado.",
        "Eu vi mais tarde.",
        "Ah, tranquilo.",
        "Eu estava ocupado e acabei não respondendo.",
        "Sem problema.",
        "Depois a gente conversa com calma.",
        "Pode ser.",
        "Hoje estou mais tranquilo.",
        "Então te chamo depois.",
        "Beleza."
    ]

];


// ======================================================
// DOM
// ======================================================

const profileSelect =
    document.getElementById(
        "profileSelect"
    );

const addProfile =
    document.getElementById(
        "addProfile"
    );

const manageProfiles =
    document.getElementById(
        "manageProfiles"
    );

const profileNotice =
    document.getElementById(
        "profileNotice"
    );

const profileStorageHint =
    document.getElementById(
        "profileStorageHint"
    );

const password =
    document.getElementById(
        "password"
    );

const togglePassword =
    document.getElementById(
        "togglePassword"
    );

const keySourceHint =
    document.getElementById(
        "keySourceHint"
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


// Profile form modal

const profileModal =
    document.getElementById(
        "profileModal"
    );

const profileModalTitle =
    document.getElementById(
        "profileModalTitle"
    );

const profileForm =
    document.getElementById(
        "profileForm"
    );

const profileName =
    document.getElementById(
        "profileName"
    );

const profileSecret =
    document.getElementById(
        "profileSecret"
    );

const toggleProfileSecret =
    document.getElementById(
        "toggleProfileSecret"
    );

const profileFormError =
    document.getElementById(
        "profileFormError"
    );

const cancelProfile =
    document.getElementById(
        "cancelProfile"
    );


// Manage modal

const manageModal =
    document.getElementById(
        "manageModal"
    );

const profilesList =
    document.getElementById(
        "profilesList"
    );

const closeManage =
    document.getElementById(
        "closeManage"
    );


// Confirmation

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

const cancelConfirm =
    document.getElementById(
        "cancelConfirm"
    );

const acceptConfirm =
    document.getElementById(
        "acceptConfirm"
    );


// Eject

const ejectButton =
    document.getElementById(
        "ejectButton"
    );

const ejectOverlay =
    document.getElementById(
        "ejectOverlay"
    );


// ======================================================
// APPLICATION STATE
// ======================================================

let profiles =
    [];

let activeProfileId =
    "";

let temporarySecret =
    "";

let editingProfileId =
    null;

let pendingConfirmation =
    null;

let ejectTimer =
    null;

let ejectTriggered =
    false;


// ======================================================
// INDEXEDDB
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


            const request =
                transaction
                    .objectStore(
                        DB_STORE
                    )
                    .get(
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


            transaction
                .objectStore(
                    DB_STORE
                )
                .put(
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
// LOCAL WRAPPING KEY
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
// SECURE OBJECT STORAGE
// ======================================================

async function storeSecureObject(
    recordName,
    value
) {

    const key =
        await getOrCreateDeviceKey();


    const iv =
        crypto.getRandomValues(
            new Uint8Array(
                12
            )
        );


    const plaintext =
        encoder.encode(
            JSON.stringify(
                value
            )
        );


    const ciphertext =
        await crypto.subtle.encrypt(

            {
                name:
                    "AES-GCM",

                iv:
                    iv
            },

            key,

            plaintext
        );


    await idbSet(

        recordName,

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
                        ciphertext
                    )
                )
        }
    );
}


async function readSecureObject(
    recordName
) {

    const record =
        await idbGet(
            recordName
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
            "Unsupported secure storage format."
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
            "Local wrapping key is unavailable."
        );
    }


    const plaintext =
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


    return JSON.parse(
        decoder.decode(
            plaintext
        )
    );
}


// ======================================================
// OLD SAVED SECRET SUPPORT
// ======================================================

async function readLegacyIndexedSecret() {

    const record =
        await idbGet(
            LEGACY_IDB_SECRET
        );


    if (
        !record
    ) {

        return null;
    }


    const key =
        await idbGet(
            IDB_DEVICE_KEY
        );


    if (
        !key
    ) {

        return null;
    }


    try {

        const plaintext =
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
            plaintext
        );


    } catch {

        return null;
    }
}


// ======================================================
// PROFILE STORAGE
// ======================================================

async function persistProfiles() {

    await storeSecureObject(
        IDB_PROFILES,
        profiles
    );
}


async function loadProfiles() {

    const saved =
        await readSecureObject(
            IDB_PROFILES
        );


    if (
        Array.isArray(
            saved
        )
    ) {

        profiles =
            saved;

    } else {

        profiles =
            [];
    }
}


// ======================================================
// LEGACY MIGRATION
// ======================================================

async function migrateLegacyData() {

    if (
        profiles.length > 0
    ) {

        localStorage.removeItem(
            LEGACY_KEY_STORAGE_KEY
        );

        localStorage.removeItem(
            LEGACY_REMEMBER_STORAGE_KEY
        );

        return;
    }


    let oldSecret =
        null;


    const plaintextLegacy =
        localStorage.getItem(
            LEGACY_KEY_STORAGE_KEY
        );


    if (
        plaintextLegacy
    ) {

        oldSecret =
            plaintextLegacy;

    } else {

        oldSecret =
            await readLegacyIndexedSecret();
    }


    if (
        oldSecret
    ) {

        profiles.push(
            {
                id:
                    createId(),

                name:
                    "Default",

                secretKey:
                    oldSecret
            }
        );


        await persistProfiles();
    }


    localStorage.removeItem(
        LEGACY_KEY_STORAGE_KEY
    );


    localStorage.removeItem(
        LEGACY_REMEMBER_STORAGE_KEY
    );


    await idbDelete(
        LEGACY_IDB_SECRET
    );


    await idbDelete(
        LEGACY_IDB_REMEMBER
    );
}


// ======================================================
// HASH
// ======================================================

async function sha256Bytes(
    text
) {

    const buffer =
        await crypto.subtle.digest(

            "SHA-256",

            encoder.encode(
                text
            )
        );


    return new Uint8Array(
        buffer
    );
}


async function sha256Hex(
    text
) {

    const bytes =
        await sha256Bytes(
            text
        );


    return Array
        .from(
            bytes
        )
        .map(
            byte =>
                byte
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join(
            ""
        );
}


async function usesAlternateRoute(
    secret
) {

    if (
        !secret
    ) {

        return false;
    }


    return (
        await sha256Hex(
            secret
        )
    ) ===
        ALTERNATE_ROUTE_HASH;
}


// ======================================================
// COVER OUTPUT
// ======================================================

async function createCoverTranscript(
    inputValue
) {

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
        lines
            .filter(
                line =>
                    line
                        .trim()
                        .length > 0
            )
            .length;


    if (
        total === 0
    ) {

        throw new Error(
            "Enter at least one encrypted message."
        );
    }


    const seed =
        await sha256Bytes(
            lines.join(
                "\n"
            )
        );


    const initialThread =
        seed[0] %
        COVER_THREADS.length;


    const initialOffset =
        seed[1] %
        COVER_THREADS[
            initialThread
        ].length;


    const output =
        [];


    let messageNumber =
        0;


    for (
        const originalLine
        of lines
    ) {

        if (
            !originalLine.trim()
        ) {

            output.push(
                ""
            );

            continue;
        }


        const absolutePosition =
            initialOffset +
            messageNumber;


        const threadAdvance =
            Math.floor(
                absolutePosition /
                COVER_THREADS[
                    initialThread
                ].length
            );


        const threadIndex =

            (
                initialThread +
                threadAdvance
            ) %

            COVER_THREADS.length;


        const thread =
            COVER_THREADS[
                threadIndex
            ];


        const lineIndex =
            absolutePosition %
            thread.length;


        output.push(
            thread[
                lineIndex
            ]
        );


        messageNumber +=
            1;
    }


    return {

        text:
            output.join(
                "\n"
            ),

        total:
            total,

        successCount:
            total,

        errorCount:
            0
    };
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
// MESSAGE KEY
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


    if (
        await usesAlternateRoute(
            passwordValue
        )
    ) {

        throw new Error(
            "This key is reserved and cannot encrypt messages."
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
// SINGLE DECRYPT
// ======================================================

async function decryptMessage(
    encryptedBase64,
    passwordValue
) {

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
// MULTI DECRYPT
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


    if (
        await usesAlternateRoute(
            passwordValue
        )
    ) {

        return createCoverTranscript(
            inputValue
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


        processed +=
            1;


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
// PROFILE HELPERS
// ======================================================

function createId() {

    if (
        crypto.randomUUID
    ) {

        return crypto.randomUUID();
    }


    const bytes =
        crypto.getRandomValues(
            new Uint8Array(
                16
            )
        );


    return Array
        .from(
            bytes
        )
        .map(
            value =>
                value
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join(
            ""
        );
}


function getProfile(
    id
) {

    return profiles.find(
        profile =>
            profile.id === id
    ) || null;
}


function updateManageButton() {

    manageProfiles.disabled =
        profiles.length === 0;
}


function refreshProfileSelect(
    selectedId =
        activeProfileId
) {

    profileSelect.innerHTML =
        "";


    const temporaryOption =
        document.createElement(
            "option"
        );


    temporaryOption.value =
        "";


    temporaryOption.textContent =
        "Temporary Session";


    profileSelect.appendChild(
        temporaryOption
    );


    const sorted =
        [...profiles]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.name.localeCompare(
                        b.name
                    )
            );


    for (
        const profile
        of sorted
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            profile.id;


        option.textContent =
            profile.name;


        profileSelect.appendChild(
            option
        );
    }


    if (
        selectedId &&
        getProfile(
            selectedId
        )
    ) {

        profileSelect.value =
            selectedId;

    } else {

        profileSelect.value =
            "";
    }


    updateManageButton();
}


function updateKeySourceHint() {

    const profile =
        getProfile(
            activeProfileId
        );


    if (
        !profile
    ) {

        keySourceHint.textContent =
            "TEMPORARY KEY";

        profileStorageHint.textContent =
            "NOT STORED";

        profileNotice.textContent =
            "Temporary sessions are not stored.";

        return;
    }


    if (
        password.value ===
        profile.secretKey
    ) {

        keySourceHint.textContent =
            "PROFILE KEY • STORED LOCALLY";

    } else {

        keySourceHint.textContent =
            "SESSION OVERRIDE • PROFILE UNCHANGED";
    }


    profileStorageHint.textContent =
        "ENCRYPTED LOCAL PROFILE";


    profileNotice.textContent =
        `Active profile: ${profile.name}`;
}


function activateProfile(
    profileId
) {

    if (
        !activeProfileId
    ) {

        temporarySecret =
            password.value;
    }


    activeProfileId =
        profileId;


    if (
        !profileId
    ) {

        password.value =
            temporarySecret;


        localStorage.removeItem(
            ACTIVE_PROFILE_STORAGE_KEY
        );


        updateKeySourceHint();

        return;
    }


    const profile =
        getProfile(
            profileId
        );


    if (
        !profile
    ) {

        activeProfileId =
            "";

        profileSelect.value =
            "";

        password.value =
            temporarySecret;

        localStorage.removeItem(
            ACTIVE_PROFILE_STORAGE_KEY
        );

        updateKeySourceHint();

        return;
    }


    password.value =
        profile.secretKey;


    localStorage.setItem(
        ACTIVE_PROFILE_STORAGE_KEY,
        profile.id
    );


    updateKeySourceHint();
}


// ======================================================
// PROFILE MODAL
// ======================================================

function openModal(
    modal
) {

    modal.hidden =
        false;


    requestAnimationFrame(
        () => {

            modal.classList.add(
                "visible"
            );
        }
    );
}


function closeModal(
    modal
) {

    modal.classList.remove(
        "visible"
    );


    window.setTimeout(
        () => {

            modal.hidden =
                true;

        },

        180
    );
}


function openProfileForm(
    profile =
        null
) {

    editingProfileId =
        profile
            ? profile.id
            : null;


    profileModalTitle.textContent =
        profile
            ? "Edit Profile"
            : "New Profile";


    profileName.value =
        profile
            ? profile.name
            : "";


    profileSecret.value =
        profile
            ? profile.secretKey
            : "";


    profileSecret.type =
        "password";


    toggleProfileSecret.textContent =
        "◉";


    profileFormError.textContent =
        "";


    openModal(
        profileModal
    );


    window.setTimeout(
        () => {

            profileName.focus();

        },

        50
    );
}


function renderProfilesList() {

    profilesList.innerHTML =
        "";


    if (
        profiles.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "empty-profiles";


        empty.textContent =
            "No saved profiles.";


        profilesList.appendChild(
            empty
        );


        return;
    }


    const sorted =
        [...profiles]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.name.localeCompare(
                        b.name
                    )
            );


    for (
        const profile
        of sorted
    ) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "profile-list-item";


        const info =
            document.createElement(
                "div"
            );


        info.className =
            "profile-list-info";


        const title =
            document.createElement(
                "strong"
            );


        title.textContent =
            profile.name;


        const status =
            document.createElement(
                "span"
            );


        status.textContent =
            profile.id === activeProfileId
                ? "ACTIVE PROFILE"
                : "SECRET CONFIGURED";


        info.append(
            title,
            status
        );


        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "profile-list-actions";


        const editButton =
            document.createElement(
                "button"
            );


        editButton.className =
            "profile-mini-button";


        editButton.type =
            "button";


        editButton.textContent =
            "EDIT";


        editButton.addEventListener(
            "click",
            () => {

                closeModal(
                    manageModal
                );


                window.setTimeout(
                    () => {

                        openProfileForm(
                            profile
                        );

                    },

                    190
                );
            }
        );


        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.className =
            "profile-mini-button delete";


        deleteButton.type =
            "button";


        deleteButton.textContent =
            "DELETE";


        deleteButton.addEventListener(
            "click",
            () => {

                openConfirmation(

                    `Delete ${profile.name}?`,

                    "This permanently removes the locally stored profile and its secret key.",

                    "DELETE",

                    async () => {

                        profiles =
                            profiles.filter(
                                item =>
                                    item.id !==
                                    profile.id
                            );


                        if (
                            activeProfileId ===
                            profile.id
                        ) {

                            activeProfileId =
                                "";

                            password.value =
                                temporarySecret;

                            localStorage.removeItem(
                                ACTIVE_PROFILE_STORAGE_KEY
                            );
                        }


                        await persistProfiles();


                        refreshProfileSelect(
                            activeProfileId
                        );


                        renderProfilesList();


                        updateKeySourceHint();
                    }
                );
            }
        );


        actions.append(
            editButton,
            deleteButton
        );


        item.append(
            info,
            actions
        );


        profilesList.appendChild(
            item
        );
    }
}


// ======================================================
// CONFIRMATION
// ======================================================

function openConfirmation(
    title,
    message,
    actionLabel,
    callback
) {

    pendingConfirmation =
        callback;


    confirmTitle.textContent =
        title;


    confirmMessage.textContent =
        message;


    acceptConfirm.textContent =
        actionLabel;


    openModal(
        confirmModal
    );


    window.setTimeout(
        () => {

            cancelConfirm.focus();

        },

        50
    );
}


function closeConfirmation() {

    pendingConfirmation =
        null;


    closeModal(
        confirmModal
    );
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

        container.classList.add(
            type
        );
    }


    textElement.textContent =
        message.toUpperCase();
}


// ======================================================
// BUTTON STATE
// ======================================================

function setButtonProcessing(
    button,
    textElement,
    iconElement,
    message
) {

    button.classList.remove(
        "success"
    );


    button.classList.add(
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

    button.classList.remove(
        "processing"
    );


    button.classList.add(
        "success"
    );


    iconElement.textContent =
        "✓";


    textElement.textContent =
        successText;


    window.setTimeout(
        () => {

            button.classList.remove(
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

    button.classList.remove(
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
                    line.trim().length > 0
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
// MOBILE
// ======================================================

function setMobileMode(
    mode
) {

    const encryptActive =
        mode === "encrypt";


    encryptPanel.classList.toggle(
        "active-mobile",
        encryptActive
    );


    decryptPanel.classList.toggle(
        "active-mobile",
        !encryptActive
    );


    mobileEncrypt.classList.toggle(
        "active",
        encryptActive
    );


    mobileDecrypt.classList.toggle(
        "active",
        !encryptActive
    );
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


function showCopiedFeedback(
    button,
    output
) {

    if (
        button._copyTimer
    ) {

        clearTimeout(
            button._copyTimer
        );
    }


    button.classList.add(
        "copied"
    );


    button.textContent =
        "✓ COPIED";


    output.classList.remove(
        "copy-flash"
    );


    void output.offsetWidth;


    output.classList.add(
        "copy-flash"
    );


    button._copyTimer =
        window.setTimeout(
            () => {

                button.classList.remove(
                    "copied"
                );


                button.textContent =
                    "COPY";


                output.classList.remove(
                    "copy-flash"
                );

            },

            1300
        );
}


async function copyOutput(
    button,
    output,
    statusContainer,
    statusElement
) {

    if (
        !output.value
    ) {

        setPanelStatus(

            statusContainer,

            statusElement,

            "error",

            "Nothing to copy."

        );


        return;
    }


    try {

        await writeClipboard(
            output.value
        );


        showCopiedFeedback(
            button,
            output
        );


        setPanelStatus(

            statusContainer,

            statusElement,

            "success",

            "Copied to clipboard."

        );


    } catch (
        error
    ) {

        setPanelStatus(

            statusContainer,

            statusElement,

            "error",

            error.message
        );
    }
}


// ======================================================
// EXTENSION MODE
// ======================================================

function detectExtensionMode() {

    try {

        const chromeExtension =

            typeof chrome !==
            "undefined" &&

            chrome.runtime &&

            chrome.runtime.id;


        const browserExtension =

            typeof browser !==
            "undefined" &&

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
// CLEAR PANELS
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


// ======================================================
// EJECT
// ======================================================

async function deleteVaultDatabase() {

    try {

        if (
            databasePromise
        ) {

            const db =
                await databasePromise;


            db.close();
        }

    } catch {

        // Continue with deletion.

    }


    databasePromise =
        null;


    return new Promise(
        resolve => {

            const request =
                indexedDB.deleteDatabase(
                    DB_NAME
                );


            request.onsuccess =
                () => resolve();


            request.onerror =
                () => resolve();


            request.onblocked =
                () => resolve();

        }
    );
}


function removeCipherVaultLocalStorage() {

    const keys =
        [];


    for (
        let i = 0;
        i < localStorage.length;
        i++
    ) {

        const key =
            localStorage.key(
                i
            );


        if (
            key &&
            key.startsWith(
                "ciphervault-"
            )
        ) {

            keys.push(
                key
            );
        }
    }


    for (
        const key
        of keys
    ) {

        localStorage.removeItem(
            key
        );
    }
}


async function executeEject() {

    if (
        ejectTriggered
    ) {

        return;
    }


    ejectTriggered =
        true;


    ejectOverlay.hidden =
        false;


    password.value =
        "";

    temporarySecret =
        "";

    encryptInput.value =
        "";

    encryptOutput.value =
        "";

    decryptInput.value =
        "";

    decryptOutput.value =
        "";

    profiles =
        [];

    activeProfileId =
        "";


    removeCipherVaultLocalStorage();


    try {

        await deleteVaultDatabase();

    } catch {

        // Redirect even if browser storage deletion fails.

    }


    const destination =
        "https://github.com/";


    const extensionMode =
        document
            .documentElement
            .classList
            .contains(
                "extension-mode"
            );


    if (
        extensionMode
    ) {

        window.open(
            destination,
            "_blank"
        );


        window.close();

    } else {

        window.location.replace(
            destination
        );
    }
}


function beginEject(
    event
) {

    if (
        ejectTriggered
    ) {

        return;
    }


    event.preventDefault();


    ejectButton.classList.add(
        "arming"
    );


    ejectTimer =
        window.setTimeout(
            executeEject,
            900
        );
}


function cancelEject() {

    if (
        ejectTriggered
    ) {

        return;
    }


    if (
        ejectTimer
    ) {

        clearTimeout(
            ejectTimer
        );


        ejectTimer =
            null;
    }


    ejectButton.classList.remove(
        "arming"
    );
}


// ======================================================
// EVENTS — THEME
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
// EVENTS — PROFILE
// ======================================================

profileSelect.addEventListener(
    "change",
    () => {

        const nextId =
            profileSelect.value;


        activateProfile(
            nextId
        );
    }
);


password.addEventListener(
    "input",
    updateKeySourceHint
);


addProfile.addEventListener(
    "click",
    () => {

        openProfileForm();
    }
);


manageProfiles.addEventListener(
    "click",
    () => {

        renderProfilesList();

        openModal(
            manageModal
        );
    }
);


closeManage.addEventListener(
    "click",
    () => {

        closeModal(
            manageModal
        );
    }
);


cancelProfile.addEventListener(
    "click",
    () => {

        closeModal(
            profileModal
        );
    }
);


toggleProfileSecret.addEventListener(
    "click",
    () => {

        const visible =
            profileSecret.type ===
            "text";


        profileSecret.type =
            visible
                ? "password"
                : "text";


        toggleProfileSecret.textContent =
            visible
                ? "◉"
                : "◎";


        profileSecret.focus();
    }
);


profileForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            profileName
                .value
                .trim();


        const secret =
            profileSecret
                .value;


        profileFormError.textContent =
            "";


        if (
            !name
        ) {

            profileFormError.textContent =
                "Enter a profile name.";

            return;
        }


        if (
            !secret
        ) {

            profileFormError.textContent =
                "Enter a secret key.";

            return;
        }


        if (
            await usesAlternateRoute(
                secret
            )
        ) {

            profileFormError.textContent =
                "This key is reserved by CipherVault.";

            return;
        }


        const duplicate =
            profiles.find(
                profile =>
                    profile
                        .name
                        .toLowerCase() ===
                        name
                            .toLowerCase() &&

                    profile.id !==
                        editingProfileId
            );


        if (
            duplicate
        ) {

            profileFormError.textContent =
                "A profile with this name already exists.";

            return;
        }


        if (
            editingProfileId
        ) {

            const profile =
                getProfile(
                    editingProfileId
                );


            if (
                profile
            ) {

                profile.name =
                    name;


                profile.secretKey =
                    secret;
            }


        } else {

            const newProfile =
                {
                    id:
                        createId(),

                    name:
                        name,

                    secretKey:
                        secret
                };


            profiles.push(
                newProfile
            );


            activeProfileId =
                newProfile.id;
        }


        await persistProfiles();


        if (
            editingProfileId &&
            activeProfileId ===
            editingProfileId
        ) {

            const edited =
                getProfile(
                    editingProfileId
                );


            if (
                edited
            ) {

                password.value =
                    edited.secretKey;
            }
        }


        if (
            !editingProfileId
        ) {

            const active =
                getProfile(
                    activeProfileId
                );


            if (
                active
            ) {

                password.value =
                    active.secretKey;


                localStorage.setItem(
                    ACTIVE_PROFILE_STORAGE_KEY,
                    active.id
                );
            }
        }


        refreshProfileSelect(
            activeProfileId
        );


        updateKeySourceHint();


        closeModal(
            profileModal
        );


        editingProfileId =
            null;
    }
);


// ======================================================
// EVENTS — PASSWORD VISIBILITY
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
// EVENTS — COUNTERS
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
// EVENTS — MOBILE
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
// EVENTS — ENCRYPT
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
// EVENTS — DECRYPT
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

            const alternate =
                await usesAlternateRoute(
                    password.value
                );


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


            /*
                Keep visible behaviour identical for
                normal and alternate output paths.
            */

            decryptOutput.value =
                result.text;


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


            /*
                Prevent compiler/linter warnings while
                intentionally keeping the UI identical.
            */

            void alternate;


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
// EVENTS — COPY
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
// EVENTS — CLEAR
// ======================================================

clearEncrypt.addEventListener(
    "click",
    () => {

        if (
            !encryptInput.value &&
            !encryptOutput.value
        ) {

            return;
        }


        openConfirmation(

            "Clear Encrypt panel?",

            "The original message and encrypted output will be removed. Profiles and secret keys will not be changed.",

            "CLEAR",

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


        openConfirmation(

            "Clear Decrypt panel?",

            "All encrypted messages and decrypted results in this panel will be removed. Profiles and secret keys will not be changed.",

            "CLEAR",

            clearDecryptPanel
        );
    }
);


// ======================================================
// EVENTS — CONFIRM
// ======================================================

cancelConfirm.addEventListener(
    "click",
    closeConfirmation
);


acceptConfirm.addEventListener(
    "click",
    async () => {

        const action =
            pendingConfirmation;


        pendingConfirmation =
            null;


        closeModal(
            confirmModal
        );


        if (
            action
        ) {

            await action();
        }
    }
);


// ======================================================
// EVENTS — MODAL BACKDROP
// ======================================================

[
    profileModal,
    manageModal,
    confirmModal

].forEach(
    modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target !==
                    modal
                ) {

                    return;
                }


                if (
                    modal ===
                    confirmModal
                ) {

                    closeConfirmation();

                } else {

                    closeModal(
                        modal
                    );
                }
            }
        );

    }
);


// ======================================================
// EVENTS — EJECT
// ======================================================

ejectButton.addEventListener(
    "pointerdown",
    beginEject
);


ejectButton.addEventListener(
    "pointerup",
    cancelEject
);


ejectButton.addEventListener(
    "pointercancel",
    cancelEject
);


ejectButton.addEventListener(
    "pointerleave",
    cancelEject
);


// ======================================================
// KEYBOARD
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            if (
                !confirmModal.hidden
            ) {

                closeConfirmation();

                return;
            }


            if (
                !profileModal.hidden
            ) {

                closeModal(
                    profileModal
                );

                return;
            }


            if (
                !manageModal.hidden
            ) {

                closeModal(
                    manageModal
                );

                return;
            }
        }


        if (

            !event.ctrlKey ||

            event.key !==
            "Enter"

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
// ENVIRONMENT
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


        addProfile.disabled =
            true;


        manageProfiles.disabled =
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

        addProfile.disabled =
            true;


        manageProfiles.disabled =
            true;


        profileNotice.textContent =
            "IndexedDB unavailable. Profiles are disabled.";
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
        !window.indexedDB ||
        !window.crypto ||
        !window.crypto.subtle
    ) {

        refreshProfileSelect();

        updateKeySourceHint();

        return;
    }


    try {

        await loadProfiles();


        await migrateLegacyData();


        refreshProfileSelect();


        const savedActiveId =
            localStorage.getItem(
                ACTIVE_PROFILE_STORAGE_KEY
            );


        if (
            savedActiveId &&
            getProfile(
                savedActiveId
            )
        ) {

            profileSelect.value =
                savedActiveId;


            activateProfile(
                savedActiveId
            );


        } else {

            activeProfileId =
                "";

            profileSelect.value =
                "";

            updateKeySourceHint();
        }


    } catch (
        error
    ) {

        console.warn(
            "CipherVault local storage initialization failed:",
            error
        );


        profileNotice.textContent =
            "Saved profiles could not be loaded.";


        refreshProfileSelect();

        updateKeySourceHint();
    }
}


initializeApp();