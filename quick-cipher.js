"use strict";

(() => {
    if (globalThis.__cipherVaultQuickCipherInjected) {
        return;
    }

    globalThis.__cipherVaultQuickCipherInjected = true;

    let capturedTarget = null;
    let bubbleHost = null;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message?.type === "CV_QUICK_CAPTURE") {
            sendResponse(captureText());
            return;
        }

        if (message?.type === "CV_QUICK_SHOW_RESULT") {
            showBubble(message.payload || {});
            sendResponse({ ok: true });
        }
    });

    function captureText() {
        removeBubble();

        const active = getDeepActiveElement();

        if (isTextControl(active)) {
            const start = Number.isInteger(active.selectionStart) ? active.selectionStart : 0;
            const end = Number.isInteger(active.selectionEnd) ? active.selectionEnd : start;

            if (end > start) {
                capturedTarget = {
                    type: "text-control",
                    element: active,
                    start,
                    end
                };

                return {
                    ok: true,
                    text: active.value.slice(start, end),
                    replaceable: true,
                    captureKind: "selection",
                    frameFocused: document.hasFocus()
                };
            }

            if (active.value) {
                capturedTarget = {
                    type: "text-control",
                    element: active,
                    start: 0,
                    end: active.value.length
                };

                return {
                    ok: true,
                    text: active.value,
                    replaceable: true,
                    captureKind: "focused-field",
                    frameFocused: document.hasFocus()
                };
            }
        }

        const editable = active?.isContentEditable
            ? active
            : active?.closest?.("[contenteditable='true'], [contenteditable='plaintext-only']");

        if (editable) {
            const selection = getBestSelection(active);

            if (selection && !selection.isCollapsed && selection.rangeCount) {
                const range = selection.getRangeAt(0).cloneRange();
                const text = selection.toString();

                if (text) {
                    capturedTarget = {
                        type: "range",
                        range,
                        editableHost: editable
                    };

                    return {
                        ok: true,
                        text,
                        replaceable: true,
                        captureKind: "selection",
                        frameFocused: document.hasFocus()
                    };
                }
            }

            const fullText = editable.innerText || editable.textContent || "";

            if (fullText) {
                capturedTarget = {
                    type: "contenteditable-all",
                    element: editable
                };

                return {
                    ok: true,
                    text: fullText,
                    replaceable: true,
                    captureKind: "focused-field",
                    frameFocused: document.hasFocus()
                };
            }
        }

        const selection = getBestSelection(active);

        if (selection && !selection.isCollapsed && selection.rangeCount) {
            const range = selection.getRangeAt(0).cloneRange();
            const text = selection.toString();

            if (text) {
                capturedTarget = {
                    type: "readonly-selection",
                    range
                };

                return {
                    ok: true,
                    text,
                    replaceable: false,
                    captureKind: "selection",
                    frameFocused: document.hasFocus()
                };
            }
        }

        capturedTarget = null;

        return {
            ok: false,
            message: "Select some text first.",
            replaceable: false,
            captureKind: "none",
            frameFocused: document.hasFocus()
        };
    }


    function getDeepActiveElement() {
        let active = document.activeElement;
        const seen = new Set();

        while (active && !seen.has(active)) {
            seen.add(active);
            const shadowActive = active.shadowRoot?.activeElement;

            if (!shadowActive) {
                break;
            }

            active = shadowActive;
        }

        return active;
    }

    function getBestSelection(activeElement) {
        const candidates = [];

        try {
            candidates.push(window.getSelection?.());
        } catch {}

        try {
            candidates.push(document.getSelection?.());
        } catch {}

        try {
            const rootNode = activeElement?.getRootNode?.();
            if (rootNode && rootNode !== document && typeof rootNode.getSelection === "function") {
                candidates.push(rootNode.getSelection());
            }
        } catch {}

        for (const selection of candidates) {
            if (selection && !selection.isCollapsed && selection.rangeCount && selection.toString()) {
                return selection;
            }
        }

        return candidates.find(Boolean) || null;
    }

    function isTextControl(element) {
        if (!element) {
            return false;
        }

        if (element instanceof HTMLTextAreaElement) {
            return true;
        }

        if (!(element instanceof HTMLInputElement)) {
            return false;
        }

        return ["text", "search", "email", "url", "tel"].includes(
            (element.type || "text").toLowerCase()
        );
    }

    function removeBubble() {
        bubbleHost?.remove();
        bubbleHost = null;
    }

    function showBubble(payload) {
        removeBubble();

        const isLight = payload.theme === "light";
        const isError = payload.status === "error";
        const host = document.createElement("div");

        host.setAttribute("data-ciphervault-quick", "");
        host.style.position = "fixed";
        host.style.zIndex = "2147483647";
        host.style.left = "20px";
        host.style.top = "20px";
        host.style.width = "min(390px, calc(100vw - 24px))";
        host.style.pointerEvents = "auto";

        const shadow = host.attachShadow({ mode: "open" });

        shadow.innerHTML = `
            <style>
                :host { all: initial; }
                *, *::before, *::after { box-sizing: border-box; }
                .card {
                    width: 100%; overflow: hidden;
                    border: 1px solid ${isLight ? "rgba(15,23,42,.14)" : "rgba(255,255,255,.12)"};
                    border-radius: 15px;
                    background: ${isLight ? "#ffffff" : "#0b151b"};
                    color: ${isLight ? "#111827" : "#f5f8f9"};
                    box-shadow: 0 18px 55px rgba(0,0,0,.28);
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .head { display:flex; align-items:center; gap:9px; padding:11px 12px; border-bottom:1px solid ${isLight ? "rgba(15,23,42,.08)" : "rgba(255,255,255,.08)"}; }
                .mark { width:22px; height:22px; display:grid; place-items:center; border:2px solid #54ffc2; transform:rotate(30deg); border-radius:5px; }
                .mark::after { content:""; width:8px; height:8px; border:2px solid #22dfb1; border-radius:2px; }
                .title { font-size:13px; font-weight:800; letter-spacing:-.01em; }
                .title strong { color:#54ffc2; }
                .profile { min-width:0; max-width:125px; margin-left:auto; overflow:hidden; color:${isLight ? "#667085" : "#8d9aa5"}; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
                .close { width:27px; height:27px; display:grid; place-items:center; border:0; border-radius:8px; background:transparent; color:${isLight ? "#667085" : "#9ba8b2"}; cursor:pointer; font-size:18px; }
                .close:hover { background:${isLight ? "#f1f5f9" : "#132129"}; }
                .body { padding:12px; }
                .label { margin-bottom:7px; color:${isError ? "#ff6b72" : "#54ffc2"}; font-size:9px; font-weight:850; letter-spacing:.14em; }
                .result { max-height:210px; overflow:auto; padding:11px; border:1px solid ${isLight ? "rgba(15,23,42,.10)" : "rgba(255,255,255,.08)"}; border-radius:10px; background:${isLight ? "#f4f7fa" : "#101c23"}; color:${isError ? "#ff7078" : (isLight ? "#172033" : "#eef4f5")}; font-family:${isError ? "inherit" : "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"}; font-size:11px; line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; user-select:text; }
                .actions { display:flex; gap:7px; margin-top:10px; }
                .button { min-height:36px; flex:1 1 0; border:1px solid ${isLight ? "rgba(15,23,42,.12)" : "rgba(255,255,255,.10)"}; border-radius:10px; background:${isLight ? "#f4f7fa" : "#101c23"}; color:${isLight ? "#273244" : "#d7e0e4"}; cursor:pointer; font-size:10px; font-weight:780; }
                .button:hover { border-color:rgba(84,255,194,.35); }
                .button.primary { border-color:transparent; background:linear-gradient(135deg,#64f6c8,#25dcb0); color:#03241c; }
                .foot { margin-top:8px; color:${isLight ? "#8a96a5" : "#6f7d87"}; font-size:8px; letter-spacing:.04em; }
            </style>
            <div class="card">
                <div class="head">
                    <span class="mark"></span>
                    <div class="title">Cipher<strong>Vault</strong></div>
                    <div class="profile"></div>
                    <button class="close" type="button" aria-label="Close">×</button>
                </div>
                <div class="body">
                    <div class="label"></div>
                    <div class="result"></div>
                    <div class="actions"></div>
                    <div class="foot">LOCAL ONLY · AES-256-GCM</div>
                </div>
            </div>`;

        shadow.querySelector(".profile").textContent = payload.profileName || "";
        shadow.querySelector(".label").textContent = payload.label || "CIPHERVAULT";
        shadow.querySelector(".result").textContent = isError
            ? (payload.message || "Quick Cipher failed.")
            : (payload.result || "");
        shadow.querySelector(".close").addEventListener("click", removeBubble);

        const actions = shadow.querySelector(".actions");

        if (isError) {
            actions.remove();
        } else {
            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "button primary";
            copyButton.textContent = "COPY";
            copyButton.addEventListener("click", async () => {
                const ok = await copyToClipboard(payload.result || "");
                copyButton.textContent = ok ? "✓ COPIED" : "COPY FAILED";
                window.setTimeout(() => { copyButton.textContent = "COPY"; }, 1200);
            });
            actions.appendChild(copyButton);

            if (payload.replaceable && capturedTarget) {
                const replaceButton = document.createElement("button");
                replaceButton.type = "button";
                replaceButton.className = "button";
                replaceButton.textContent = "REPLACE SELECTION";
                replaceButton.addEventListener("click", () => {
                    if (replaceCapturedText(payload.result || "")) {
                        replaceButton.textContent = "✓ REPLACED";
                        window.setTimeout(removeBubble, 550);
                    } else {
                        replaceButton.textContent = "REPLACE FAILED";
                    }
                });
                actions.appendChild(replaceButton);
            }
        }

        document.documentElement.appendChild(host);
        bubbleHost = host;
        positionBubble(host);

        const escapeHandler = event => {
            if (event.key === "Escape") {
                removeBubble();
                document.removeEventListener("keydown", escapeHandler, true);
            }
        };
        document.addEventListener("keydown", escapeHandler, true);
    }

    function positionBubble(host) {
        const anchor = getAnchorRect();
        const margin = 12;

        requestAnimationFrame(() => {
            const bubble = host.getBoundingClientRect();
            let left = anchor?.left ?? margin;
            let top = (anchor?.bottom ?? 28) + 8;

            if (left + bubble.width > window.innerWidth - margin) {
                left = window.innerWidth - bubble.width - margin;
            }
            left = Math.max(margin, left);

            if (top + bubble.height > window.innerHeight - margin) {
                top = Math.max(margin, (anchor?.top ?? window.innerHeight / 2) - bubble.height - 8);
            }

            host.style.left = `${Math.round(left)}px`;
            host.style.top = `${Math.round(top)}px`;
        });
    }

    function getAnchorRect() {
        try {
            if (capturedTarget?.type === "text-control" && capturedTarget.element?.isConnected) {
                return capturedTarget.element.getBoundingClientRect();
            }
            if (capturedTarget?.type === "contenteditable-all" && capturedTarget.element?.isConnected) {
                return capturedTarget.element.getBoundingClientRect();
            }
            if (capturedTarget?.range) {
                return capturedTarget.range.getBoundingClientRect();
            }
        } catch {
            return null;
        }

        return null;
    }

    function replaceCapturedText(value) {
        try {
            if (capturedTarget?.type === "text-control") {
                const { element, start, end } = capturedTarget;

                if (!element?.isConnected) {
                    return false;
                }

                const newValue = `${element.value.slice(0, start)}${value}${element.value.slice(end)}`;
                setNativeControlValue(element, newValue);

                const caret = start + value.length;
                element.focus();
                element.setSelectionRange?.(caret, caret);
                element.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    inputType: "insertText",
                    data: value
                }));
                element.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            }

            if (capturedTarget?.type === "range") {
                const range = capturedTarget.range;
                const editableHost = capturedTarget.editableHost;

                if (!range) {
                    return false;
                }

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                editableHost?.focus?.();

                if (document.execCommand?.("insertText", false, value)) {
                    return true;
                }

                range.deleteContents();
                const node = document.createTextNode(value);
                range.insertNode(node);
                range.setStartAfter(node);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                editableHost?.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    inputType: "insertText",
                    data: value
                }));
                return true;
            }

            if (capturedTarget?.type === "contenteditable-all") {
                const element = capturedTarget.element;

                if (!element?.isConnected) {
                    return false;
                }

                element.focus();
                const range = document.createRange();
                range.selectNodeContents(element);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);

                if (document.execCommand?.("insertText", false, value)) {
                    return true;
                }

                element.textContent = value;
                element.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    inputType: "insertText",
                    data: value
                }));
                return true;
            }
        } catch (error) {
            console.warn("CipherVault replacement failed:", error);
        }

        return false;
    }

    function setNativeControlValue(element, value) {
        const prototype = element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

        if (descriptor?.set) {
            descriptor.set.call(element, value);
        } else {
            element.value = value;
        }
    }

    async function copyToClipboard(value) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            try {
                const area = document.createElement("textarea");
                area.value = value;
                area.style.position = "fixed";
                area.style.opacity = "0";
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand("copy");
                area.remove();
                return ok;
            } catch {
                return false;
            }
        }
    }
})();
