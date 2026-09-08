# CipherVault

CipherVault is a local message-encryption utility with a web interface and a Chrome/Chromium browser extension.

The main idea is simple: two people share a secret key, encrypt text locally, and send the encrypted payload through the communication tool they already use.

CipherVault does not require a backend for message encryption or decryption.

---

## What CipherVault is for

CipherVault is useful when you want to exchange encrypted text through an existing channel such as a chat, email, collaboration tool, support system, or web form without moving the conversation to a separate messaging platform.

Basic flow:

```text
Plaintext
   ↓
CipherVault + Shared Secret
   ↓
AES-256-GCM encrypted payload
   ↓
Base64 text
   ↓
Chat / email / text field
```

The recipient uses the same Shared Secret to decrypt the payload.

---

## Features

### Local encryption

CipherVault uses the browser Web Crypto API with:

```text
AES-256-GCM
PBKDF2-SHA256
300,000 PBKDF2 iterations
16-byte random salt
12-byte random IV
128-bit GCM authentication tag
```

Every encryption generates a new random salt and IV.

Base64 is used only to make the encrypted binary payload easy to copy and paste.

### Profiles

Profiles allow you to keep a different Shared Secret for each contact.

Example:

```text
Cristian → Secret A
Gabriel  → Secret B
```

Features include:

- Temporary Session
- Add Profile
- Edit Profile
- Delete Profile
- active Profile selection
- Session Override without silently modifying the saved Profile

Profiles are stored locally in IndexedDB.

### Encrypt and Decrypt

The normal web version shows Encrypt and Decrypt side-by-side on desktop.

The extension popup uses compact Encrypt / Decrypt tabs.

### Batch Decrypt

Paste one encrypted payload per line.

CipherVault processes every non-empty line independently, so one invalid payload does not stop the other lines.

Example error:

```text
[ERROR line 3: Wrong secret key or corrupted message.]
```

### Quick Cipher

Quick Cipher is the fast workflow for the browser extension.

Default shortcut:

```text
Windows / Linux: Ctrl + Shift + Y
macOS:           Command + Shift + Y
```

You can change the shortcut from:

```text
chrome://extensions/shortcuts
```

#### Encrypt selected text

```text
Select plaintext on a page
→ Ctrl + Shift + Y
→ CipherVault encrypts it
→ small inline bubble appears
→ Copy or Replace Selection
```

#### Decrypt selected text

```text
Select a CipherVault payload
→ Ctrl + Shift + Y
→ CipherVault detects the payload
→ decrypts it
→ plaintext appears in a small inline bubble
```

The shortcut is smart: it decides whether to Encrypt or Decrypt by checking whether the selected content matches the current CipherVault payload structure.

When the selected text belongs to an editable field, the bubble can offer **Replace Selection**.

If no text is selected but the cursor is inside a normal text field containing text, Quick Cipher can use the field contents.

Quick Cipher uses the active saved Profile. A Temporary Session secret can also be used while the extension session remains alive.

### Temporary draft recovery

There is **no session-history list** and no permanent log of previous messages.

The extension keeps only one temporary workspace snapshot so accidentally closing the popup does not immediately destroy the text you were working on.

The recovery snapshot can contain:

- Encrypt input
- Encrypt result
- Decrypt input
- Decrypt result
- currently active Encrypt/Decrypt tab

It is stored in:

```text
chrome.storage.session
```

The snapshot:

- stays in extension memory
- is not synchronized
- expires after approximately 5 minutes of inactivity
- disappears when the browser restarts
- disappears when the extension is reloaded, disabled, or updated
- is erased immediately when `HOLD TO EJECT` is pressed once

This is a draft-recovery buffer, not a conversation history.

### Copy feedback

Copy buttons provide visible confirmation:

```text
Copy
→ ✓ COPIED
```

### Clear confirmation

The normal Clear action asks for confirmation before wiping a panel.

It clears only that panel and keeps saved Profiles and the current Shared Secret.

### Dark and Light Mode

Both Web and Extension interfaces support Dark and Light Mode.

The selected theme is remembered locally.

### Hold to Eject

`HOLD TO EJECT` has two levels.

#### One click / short press

The moment the user starts pressing Eject, CipherVault immediately clears:

- visible Secret Key
- active session selection
- Encrypt input/output
- Decrypt input/output
- temporary draft-recovery buffer
- Temporary Session runtime secret used by Quick Cipher

Saved Profiles remain intact.

#### Hold for approximately 900 ms

Full Eject additionally removes:

- saved Profiles
- saved Profile secret keys
- CipherVault IndexedDB data
- CipherVault-sensitive persistent application state

The theme preference is intentionally preserved.

After Full Eject, CipherVault navigates away to a neutral page.

> Eject is a best-effort application wipe. It is not a forensic secure erase of browser caches, RAM, SSD history, backups, snapshots, or operating-system artifacts.

---

## Web and Extension layouts

CipherVault intentionally treats the web page and extension popup as independent layouts.

### Desktop Web

```text
[ Encrypt ] [ Decrypt ]
```

Both panels remain visible.

### Mobile Web

Uses compact tabs when the screen is small.

### Extension popup

```text
[ ENCRYPT | DECRYPT ]
```

Only the active panel is shown to preserve vertical space.

The underlying encryption/profile logic is shared, but layout rules are isolated.

---

## Installing the extension locally

1. Download or clone the project.
2. Open:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the CipherVault project folder containing `manifest.json`.
6. Pin the extension if desired.

After changing extension code:

```text
chrome://extensions/
→ CipherVault
→ Reload
```

---

## Extension permissions

CipherVault v1.1.0 requests:

```json
[
  "activeTab",
  "scripting",
  "storage"
]
```

### `activeTab`

Provides temporary access to the active page after an explicit user action such as invoking Quick Cipher.

### `scripting`

Allows CipherVault to inject the Quick Cipher selection/result component into the currently active page.

### `storage`

Used for temporary draft recovery and extension runtime state.

CipherVault does **not** request permanent `<all_urls>` access in this version.

---

## Security model

CipherVault is a local encryption utility, not a full secure-messaging protocol.

Current message flow:

```text
Shared Secret
     ↓
PBKDF2-SHA256
     ↓
AES-256-GCM
```

Payload structure:

```text
[1 byte version]
[16 byte salt]
[12 byte IV]
[ciphertext + GCM tag]
```

Current version:

```text
VERSION = 1
```

Wrong secrets and modified authenticated ciphertexts fail decryption.

---

## Profile storage security

Saved Profiles are stored in IndexedDB.

CipherVault uses a browser-generated non-extractable AES-GCM wrapping key to encrypt the saved Profile blob.

This reduces casual storage inspection but does not protect against a fully compromised browser or operating system.

`extractable: false` prevents direct raw-key export. It does not prevent authorized code in the same extension context from using that CryptoKey for decryption.

A future improvement under consideration is a CipherVault Master Password so the decrypt-capable master key is not persistently stored alongside the encrypted Profiles.

---

## Admin / Decoy Mode

CipherVault contains a reserved application-level `admin` trigger used for deterministic cover output during decryption.

This is **not cryptographic plausible deniability**. It is application/UI deception and can be discovered by someone who can inspect the code or browser environment.

The reserved `admin` secret cannot be saved as a normal real Profile key.

---

## Project structure

```text
CipherVault/
├── index.html
├── style.css
├── app.js
├── service-worker.js
├── quick-cipher.js
├── manifest.json
├── README.md
├── CipherVault_TODO.md
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon64.png
    └── icon128.png
```

### `app.js`

Main website/popup logic:

- Profiles
- IndexedDB
- Encrypt/Decrypt
- Batch Decrypt
- themes
- temporary draft recovery
- Eject

### `service-worker.js`

Manifest V3 event coordinator:

- listens for the Quick Cipher hotkey
- resolves the active Profile/Temporary Session secret
- performs Quick Cipher encryption/decryption
- coordinates the injected page bubble

### `quick-cipher.js`

Injected only when Quick Cipher is invoked.

Responsible for:

- reading selected/focused text
- showing the inline result bubble
- Copy
- Replace Selection

The bubble is rendered inside a Shadow DOM to reduce interference with the page's own CSS.

---

## GitHub Pages deployment

For the Web version:

1. Commit the new files to the branch used by GitHub Pages.
2. Open the repository **Actions** tab.
3. Wait for the Pages build/deployment to finish.
4. Hard refresh the published website:

```text
Ctrl + Shift + R
```

The extension installed with **Load unpacked** does not update automatically from GitHub Pages. Reload it separately from `chrome://extensions/`.

---

## Known limitations

Quick Cipher cannot inject into browser-controlled or protected pages such as some:

```text
chrome://
devtools://
Chrome Web Store/internal browser pages
```

Cross-origin embedded frames can also be limited by browser permission boundaries.

Some complex web editors implement custom input systems. `Replace Selection` uses native input/contenteditable events and should work on many sites, but individual editors may behave differently.

If the default shortcut conflicts with another extension or application, remap it at:

```text
chrome://extensions/shortcuts
```

---

## Current version

```text
1.1.0
```

Main additions:

```text
Quick Cipher smart hotkey
Temporary popup draft recovery
Immediate recovery-buffer wipe on Eject press
```

---

## License

No project license has been selected yet.
