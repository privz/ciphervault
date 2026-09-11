"use strict";

(() => {
    if (globalThis.__cipherVaultNeumorphV130) {
        globalThis.__cipherVaultNeumorphV130.scan();
        return;
    }

    const enhanced = new WeakSet();

    const api = { scan };
    globalThis.__cipherVaultNeumorphV130 = api;

    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();

    function scan() {
        document.querySelectorAll("[data-ciphervault-quick]").forEach(enhance);
    }

    function enhance(host) {
        if (enhanced.has(host) || !host.shadowRoot) return;
        enhanced.add(host);

        const card = host.shadowRoot.querySelector(".card");
        const computed = card ? getComputedStyle(card).backgroundColor : "";
        const rgb = computed.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
        const light = rgb.length >= 3 && (rgb[0] + rgb[1] + rgb[2]) / 3 > 150;

        const style = document.createElement("style");
        style.dataset.ciphervaultNeumorph = "v130";
        style.textContent = light ? lightCss() : darkCss();
        host.shadowRoot.appendChild(style);
    }

    function darkCss() {
        return `
:host{--cv-bg:#182630;--cv-fg:#f3f8f7;--cv-soft:#aab8bf;--cv-muted:#73838c;--cv-accent:#48f0bd;--cv-light:rgba(255,255,255,.075);--cv-dark:rgba(0,0,0,.46);--cv-raised:9px 9px 18px var(--cv-dark),-8px -8px 16px var(--cv-light);--cv-raised-sm:5px 5px 10px var(--cv-dark),-4px -4px 9px var(--cv-light);--cv-inset:inset 5px 5px 10px var(--cv-dark),inset -5px -5px 10px var(--cv-light)}
.card{border:0!important;border-radius:22px!important;background:var(--cv-bg)!important;color:var(--cv-fg)!important;box-shadow:var(--cv-raised)!important}
.head{padding:13px 14px!important;border:0!important}.mark{border-color:var(--cv-accent)!important;box-shadow:0 0 13px rgba(72,240,189,.32)!important}.title b{color:var(--cv-accent)!important}.profile,.close{border:0!important;background:var(--cv-bg)!important;color:var(--cv-soft)!important;box-shadow:var(--cv-raised-sm)!important}.profile:hover,.close:hover{color:var(--cv-accent)!important}.profile:active,.close:active{box-shadow:var(--cv-inset)!important}
.body{padding:14px!important}.label{color:var(--cv-accent)!important;text-shadow:0 0 12px rgba(72,240,189,.25)!important}.result{border:0!important;border-radius:15px!important;background:var(--cv-bg)!important;color:var(--cv-fg)!important;box-shadow:var(--cv-inset)!important;padding:13px!important}.actions{gap:10px!important;margin-top:13px!important}.btn{min-height:40px!important;border:0!important;border-radius:999px!important;background:var(--cv-bg)!important;color:var(--cv-soft)!important;box-shadow:var(--cv-raised-sm)!important}.btn:hover{color:var(--cv-accent)!important}.btn:active{box-shadow:var(--cv-inset)!important}.btn.primary{background:linear-gradient(145deg,#56f4c4,#20d7a2)!important;color:#08291f!important;box-shadow:0 0 18px rgba(72,240,189,.26),var(--cv-raised-sm)!important}.kbd{color:inherit!important}.foot{margin-top:12px!important;color:var(--cv-muted)!important}.picker{margin-top:12px!important;padding:10px!important;border:0!important;border-radius:15px!important;background:var(--cv-bg)!important;box-shadow:var(--cv-inset)!important}.picker-title{color:var(--cv-accent)!important}.pick{border:0!important;border-radius:12px!important;background:transparent!important;color:var(--cv-fg)!important}.pick.active,.pick:hover{background:var(--cv-bg)!important;color:var(--cv-accent)!important;box-shadow:var(--cv-raised-sm)!important}.empty{color:var(--cv-soft)!important}`;
    }

    function lightCss() {
        return `
:host{--cv-bg:#e7edf3;--cv-fg:#26364d;--cv-soft:#607188;--cv-muted:#8290a1;--cv-accent:#19c996;--cv-light:rgba(255,255,255,.96);--cv-dark:rgba(164,176,190,.48);--cv-raised:9px 9px 18px var(--cv-dark),-9px -9px 18px var(--cv-light);--cv-raised-sm:5px 5px 10px var(--cv-dark),-5px -5px 10px var(--cv-light);--cv-inset:inset 5px 5px 10px var(--cv-dark),inset -5px -5px 10px var(--cv-light)}
.card{border:0!important;border-radius:22px!important;background:var(--cv-bg)!important;color:var(--cv-fg)!important;box-shadow:var(--cv-raised)!important}
.head{padding:13px 14px!important;border:0!important}.mark{border-color:var(--cv-accent)!important;box-shadow:0 0 13px rgba(25,201,150,.26)!important}.title b{color:var(--cv-accent)!important}.profile,.close{border:0!important;background:var(--cv-bg)!important;color:var(--cv-soft)!important;box-shadow:var(--cv-raised-sm)!important}.profile:hover,.close:hover{color:var(--cv-accent)!important}.profile:active,.close:active{box-shadow:var(--cv-inset)!important}
.body{padding:14px!important}.label{color:var(--cv-accent)!important;text-shadow:0 0 10px rgba(25,201,150,.18)!important}.result{border:0!important;border-radius:15px!important;background:var(--cv-bg)!important;color:var(--cv-fg)!important;box-shadow:var(--cv-inset)!important;padding:13px!important}.actions{gap:10px!important;margin-top:13px!important}.btn{min-height:40px!important;border:0!important;border-radius:999px!important;background:var(--cv-bg)!important;color:var(--cv-soft)!important;box-shadow:var(--cv-raised-sm)!important}.btn:hover{color:var(--cv-accent)!important}.btn:active{box-shadow:var(--cv-inset)!important}.btn.primary{background:linear-gradient(145deg,#55e1b9,#19c996)!important;color:#08382c!important;box-shadow:0 0 16px rgba(25,201,150,.20),var(--cv-raised-sm)!important}.kbd{color:inherit!important}.foot{margin-top:12px!important;color:var(--cv-muted)!important}.picker{margin-top:12px!important;padding:10px!important;border:0!important;border-radius:15px!important;background:var(--cv-bg)!important;box-shadow:var(--cv-inset)!important}.picker-title{color:var(--cv-accent)!important}.pick{border:0!important;border-radius:12px!important;background:transparent!important;color:var(--cv-fg)!important}.pick.active,.pick:hover{background:var(--cv-bg)!important;color:var(--cv-accent)!important;box-shadow:var(--cv-raised-sm)!important}.empty{color:var(--cv-soft)!important}`;
    }
})();
