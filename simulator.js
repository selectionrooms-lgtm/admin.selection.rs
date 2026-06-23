// simulator.js — Real-Time Preview Stage Matrix
export function osveziZiviPreview(trenutniConfigParam) {
    const trenutniConfig = trenutniConfigParam || window.trenutniConfig;
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

        const stilKontejnera = `background: ${bojaKontejnera}; padding: 22px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%; color: #fff;`;
        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();
        const aktivniIndex = window.aktivniIndex !== undefined ? window.aktivniIndex : -1;

        if (aktivniIndex === null || aktivniIndex === -1) {
            if (statusTag) statusTag.innerText = "Stage: Intro Display Loader";
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

            target.innerHTML = `
                <div style="width: 100%; text-align:center;">
                    <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.6rem; text-transform: uppercase; letter-spacing:2px; margin-bottom:5px;">${pName}</h1>
                    <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem; margin-bottom:20px;">${pSub}</h2>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; opacity: 0.5;">[ Expedition rules stream matrix display zone... ]</p>
                    </div>
                </div>
            `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (!blok) return;
            if (statusTag) statusTag.innerText = `Stage: Block #${aktivniIndex + 1} (${blok.type.toUpperCase()})`;

            if (blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Cinematic Video Loaded');
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background:#000;">
                        <i class="fa-solid fa-circle-play" style="font-size: 30px; color: ${bojaH1}; margin-bottom: 5px;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; display:block;">${vName}</span>
                    </div>
                `;
            }
            else if (blok.type === 'chapter') {
                target.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.1rem; margin-bottom:2px;">${blok.title || 'Header String'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.85rem; margin-bottom: 10px;">${blok.subtitle || ''}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; line-height: 1.4; opacity:0.85;">[ Staged chapter text viewport ]</p>
                        <button style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 5px 10px; font-size: 0.75rem; border-radius: 6px; margin-top: 10px; font-weight:600;">${blok.nextButtonText || 'Continue →'}</button>
                    </div>
                `;
            }
            else if (blok.type === 'gate') {
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 18px; color: ${bojaH1}; margin-bottom: 8px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.05rem; margin-bottom: 12px;">${blok.hint || 'Passphrase required'}</h1>
                        <input type="text" placeholder="${blok.placeholder || 'Type here...'}" disabled style="width: 80%; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); text-align: center; color: #fff; font-size: 0.7rem; margin-bottom:6px;">
                        <button style="background: ${bojaH1}; color: #000; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.7rem; font-weight:700; display:block; margin:0 auto;">${blok.buttonText || 'Verify'}</button>
                    </div>
                `;
            }
            else if (blok.type === 'finale') {
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 25px 15px;">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.3rem; margin-bottom: 5px;">${blok.finalLoveMessage || 'End Matrix'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem;">${blok.finalSignature || ''}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Crash in live simulator pipeline preview:", err);
    }
}

export function promeniRezimSimulatora(rezim) {
    const panel = document.getElementById('global-preview-panel');
    const ekran = document.getElementById('live-simulator-screen');
    const btnMobile = document.getElementById('btn-mode-mobile');
    const btnPc = document.getElementById('btn-mode-pc');
    const srednjiPanel = document.getElementById('main-saas-workspace');

    if (!panel || !ekran || !btnMobile || !btnPc) return;

    if (rezim === 'pc') {
        if (srednjiPanel) { srednjiPanel.style.setProperty('flex', 'none', 'important'); srednjiPanel.style.setProperty('width', '40%', 'important'); }
        panel.style.setProperty('flex', 'none', 'important'); panel.style.setProperty('width', '45%', 'important'); panel.style.setProperty('max-width', 'none', 'important');
        ekran.style.setProperty('border-radius', '8px', 'important'); ekran.style.setProperty('max-width', '800px', 'important');
        btnPc.style.backgroundColor = "var(--admin-accent)"; btnPc.style.color = "var(--admin-sidebar)";
        btnMobile.style.backgroundColor = "transparent"; btnMobile.style.color = "var(--admin-muted)";
    } else {
        if (srednjiPanel) { srednjiPanel.style.setProperty('flex', '1', 'important'); srednjiPanel.style.setProperty('width', 'auto', 'important'); }
        panel.style.setProperty('flex', '0.75', 'important'); panel.style.setProperty('width', 'auto', 'important'); panel.style.setProperty('max-width', '360px', 'important');
        ekran.style.setProperty('border-radius', '24px', 'important'); ekran.style.setProperty('max-width', '100%', 'important');
        btnMobile.style.backgroundColor = "var(--admin-accent)"; btnMobile.style.color = "var(--admin-sidebar)";
        btnPc.style.backgroundColor = "transparent"; btnPc.style.color = "var(--admin-muted)";
    }
    osveziZiviPreview();
}

// Vezivanje funkcija na prozor za HTML drajvere
window.promeniRezimSimulatora = promeniRezimSimulatora;
window.osveziZiviPreview = osveziZiviPreview;