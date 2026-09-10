"use strict";

(() => {
    if (globalThis.__cipherVaultQuickCipherInjected) return;
    globalThis.__cipherVaultQuickCipherInjected = true;

    const DEFAULTS = {
        actions: {
            copy: { key: "c", ctrl: false, shift: false, alt: false, meta: false },
            replace: { key: "r", ctrl: false, shift: false, alt: false, meta: false },
            profile: { key: "p", ctrl: false, shift: false, alt: false, meta: false },
            close: { key: "Escape", ctrl: false, shift: false, alt: false, meta: false }
        },
        smartTarget: { focusedEditor: true, hoveredGoogleChat: true }
    };

    let target = null;
    let sourceText = "";
    let bubble = null;
    let keyHandler = null;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === "CV_QUICK_CAPTURE") {
            sendResponse(capture(normalizeSettings(message.settings)));
            return;
        }
        if (message?.type === "CV_QUICK_SHOW_RESULT") {
            renderBubble({ ...(message.payload || {}), settings: normalizeSettings(message?.payload?.settings) });
            sendResponse({ ok: true });
        }
    });

    function capture(settings) {
        removeBubble();
        const active = deepActiveElement();
        const editable = editableHost(active);

        if (isTextControl(active)) {
            const start = Number.isInteger(active.selectionStart) ? active.selectionStart : 0;
            const end = Number.isInteger(active.selectionEnd) ? active.selectionEnd : start;
            if (end > start) {
                return remember({
                    target: { type: "control", element: active, start, end },
                    text: active.value.slice(start, end),
                    replaceable: true,
                    captureKind: "selection"
                });
            }
        }

        if (editable) {
            const selection = bestSelection(active);
            if (selection && !selection.isCollapsed && selection.rangeCount && selection.toString()) {
                return remember({
                    target: { type: "range", range: selection.getRangeAt(0).cloneRange(), editableHost: editable },
                    text: selection.toString(),
                    replaceable: true,
                    captureKind: "selection"
                });
            }
        }

        const selection = bestSelection(active);
        if (selection && !selection.isCollapsed && selection.rangeCount && selection.toString()) {
            return remember({
                target: { type: "readonly", range: selection.getRangeAt(0).cloneRange() },
                text: selection.toString(),
                replaceable: false,
                captureKind: "selection"
            });
        }

        const focused = settings.smartTarget.focusedEditor ? focusedCandidate(active, editable) : null;
        const hovered = settings.smartTarget.hoveredGoogleChat ? hoveredChatCandidate() : null;

        if (hovered?.strongIntent) return remember(hovered);
        if (focused) return remember(focused);
        if (hovered) return remember(hovered);

        target = null;
        sourceText = "";
        return {
            ok: false,
            message: "Select text, focus a text editor, or point to a Google Chat message.",
            replaceable: false,
            captureKind: "none",
            frameFocused: document.hasFocus()
        };
    }

    function focusedCandidate(active, editable) {
        if (isTextControl(active) && active.value) {
            return {
                target: { type: "control", element: active, start: 0, end: active.value.length },
                text: active.value,
                replaceable: true,
                captureKind: "focused-field"
            };
        }
        if (editable) {
            const text = editable.innerText || editable.textContent || "";
            if (text.trim()) {
                return {
                    target: { type: "editable-all", element: editable },
                    text,
                    replaceable: true,
                    captureKind: "focused-field"
                };
            }
        }
        return null;
    }

    function hoveredChatCandidate() {
        if (!isGoogleChat()) return null;
        let hovered;
        try { hovered = Array.from(document.querySelectorAll(":hover")); }
        catch { return null; }
        if (!hovered.length) return null;

        const seen = new Set();
        const candidates = [];

        for (let i = hovered.length - 1; i >= 0; i -= 1) {
            let element = hovered[i];
            let depth = 0;
            while (element instanceof Element && depth < 8) {
                if (seen.has(element) || element === document.body || element === document.documentElement) break;
                seen.add(element);

                if (!element.closest?.("[data-ciphervault-quick]") && !isInteractive(element)) {
                    const raw = cleanText(element.innerText || element.textContent || "");
                    if (reasonableText(raw, element)) {
                        const payload = payloadLines(raw);
                        const text = payload || raw;
                        const strongIntent = Boolean(payload || looksLikeCipherText(text));
                        let score = strongIntent ? 1000 : 0;
                        if (element.childElementCount <= 3) score += 80;
                        if (text.length <= 500) score += 50;
                        if (element.matches?.("[role='listitem'], [data-message-id], [data-id]")) score += 40;
                        candidates.push({
                            target: { type: "hovered", element },
                            text,
                            replaceable: false,
                            captureKind: "hovered-message",
                            strongIntent,
                            score
                        });
                    }
                }
                element = element.parentElement;
                depth += 1;
            }
        }

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0] || null;
    }

    function remember(candidate) {
        target = candidate.target;
        sourceText = String(candidate.text || "");
        return {
            ok: true,
            text: sourceText,
            replaceable: Boolean(candidate.replaceable),
            captureKind: candidate.captureKind,
            strongIntent: Boolean(candidate.strongIntent),
            frameFocused: document.hasFocus()
        };
    }

    function renderBubble(payload) {
        removeBubble();
        const settings = normalizeSettings(payload.settings);
        const light = payload.theme === "light";
        const error = payload.status === "error";
        const host = document.createElement("div");
        host.dataset.ciphervaultQuick = "";
        Object.assign(host.style, {
            position: "fixed",
            zIndex: "2147483647",
            left: "12px",
            top: "12px",
            width: "min(370px, calc(100vw - 24px))",
            pointerEvents: "auto"
        });

        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = `
<style>
:host{all:initial}*{box-sizing:border-box}.card{overflow:hidden;border:1px solid ${light ? "rgba(15,23,42,.14)" : "rgba(255,255,255,.12)"};border-radius:14px;background:${light ? "#fff" : "#0b151b"};color:${light ? "#172033" : "#f5f8f9"};box-shadow:0 18px 50px rgba(0,0,0,.28);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.head{display:flex;align-items:center;gap:8px;padding:10px 11px;border-bottom:1px solid ${light ? "rgba(15,23,42,.08)" : "rgba(255,255,255,.08)"}}.mark{width:19px;height:19px;border:2px solid #54ffc2;border-radius:5px;transform:rotate(30deg)}.title{font-size:12px;font-weight:850}.title b{color:#54ffc2}.profile{margin-left:auto;max-width:145px;padding:5px 7px;overflow:hidden;border:1px solid ${light ? "rgba(15,23,42,.1)" : "rgba(255,255,255,.1)"};border-radius:8px;background:transparent;color:${light ? "#52606d" : "#9aa8b1"};font-size:9px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.profile:hover{border-color:rgba(84,255,194,.35)}.close{border:0;background:transparent;color:${light ? "#667085" : "#98a6af"};font-size:17px;cursor:pointer}.body{padding:11px}.label{margin-bottom:6px;color:${error ? "#ff6d76" : "#54ffc2"};font-size:9px;font-weight:900;letter-spacing:.13em}.result{max-height:210px;overflow:auto;padding:10px;border:1px solid ${light ? "rgba(15,23,42,.1)" : "rgba(255,255,255,.08)"};border-radius:9px;background:${light ? "#f4f7fa" : "#101c23"};color:${error ? "#ff6d76" : "inherit"};font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text}.actions{display:flex;gap:7px;margin-top:9px}.btn{flex:1;min-height:34px;border:1px solid ${light ? "rgba(15,23,42,.12)" : "rgba(255,255,255,.1)"};border-radius:9px;background:${light ? "#f4f7fa" : "#101c23"};color:inherit;font-size:9px;font-weight:850;cursor:pointer}.btn.primary{border-color:transparent;background:linear-gradient(135deg,#64f6c8,#25dcb0);color:#03241c}.kbd{opacity:.7;font-size:8px}.foot{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px;color:${light ? "#7d8995" : "#6f7d87"};font-size:8px}.picker{margin-top:9px;padding:8px;border:1px solid ${light ? "rgba(15,23,42,.1)" : "rgba(255,255,255,.08)"};border-radius:9px;background:${light ? "#f7fafb" : "#0f1c23"}}.picker[hidden]{display:none}.picker-title{margin-bottom:6px;color:#54ffc2;font-size:8px;font-weight:900;letter-spacing:.1em}.picker-list{display:grid;gap:4px;max-height:150px;overflow:auto}.pick{padding:7px 8px;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;text-align:left;font-size:9px;cursor:pointer}.pick.active,.pick:hover{border-color:rgba(84,255,194,.32);background:rgba(84,255,194,.08)}.empty{color:${light ? "#667085" : "#8d9aa5"};font-size:9px}
</style>
<div class="card"><div class="head"><span class="mark"></span><span class="title">Cipher<b>Vault</b></span><button class="profile" type="button"></button><button class="close" type="button" aria-label="Close">×</button></div><div class="body"><div class="label"></div><div class="result"></div><div class="actions"></div><div class="picker" hidden><div class="picker-title">CHOOSE PROFILE</div><div class="picker-list"></div></div><div class="foot"></div></div></div>`;

        const profileButton = shadow.querySelector(".profile");
        const closeButton = shadow.querySelector(".close");
        const label = shadow.querySelector(".label");
        const result = shadow.querySelector(".result");
        const actions = shadow.querySelector(".actions");
        const picker = shadow.querySelector(".picker");
        const pickerList = shadow.querySelector(".picker-list");
        const foot = shadow.querySelector(".foot");

        const state = { payload, settings, pickerOpen: false, items: [], index: 0, busy: false };
        const copyKey = settings.actions.copy;
        const replaceKey = settings.actions.replace;
        const profileKey = settings.actions.profile;
        const closeKey = settings.actions.close;

        profileButton.textContent = payload.profileName || "Profile";
        profileButton.hidden = !payload.allowProfilePicker;
        label.textContent = payload.label || "CIPHERVAULT";
        result.textContent = error ? (payload.message || "Quick Cipher failed.") : (payload.result || "");

        const doCopy = async () => {
            if (state.busy || error) return;
            state.busy = true;
            const ok = await copyText(state.payload.result || "");
            const button = shadow.querySelector("[data-action='copy']");
            if (button) button.firstChild.textContent = ok ? "✓ COPIED " : "COPY FAILED ";
            state.busy = false;
            if (ok) setTimeout(removeBubble, 650);
        };

        const doReplace = () => {
            if (state.busy || error || !state.payload.replaceable) return;
            const ok = replaceTarget(state.payload.result || "");
            const button = shadow.querySelector("[data-action='replace']");
            if (button) button.firstChild.textContent = ok ? "✓ REPLACED " : "REPLACE FAILED ";
            if (ok) setTimeout(removeBubble, 550);
        };

        const renderPickerSelection = () => {
            [...pickerList.children].forEach((node, index) => node.classList.toggle("active", index === state.index));
            pickerList.children[state.index]?.scrollIntoView?.({ block: "nearest" });
        };

        const closePicker = () => {
            state.pickerOpen = false;
            picker.hidden = true;
        };

        const applyProfile = async profileId => {
            if (!profileId || state.busy) return;
            state.busy = true;
            try {
                const response = await chrome.runtime.sendMessage({ type: "CV_QUICK_REPROCESS_PROFILE", profileId, text: sourceText });
                if (!response?.ok) throw new Error(response?.message || "Unable to process with that Profile.");
                closePicker();
                renderBubble({
                    ...state.payload,
                    status: "success",
                    label: response.label,
                    operation: response.operation,
                    result: response.result,
                    profileName: response.profileName,
                    profileId: response.profileId,
                    settings: state.settings
                });
            } catch (e) {
                label.textContent = "PROFILE FAILED";
                result.textContent = e?.message || "Unable to process with that Profile.";
            } finally {
                state.busy = false;
            }
        };

        const openPicker = async () => {
            if (!payload.allowProfilePicker || state.busy) return;
            state.pickerOpen = true;
            picker.hidden = false;
            pickerList.innerHTML = '<div class="empty">Loading Profiles…</div>';
            state.busy = true;
            try {
                const response = await chrome.runtime.sendMessage({ type: "CV_QUICK_GET_PROFILES" });
                state.items = response?.ok && Array.isArray(response.profiles) ? response.profiles : [];
                state.index = Math.max(0, state.items.findIndex(item => item.id === payload.profileId));
                pickerList.innerHTML = "";
                if (!state.items.length) {
                    pickerList.innerHTML = '<div class="empty">No saved Profiles available.</div>';
                } else {
                    state.items.forEach((item, index) => {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "pick";
                        button.textContent = item.name;
                        button.addEventListener("mouseenter", () => { state.index = index; renderPickerSelection(); });
                        button.addEventListener("click", () => void applyProfile(item.id));
                        pickerList.appendChild(button);
                    });
                    renderPickerSelection();
                }
            } catch (e) {
                pickerList.innerHTML = '<div class="empty"></div>';
                pickerList.firstElementChild.textContent = e?.message || "Unable to load Profiles.";
            } finally {
                state.busy = false;
            }
        };

        closeButton.addEventListener("click", removeBubble);
        profileButton.addEventListener("click", () => void openPicker());

        if (!error) {
            const copy = document.createElement("button");
            copy.type = "button";
            copy.className = "btn primary";
            copy.dataset.action = "copy";
            copy.innerHTML = `COPY <span class="kbd">${escapeHtml(formatBinding(copyKey))}</span>`;
            copy.addEventListener("click", () => void doCopy());
            actions.appendChild(copy);

            if (payload.replaceable && target) {
                const replace = document.createElement("button");
                replace.type = "button";
                replace.className = "btn";
                replace.dataset.action = "replace";
                replace.innerHTML = `REPLACE <span class="kbd">${escapeHtml(formatBinding(replaceKey))}</span>`;
                replace.addEventListener("click", doReplace);
                actions.appendChild(replace);
            }
        } else {
            actions.remove();
        }

        const hints = [];
        if (!error) hints.push(`${formatBinding(copyKey)}: Copy`);
        if (!error && payload.replaceable) hints.push(`${formatBinding(replaceKey)}: Replace`);
        if (payload.allowProfilePicker) hints.push(`${formatBinding(profileKey)}: Profile`);
        hints.push(`${formatBinding(closeKey)}: Close`);
        foot.textContent = hints.join(" · ");

        document.documentElement.appendChild(host);
        bubble = host;
        positionBubble(host);

        keyHandler = event => {
            if (event.isComposing || event.repeat) return;
            if (state.pickerOpen) {
                if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                    event.preventDefault(); event.stopPropagation();
                    if (!state.items.length) return;
                    const delta = event.key === "ArrowDown" ? 1 : -1;
                    state.index = (state.index + delta + state.items.length) % state.items.length;
                    renderPickerSelection();
                    return;
                }
                if (event.key === "Enter") {
                    event.preventDefault(); event.stopPropagation();
                    const item = state.items[state.index];
                    if (item) void applyProfile(item.id);
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault(); event.stopPropagation(); closePicker(); return;
                }
                return;
            }

            if (matches(event, closeKey)) { event.preventDefault(); event.stopPropagation(); removeBubble(); return; }
            if (payload.allowProfilePicker && matches(event, profileKey)) { event.preventDefault(); event.stopPropagation(); void openPicker(); return; }
            if (!error && matches(event, copyKey)) { event.preventDefault(); event.stopPropagation(); void doCopy(); return; }
            if (!error && payload.replaceable && matches(event, replaceKey)) { event.preventDefault(); event.stopPropagation(); doReplace(); }
        };
        document.addEventListener("keydown", keyHandler, true);
    }

    function removeBubble() {
        if (keyHandler) document.removeEventListener("keydown", keyHandler, true);
        keyHandler = null;
        bubble?.remove();
        bubble = null;
    }

    function positionBubble(host) {
        const anchor = anchorRect();
        requestAnimationFrame(() => {
            const box = host.getBoundingClientRect();
            const margin = 12;
            let left = anchor?.left ?? margin;
            let top = (anchor?.bottom ?? 28) + 8;
            if (left + box.width > innerWidth - margin) left = innerWidth - box.width - margin;
            if (top + box.height > innerHeight - margin) top = Math.max(margin, (anchor?.top ?? innerHeight / 2) - box.height - 8);
            host.style.left = `${Math.max(margin, Math.round(left))}px`;
            host.style.top = `${Math.max(margin, Math.round(top))}px`;
        });
    }

    function anchorRect() {
        try {
            if (["control", "editable-all", "hovered"].includes(target?.type) && target.element?.isConnected) return target.element.getBoundingClientRect();
            if (target?.range) return target.range.getBoundingClientRect();
        } catch {}
        return null;
    }

    function replaceTarget(value) {
        try {
            if (target?.type === "control") {
                const { element, start, end } = target;
                if (!element?.isConnected) return false;
                const next = `${element.value.slice(0, start)}${value}${element.value.slice(end)}`;
                setNativeValue(element, next);
                const caret = start + value.length;
                element.focus();
                element.setSelectionRange?.(caret, caret);
                element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
                element.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            }

            if (target?.type === "range") {
                const { range, editableHost } = target;
                if (!range) return false;
                const selection = window.getSelection();
                selection.removeAllRanges(); selection.addRange(range); editableHost?.focus?.();
                if (document.execCommand?.("insertText", false, value)) return true;
                range.deleteContents();
                const node = document.createTextNode(value);
                range.insertNode(node); range.setStartAfter(node); range.collapse(true);
                selection.removeAllRanges(); selection.addRange(range);
                editableHost?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
                return true;
            }

            if (target?.type === "editable-all") {
                const element = target.element;
                if (!element?.isConnected) return false;
                element.focus();
                const range = document.createRange(); range.selectNodeContents(element);
                const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                if (document.execCommand?.("insertText", false, value)) return true;
                element.textContent = value;
                element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
                return true;
            }
        } catch (e) { console.warn("CipherVault replacement failed:", e); }
        return false;
    }

    function setNativeValue(element, value) {
        const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter ? setter.call(element, value) : (element.value = value);
    }

    async function copyText(value) {
        try { await navigator.clipboard.writeText(value); return true; }
        catch {
            try {
                const area = document.createElement("textarea");
                area.value = value; area.style.position = "fixed"; area.style.opacity = "0";
                document.body.appendChild(area); area.select();
                const ok = document.execCommand("copy"); area.remove(); return ok;
            } catch { return false; }
        }
    }

    function deepActiveElement() {
        let active = document.activeElement;
        const seen = new Set();
        while (active && !seen.has(active)) {
            seen.add(active);
            const next = active.shadowRoot?.activeElement;
            if (!next) break;
            active = next;
        }
        return active;
    }

    function editableHost(active) {
        if (active?.isContentEditable) return active;
        return active?.closest?.("[contenteditable='true'],[contenteditable='plaintext-only']") || null;
    }

    function bestSelection(active) {
        const candidates = [];
        try { candidates.push(window.getSelection?.()); } catch {}
        try { candidates.push(document.getSelection?.()); } catch {}
        try {
            const root = active?.getRootNode?.();
            if (root && root !== document && typeof root.getSelection === "function") candidates.push(root.getSelection());
        } catch {}
        return candidates.find(s => s && !s.isCollapsed && s.rangeCount && s.toString()) || candidates.find(Boolean) || null;
    }

    function isTextControl(element) {
        if (element instanceof HTMLTextAreaElement) return true;
        return element instanceof HTMLInputElement && ["text", "search", "email", "url", "tel"].includes((element.type || "text").toLowerCase());
    }

    function isGoogleChat() {
        return ["chat.google.com", "mail.google.com"].includes(String(location.hostname || "").toLowerCase());
    }

    function isInteractive(element) {
        return Boolean(element.closest?.("button,[role='button'],input,textarea,select,option,[contenteditable='true'],[contenteditable='plaintext-only']"));
    }

    function cleanText(value) {
        return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    function reasonableText(text, element) {
        if (!text || text.length < 2 || text.length > 12000) return false;
        if (/^(\d{1,2}:\d{2}|AM|PM|Today|Yesterday)$/i.test(text)) return false;
        const rect = element.getBoundingClientRect?.();
        return !(rect && (rect.width < 2 || rect.height < 2));
    }

    function payloadLines(text) {
        const lines = String(text || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
        const payloads = lines.filter(isPayload);
        return payloads.length ? payloads.join("\n") : "";
    }

    function looksLikeCipherText(text) {
        const lines = String(text || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
        return Boolean(lines.length && lines.every(isPayload));
    }

    function isPayload(value) {
        try {
            const raw = String(value || "").replace(/\s+/g, "");
            const binary = atob(raw);
            return Boolean(raw && binary.length >= 45 && binary.charCodeAt(0) === 1);
        } catch { return false; }
    }

    function normalizeSettings(value) {
        const source = value && typeof value === "object" ? value : {};
        const actions = source.actions && typeof source.actions === "object" ? source.actions : {};
        const smart = source.smartTarget && typeof source.smartTarget === "object" ? source.smartTarget : {};
        return {
            actions: {
                copy: normalizeBinding(actions.copy, DEFAULTS.actions.copy),
                replace: normalizeBinding(actions.replace, DEFAULTS.actions.replace),
                profile: normalizeBinding(actions.profile, DEFAULTS.actions.profile),
                close: normalizeBinding(actions.close, DEFAULTS.actions.close)
            },
            smartTarget: {
                focusedEditor: smart.focusedEditor !== false,
                hoveredGoogleChat: smart.hoveredGoogleChat !== false
            }
        };
    }

    function normalizeBinding(value, fallback) {
        if (!value || typeof value !== "object" || typeof value.key !== "string" || !value.key.trim()) return { ...fallback };
        return {
            key: value.key.length === 1 ? value.key.toLowerCase() : value.key,
            ctrl: Boolean(value.ctrl), shift: Boolean(value.shift), alt: Boolean(value.alt), meta: Boolean(value.meta)
        };
    }

    function matches(event, binding) {
        const a = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const b = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;
        return a === b && Boolean(event.ctrlKey) === binding.ctrl && Boolean(event.shiftKey) === binding.shift && Boolean(event.altKey) === binding.alt && Boolean(event.metaKey) === binding.meta;
    }

    function formatBinding(binding) {
        const parts = [];
        if (binding.ctrl) parts.push("Ctrl");
        if (binding.alt) parts.push("Alt");
        if (binding.shift) parts.push("Shift");
        if (binding.meta) parts.push("Cmd");
        let key = binding.key;
        if (key === "Escape") key = "Esc";
        else if (key === " ") key = "Space";
        else if (key.length === 1) key = key.toUpperCase();
        parts.push(key);
        return parts.join("+");
    }

    function escapeHtml(value) {
        return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }
})();
