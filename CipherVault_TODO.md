# CipherVault — Project ToDo / Context Handoff

> Source of truth for future CipherVault chats.
>
> **Previous stable baseline:** v1.1.1
> **Current package:** v1.1.2 Google Chat Auto Profile Mapping
> **Status:** v1.1.1 validated; v1.1.2 implemented and awaiting regression validation.

---

## Current status

```text
CRYPTO                     ✅ STABLE
PROFILES                   ✅ STABLE
DARK/LIGHT                 ✅ STABLE
BATCH DECRYPT              ✅ STABLE
COPY/CLEAR                 ✅ STABLE
ADMIN/DECOY                ✅ STABLE
WEB/EXTENSION SEPARATION   ✅ STABLE
ICONS                      ✅ STABLE
QUICK CIPHER               ✅ VALIDATED
DRAFT RECOVERY             ✅ VALIDATED
SESSION HISTORY            ❌ REMOVED / NOT IMPLEMENTED
EJECT                      ✅ VALIDATED
README                     ✅ ADDED
CHROME WEB STORE           ⏳ FUTURE
MASTER PASSWORD            ⏳ FUTURE
```

---

# v1.1.0 — Quick Cipher

## Implemented

Default shortcut:

```text
Windows/Linux: Ctrl + Shift + Y
macOS:         Command + Shift + Y
```

Workflow:

```text
select text
→ shortcut
→ smart Encrypt/Decrypt detection
→ CipherVault bubble on current page
→ Copy / Replace Selection
```

Rules:

- plaintext -> Encrypt
- valid CipherVault payload(s) -> Decrypt
- editable selected text can be replaced
- focused text field without selection can use the full field content
- Quick Cipher uses active Profile
- Temporary Session secret works while extension session remains alive
- no permanent `<all_urls>` host permission
- protected browser pages remain unsupported

Manifest permissions:

```json
[
  "activeTab",
  "scripting",
  "storage"
]
```

New files:

```text
service-worker.js
quick-cipher.js
README.md
```

---

# Temporary draft recovery

## Important decision

There is **NO session history**.

The extension stores only one temporary workspace snapshot for accidental popup closure recovery.

Snapshot:

```text
Encrypt input
Encrypt output
Decrypt input
Decrypt output
active tab
```

Storage:

```text
chrome.storage.session
```

TTL:

```text
~5 minutes of inactivity
```

The recovery buffer disappears on:

- browser restart
- extension reload/update/disable
- expiration
- first press of Hold to Eject

No list of previous operations is retained.

---

# Hold to Eject v1.1.0

## Short press / first pointerdown

Immediately clears:

```text
visible Secret Key
active session selection
Encrypt input/output
Decrypt input/output
Temporary draft recovery buffer
Temporary Session Quick Cipher secret
Quick Cipher active runtime Profile selection
```

Saved Profiles remain.

## Hold ~900 ms

Full Eject additionally deletes:

```text
saved Profiles
saved keys
CipherVault IndexedDB
CipherVault-sensitive persistent state
```

Theme remains.

---

# Regression test required

## Extension base

- [ ] Reload extension
- [ ] version shows 1.1.0
- [ ] icon correct
- [ ] popup opens
- [ ] Dark Mode
- [ ] Light Mode
- [ ] Profiles
- [ ] Temporary Session
- [ ] Encrypt
- [ ] Decrypt
- [ ] Batch Decrypt
- [ ] Copy
- [ ] Clear confirmation
- [ ] Admin/Decoy

## Quick Cipher

- [ ] select plaintext on a normal website
- [ ] Ctrl+Shift+Y encrypts
- [ ] bubble appears near selection
- [ ] Copy works
- [ ] select ciphertext
- [ ] Ctrl+Shift+Y decrypts
- [ ] textarea selection can be replaced
- [ ] focused textarea without selection uses full field
- [ ] contenteditable selection works
- [ ] saved Profile works after popup closes
- [ ] Temporary Session key works during active session
- [ ] missing active secret returns useful error
- [ ] protected chrome:// page fails safely
- [ ] shortcut can be changed in chrome://extensions/shortcuts

## Draft recovery

- [ ] type a long draft
- [ ] close popup accidentally
- [ ] reopen within 5 minutes
- [ ] draft restores
- [ ] Encrypt output restores
- [ ] Decrypt input/output restores
- [ ] active tab restores
- [ ] wait beyond TTL -> draft does not restore
- [ ] confirm there is no session-history UI or list

## Eject

Use disposable test Profiles.

- [ ] create draft recovery state
- [ ] single Eject press clears visible fields immediately
- [ ] single Eject press clears recovery buffer immediately
- [ ] reopen popup -> old draft does NOT return
- [ ] saved Profiles remain after short press
- [ ] Quick Cipher no longer uses previous active runtime Profile immediately after Eject press
- [ ] hold ~900 ms deletes saved Profiles
- [ ] theme survives Full Eject

## Web regression

- [ ] Web Desktop remains 2-column
- [ ] Mobile Web remains responsive
- [ ] Quick Cipher extension changes do not affect Web layout
- [ ] Web Encrypt/Decrypt still work

---

# After testing

If all checks pass:

```text
v1.1.0 -> STABLE
```

Then:

- [ ] update this ToDo to mark v1.1.0 validated
- [ ] consider Chrome Web Store release
- [ ] prepare screenshots/store listing/privacy declarations
- [ ] optional Master Password architecture study


## v1.1.1 Google Chat fix

✅ v1.1.1 direct Google Chat validation confirmed by the user.

- [x] Quick Cipher command itself works
- [x] Identified Google Chat/Gmail nested-frame selection issue
- [x] Inject Quick Cipher into all accessible frames
- [x] Capture selection from the frame that actually owns it
- [x] Render result bubble in that same frame
- [x] Prefer explicit selection over focused-field fallback
- [x] Add deep active-element / Shadow DOM selection fallback
- [x] Add narrow host permissions for chat.google.com and mail.google.com
- [x] User regression test on Google Chat direct web app
- [ ] User regression test on Chat inside Gmail, if used (not required for current Google Chat direct validation)


---

# v1.1.2 — Google Chat Auto Profile Mapping

## ✅ IMPLEMENTED — TEST REQUIRED

New behavior:

```text
https://chat.google.com/app/chat/reJ7DSAAAAE
                                 ↓
                         reJ7DSAAAAE
                                 ↓
                    matching saved Profile
                                 ↓
                  automatic Secret Key choice
                                 ↓
                        Quick Cipher action
```

Implementation rules:

- Google Chat mapping only applies to `chat.google.com`.
- Profile editor accepts a full Google Chat URL or a bare Conversation ID.
- Only the Conversation ID is stored.
- Conversation mapping is stored with the encrypted Profile data.
- Duplicate Conversation IDs cannot be assigned to two Profiles.
- Quick Cipher checks the current tab URL every time the hotkey is pressed.
- Google Chat context mapping has priority over the manual Profile.
- Outside a mapped Google Chat conversation, CipherVault falls back to the previous manual/session Profile logic.
- Opening the extension popup on a mapped Google Chat conversation auto-selects the matching Profile without changing the persistent manual Profile.
- `USE CURRENT` fills the current Google Chat Conversation ID when creating/editing a Profile.
- Quick Cipher bubble shows `Profile · AUTO` when the context mapping selected the Profile.

## Validation checklist

- [ ] Create Profile with bare ID `reJ7DSAAAAE`.
- [ ] Create Profile by pasting full `https://chat.google.com/app/chat/...` URL.
- [ ] `USE CURRENT` detects current Google Chat conversation.
- [ ] Duplicate Google Chat ID is rejected.
- [ ] Open mapped Chat A → Quick Cipher uses Profile A.
- [ ] Switch to mapped Chat B → next hotkey uses Profile B automatically.
- [ ] No page reload required when switching Google Chat conversations.
- [ ] Bubble shows `· AUTO` for mapped conversation.
- [ ] Unmapped Google Chat falls back to manual Profile.
- [ ] Non-Google-Chat sites keep manual Profile behavior.
- [ ] Editing a Profile updates the mapping.
- [ ] Deleting a Profile removes its mapping because the mapping lives in the Profile.
- [ ] Short Eject keeps saved Profile mappings.
- [ ] Full Eject deletes mappings together with Profiles.
- [ ] Web version remains unaffected by the Google Chat mapping field.

## Next UX phase after validation

- [ ] Same-hotkey second press → primary action (Replace for Encrypt / Copy for Decrypt).
- [ ] Enter → primary action while Quick Cipher bubble is open.
- [ ] Esc → close bubble.
- [ ] Keyboard-first Profile picker / override.
- [ ] Wrong-key → choose another Profile without opening main popup.
- [ ] Refine Quick Cipher bubble visual hierarchy and keyboard hints.
