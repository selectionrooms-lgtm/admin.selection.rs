// simulator.js — Real-Time Preview Stage Matrix
export function osveziZiviPreview(trenutniConfig) {
    if (!trenutniConfig) return;

    try {
        const bojaPozadine = document.getElementById('input-boja-pozadina')?.value || '#0f171e';
        const bojaKontejnera = document.getElementById('input-boja-kontejner')?.value || '#1c2a39';
        const bojaH1 = document.getElementById('color-h1')?.value || '#d4b483';
        const bojaH2 = document.getElementById('color-h2')?.value || '#d4b483';
        const bojaP = document.getElementById('color-p')?.value || '#eeeeee';

        const fontH1 = document.getElementById('font-h1')?.value || 'Cinzel';
        const fontH2 = document.getElementById('font-h2')?.value || 'Cormorant Garamond';
        const fontP = document.getElementById('font-p')?.value || 'Montserrat';

        const simulator = document.getElementById('live-simulator-screen');
        const target = document.getElementById('simulator-content-target');
        const statusTag = document.getElementById('preview-status-tag');

        if (!simulator || !target) return;

        simulator.style.backgroundColor = bojaPozadine;
        let slikaZaPrikaz = trenutniConfig.config?.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina')?.value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        simulator.style.backgroundImage = slikaZaPrikaz ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')` : 'none';
        simulator.style.backgroundSize = 'cover'; simulator.style.backgroundPosition = 'center';

        const stilKontejnera = `background: ${bojaKontejnera}; padding: 22px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%;`;
        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();
        const aktivniIndex = window.getAktivniIndex ? window.getAktivniIndex() : null;

        if (aktivniIndex === null || aktivniIndex === -1) {
            if (statusTag) statusTag.innerText = "Display Režim: Intro Screen Matrix";
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

            target.innerHTML = `
                <div style="width: 100%; text-align:center;">
                    <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.8rem; text-transform: uppercase; letter-spacing:2px; margin-bottom:5px;">${pName}</h1>
                    <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1rem; margin-bottom:20px;">${pSub}</h2>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; opacity: 0.5;">[ Expedition regulatory conditions rules list stream... ]</p>
                    </div>
                </div>
            `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (statusTag) statusTag.innerText = `Display Režim: Card Block #${aktivniIndex + 1} (${blok.type.toUpperCase()})`;

            if (blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'No structural file loaded');
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background:#000;">
                        <i class="fa-solid fa-circle-play" style="font-size: 30px; color: ${bojaH1}; margin-bottom: 5px;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; display:block;">${vName}</span>
                    </div>
                `;
            }
            else if (blok.type === 'chapter') {
                const t = document.getElementById('zoom-field-title')?.value || blok.title || 'Header String';
                const s = document.getElementById('zoom-field-subtitle')?.value || blok.subtitle || 'Sub-label Context';
                const btnT = document.getElementById('zoom-field-nextButtonText')?.value || blok.nextButtonText || 'Continue';

                target.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.2rem; margin-bottom:2px;">${t}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.85rem; margin-bottom: 10px;">${s}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; line-height: 1.4; opacity:0.85;">[ Chapter node narrative section paragraph line... ]</p>
                        <button style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 5px 10px; font-size: 0.75rem; border-radius: 6px; margin-top: 10px; font-weight:600;">${btnT}</button>
                    </div>
                `;
            }
            else if (blok.type === 'gate') {
                const hint = document.getElementById('zoom-field-hint')?.value || blok.hint || 'Credential input requested';
                const placeholder = document.getElementById('zoom-field-placeholder')?.value || blok.placeholder || 'Passphrase field...';
                const btnText = document.getElementById('zoom-field-buttonText')?.value || blok.buttonText || 'Verify';

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 18px; color: ${bojaH1}; margin-bottom: 8px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.1rem; margin-bottom: 12px;">${hint}</h1>
                        <input type="text" placeholder="${placeholder}" disabled style="width: 80%; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); text-align: center; color: #fff; font-size: 0.7rem; margin-bottom:6px;">
                        <button style="background: ${bojaH1}; color: ${bojaPozadine}; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.7rem; font-weight:700; display:block; margin:0 auto;">${btnText}</button>
                    </div>
                `;
            }
            else if (blok.type === 'finale') {
                const msg = document.getElementById('zoom-field-finalLoveMessage')?.value || blok.finalLoveMessage || 'End Credits';
                const sig = document.getElementById('zoom-field-finalSignature')?.value || blok.finalSignature || 'Selection Core';

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 25px 15px;">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.4rem; margin-bottom: 5px;">${msg}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1rem;">${sig}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Critical crash inside real-time preview pipeline simulator link:", err);
    }
}

export function promeniRezimSimulatora(rezim) {
    const panel = document.getElementById('global-preview-panel');
    const ekran = document.getElementById('live-simulator-screen');
    const btnMobile = document.getElementById('btn-mode-mobile');
    const btnPc = document.getElementById('btn-mode-pc');
    const srednjiPanel = document.querySelector('.main-workspace');

    if (!panel || !ekran || !btnMobile || !btnPc) return;

    if (rezim === 'pc') {
        if (srednjiPanel) { srednjiPanel.style.flex = "none"; srednjiPanel.style.width = "40%"; }
        panel.style.flex = "none"; panel.style.width = "60%"; panel.style.maxWidth = "none";
        ekran.style.borderRadius = "8px"; ekran.style.border = "1px solid var(--admin-border)"; ekran.style.width = "100%"; ekran.style.maxWidth = "800px";
        btnPc.style.backgroundColor = "var(--admin-accent)"; btnPc.style.color = "var(--admin-sidebar)";
        btnMobile.style.backgroundColor = "transparent"; btnMobile.style.color = "var(--admin-muted)";
    } else {
        if (srednjiPanel) { srednjiPanel.style.flex = "1"; srednjiPanel.style.width = "auto"; }
        panel.style.flex = "0.75"; panel.style.width = "auto"; panel.style.maxWidth = "360px";
        ekran.style.borderRadius = "24px"; ekran.style.border = "4px solid #1c2a39"; ekran.style.width = "100%"; ekran.style.maxWidth = "100%";
        btnMobile.style.backgroundColor = "var(--admin-accent)"; btnMobile.style.color = "var(--admin-sidebar)";
        btnPc.style.backgroundColor = "transparent"; btnPc.style.color = "var(--admin-muted)";
    }
    if (window.okiniPreviewUpdate) window.okiniPreviewUpdate();
}