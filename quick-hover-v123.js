"use strict";

(() => {
    if (globalThis.__cipherVaultHoverV123Injected) return;
    globalThis.__cipherVaultHoverV123Injected = true;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== "CV_V123_HOVER_CAPTURE") return;
        sendResponse(captureHoveredMessage());
    });

    function captureHoveredMessage() {
        if (!isGoogleChat()) return { ok: false, frameFocused: document.hasFocus() };

        let hovered = [];
        try { hovered = Array.from(document.querySelectorAll(":hover")).reverse(); }
        catch { return { ok: false, frameFocused: document.hasFocus() }; }

        const candidates = [];
        const seen = new Set();

        hovered.forEach((element, depthIndex) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            seen.add(element);
            if (element === document.body || element === document.documentElement) return;
            if (element.closest?.("[data-ciphervault-quick]")) return;
            if (isInteractive(element)) return;

            const rect = safeRect(element);
            if (!rect || rect.width < 3 || rect.height < 3) return;

            const tooTall = rect.height > Math.max(420, innerHeight * 0.58);
            const tooWideAndTall = rect.width > innerWidth * 0.92 && rect.height > 220;
            if (tooTall || tooWideAndTall) return;

            const raw = cleanText(element.innerText || element.textContent || "");
            if (!raw || raw.length < 2 || raw.length > 6000) return;

            const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            const payloads = lines.filter(isPayload);

            if (payloads.length > 1) return;
            if (countMessageContainers(element) > 1) return;

            const significantChildren = Array.from(element.children || []).filter(child => {
                const text = cleanText(child.innerText || child.textContent || "");
                return text.length >= 2;
            }).length;

            if (!payloads.length) {
                if (raw.length > 1800 || lines.length > 12) return;
                if (significantChildren > 5 && raw.length > 420) return;
                if (looksLikeChrome(raw)) return;
            }

            const text = payloads[0] || raw;
            const strongIntent = payloads.length === 1 || isPayload(text);
            let score = strongIntent ? 10000 : 1000;
            score += Math.max(0, 220 - depthIndex * 18);
            score += element.childElementCount <= 3 ? 120 : 0;
            score += raw.length <= 700 ? 100 : 0;
            score -= Math.min(500, raw.length * 0.08);
            score -= Math.min(350, rect.height * 0.18);

            candidates.push({ element, raw, text, lines: lines.length, strongIntent, score, depthIndex });
        });

        if (!candidates.length) {
            return { ok: false, frameFocused: document.hasFocus() };
        }

        const strong = candidates.filter(item => item.strongIntent);
        let best;

        if (strong.length) {
            best = strong.sort((a, b) => {
                const len = a.raw.length - b.raw.length;
                return len || b.score - a.score;
            })[0];
        } else {
            const deepest = candidates.sort((a, b) => a.depthIndex - b.depthIndex || b.score - a.score)[0];
            const maxLength = Math.max(deepest.raw.length + 140, Math.ceil(deepest.raw.length * 2.4));
            const related = candidates.filter(item =>
                item.raw.includes(deepest.raw) &&
                item.raw.length <= maxLength &&
                item.lines <= 8
            );
            best = related.sort((a, b) => b.raw.length - a.raw.length || b.score - a.score)[0] || deepest;
        }

        return {
            ok: true,
            text: best.text,
            replaceable: false,
            captureKind: "hovered-message",
            strongIntent: Boolean(best.strongIntent),
            frameFocused: document.hasFocus(),
            source: "google-chat-hover-v123"
        };
    }

    function countMessageContainers(element) {
        try {
            return element.querySelectorAll("[data-message-id], [data-message-id][role], [role='listitem']").length;
        } catch {
            return 0;
        }
    }

    function safeRect(element) {
        try { return element.getBoundingClientRect(); }
        catch { return null; }
    }

    function isGoogleChat() {
        return ["chat.google.com", "mail.google.com"].includes(String(location.hostname || "").toLowerCase());
    }

    function isInteractive(element) {
        return Boolean(element.closest?.("button,[role='button'],input,textarea,select,option,[contenteditable='true'],[contenteditable='plaintext-only']"));
    }

    function cleanText(value) {
        return String(value || "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function looksLikeChrome(text) {
        return /^(Today|Yesterday|New messages|Reply|Forward|React|More options|Edited|You)$/i.test(text);
    }

    function isPayload(value) {
        try {
            const raw = String(value || "").replace(/\s+/g, "");
            const binary = atob(raw);
            return Boolean(raw && binary.length >= 45 && binary.charCodeAt(0) === 1);
        } catch {
            return false;
        }
    }
})();
