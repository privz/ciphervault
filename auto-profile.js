"use strict";

(() => {
    if (!isExtensionMode()) {
        return;
    }

    const googleChatField = document.getElementById("googleChatProfileField");
    const googleChatInput = document.getElementById("profileGoogleChatId");
    const googleChatNote = document.getElementById("googleChatProfileNote");
    const useCurrentButton = document.getElementById("useCurrentGoogleChatButton");

    if (!googleChatField || !googleChatInput || !googleChatNote || !useCurrentButton) {
        return;
    }

    let autoContextProfileId = null;

    injectGoogleChatProfileStyles();

    const originalRestoreActiveProfile = restoreActiveProfile;
    const originalSyncQuickCipherRuntime = syncQuickCipherRuntime;
    const originalOpenProfileEditor = openProfileEditor;
    const originalCloseProfileEditor = closeProfileEditor;
    const originalSaveProfileFromModal = saveProfileFromModal;

    // initializeApp() awaits IndexedDB before it calls restoreActiveProfile().
    // Replacing the binding here lets Google Chat context win without
    // changing the tested v1.1.1 application core.
    restoreActiveProfile = async function contextAwareRestoreActiveProfile() {
        if (await applyGoogleChatContextProfile()) {
            return;
        }

        return originalRestoreActiveProfile();
    };

    // Do not turn a context-selected Google Chat Profile into the user's
    // persistent manual Profile. The Quick Cipher worker resolves the
    // context independently on each shortcut invocation.
    syncQuickCipherRuntime = async function contextAwareSyncQuickCipherRuntime() {
        if (autoContextProfileId && profileSelect.value === autoContextProfileId) {
            return;
        }

        return originalSyncQuickCipherRuntime();
    };

    openProfileEditor = function contextAwareOpenProfileEditor(profileId = null) {
        originalOpenProfileEditor(profileId);

        const profile = profiles.find(item => item.id === profileId);
        googleChatInput.value = profile?.googleChatId || "";
        googleChatNote.textContent = defaultGoogleChatNote();

        if (!profile) {
            void detectCurrentGoogleChatConversationId().then(conversationId => {
                if (conversationId && !googleChatInput.value) {
                    googleChatInput.value = conversationId;
                    googleChatNote.textContent = `Current Google Chat detected: ${conversationId}`;
                }
            });
        }
    };

    closeProfileEditor = function contextAwareCloseProfileEditor() {
        originalCloseProfileEditor();
        clearGoogleChatEditorState();
    };

    // The original click handler was registered by app.js with the old
    // function object, so replace that exact listener with the v1.1.2 one.
    saveProfileButton.removeEventListener("click", originalSaveProfileFromModal);

    saveProfileFromModal = async function contextAwareSaveProfileFromModal() {
        const name = profileName.value.trim();
        const secretKey = profileSecret.value;
        const googleChatRaw = googleChatInput.value.trim();
        const googleChatId = normalizeGoogleChatConversationId(googleChatRaw);

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

        if (googleChatRaw && !googleChatId) {
            return showProfileModalError("Enter a valid chat.google.com Chat URL or Conversation ID.");
        }

        const duplicateName = profiles.find(item =>
            item.id !== editingProfileId &&
            item.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0
        );

        if (duplicateName) {
            return showProfileModalError("A profile with this name already exists.");
        }

        if (googleChatId) {
            const duplicateConversation = profiles.find(item =>
                item.id !== editingProfileId &&
                item.googleChatId === googleChatId
            );

            if (duplicateConversation) {
                return showProfileModalError("This Google Chat conversation is already linked to another Profile.");
            }
        }

        if (editingProfileId) {
            const profile = profiles.find(item => item.id === editingProfileId);

            if (!profile) {
                return showProfileModalError("Profile not found.");
            }

            profile.name = name;
            profile.secretKey = secretKey;
            profile.googleChatId = googleChatId;
            profile.updatedAt = Date.now();
        } else {
            const newProfile = {
                id: makeProfileId(),
                name,
                secretKey,
                googleChatId,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            profiles.push(newProfile);
            editingProfileId = newProfile.id;
        }

        await persistProfiles();
        renderProfileSelect();

        const savedId = editingProfileId;
        const savedProfile = profiles.find(item => item.id === savedId);
        const currentConversationId = await detectCurrentGoogleChatConversationId();
        const isCurrentMappedConversation = Boolean(
            savedProfile?.googleChatId &&
            currentConversationId &&
            savedProfile.googleChatId === currentConversationId
        );

        profileSelect.value = savedId;
        password.value = savedProfile?.secretKey || "";

        if (savedProfile && !isCurrentMappedConversation) {
            localStorage.setItem(ACTIVE_PROFILE_KEY, savedProfile.id);
        }

        originalCloseProfileEditor();
        clearGoogleChatEditorState();
        renderManageProfiles();

        if (savedProfile) {
            if (isCurrentMappedConversation) {
                autoContextProfileId = savedProfile.id;
                collapseCredentials(`${savedProfile.name} · AUTO`);
            } else {
                autoContextProfileId = null;
                collapseCredentials(savedProfile.name);
                await originalSyncQuickCipherRuntime();
            }
        }

        showToast("Profile saved.");
    };

    saveProfileButton.addEventListener("click", saveProfileFromModal);

    useCurrentButton.addEventListener("click", async () => {
        const conversationId = await detectCurrentGoogleChatConversationId();

        if (!conversationId) {
            showProfileModalError("Open a Google Chat conversation first, or paste its Chat URL / Conversation ID manually.");
            return;
        }

        googleChatInput.value = conversationId;
        googleChatNote.textContent = `Current Google Chat detected: ${conversationId}`;
        profileModalError.hidden = true;
    });

    // The close/cancel handlers in app.js hold the original close function.
    // Clear the v1.1.2-only field after those handlers run as well.
    closeProfileModal.addEventListener("click", clearGoogleChatEditorState);
    cancelProfileButton.addEventListener("click", clearGoogleChatEditorState);

    profileSelect.addEventListener("change", () => {
        autoContextProfileId = null;
    });

    password.addEventListener("input", () => {
        if (!autoContextProfileId) {
            return;
        }

        autoContextProfileId = null;
        void originalSyncQuickCipherRuntime();
    });

    async function applyGoogleChatContextProfile() {
        const conversationId = await detectCurrentGoogleChatConversationId();

        if (!conversationId) {
            autoContextProfileId = null;
            return false;
        }

        const profile = profiles.find(item => item.googleChatId === conversationId);

        if (!profile) {
            autoContextProfileId = null;
            return false;
        }

        autoContextProfileId = profile.id;
        profileSelect.value = profile.id;
        password.value = profile.secretKey;
        sessionOverride.hidden = true;
        collapseCredentials(`${profile.name} · AUTO`);
        return true;
    }

    async function detectCurrentGoogleChatConversationId() {
        const tab = await getActiveBrowserTab();
        return normalizeGoogleChatConversationId(tab?.url || "");
    }

    async function getActiveBrowserTab() {
        if (typeof chrome === "undefined" || !chrome.tabs?.query) {
            return null;
        }

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            return tabs[0] || null;
        } catch {
            return null;
        }
    }

    function normalizeGoogleChatConversationId(value) {
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

    function clearGoogleChatEditorState() {
        googleChatInput.value = "";
        googleChatNote.textContent = defaultGoogleChatNote();
    }

    function defaultGoogleChatNote() {
        return "Used only on chat.google.com. CipherVault stores only the conversation ID, not the full URL.";
    }

    function injectGoogleChatProfileStyles() {
        const style = document.createElement("style");
        style.textContent = `
            html:not(.extension-mode) #googleChatProfileField { display: none !important; }
            .google-chat-profile-field {
                margin: 2px 0 14px;
                padding: 10px;
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: color-mix(in srgb, var(--surface-2) 92%, var(--accent) 8%);
            }
            .google-chat-profile-field > label {
                display: block;
                margin: 0 0 5px;
                color: var(--text-soft);
                font-size: 8px;
                font-weight: 760;
                letter-spacing: .11em;
            }
            .google-chat-field-row { align-items: stretch; }
            .detect-chat-button {
                min-width: 86px;
                min-height: 39px;
                padding: 0 10px;
                border: 1px solid var(--accent-border);
                border-radius: var(--radius-md);
                background: var(--accent-soft);
                color: var(--accent);
                cursor: pointer;
                font-size: 8px;
                font-weight: 800;
                letter-spacing: .06em;
                white-space: nowrap;
            }
            .detect-chat-button:hover {
                background: color-mix(in srgb, var(--accent-soft) 72%, var(--accent) 28%);
            }
        `;
        document.head.appendChild(style);
    }
})();
