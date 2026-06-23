/* ==========================================================================
   📺 SELECTION CANVAS — REAL-TIME PREVIEW ENGINE (Original Core V1)
   ========================================================================== */

export function osveziZiviPreview(trenutniConfigParam) {
    const trenutniConfig = trenutniConfigParam || window.trenutniConfig;
    if (!trenutniConfig) return;

    try {
        // 🎨 Dinamičke boje iz konzole sa gvozdenim fallback-om na tvoju paletu
        const bojaPozadine = document.getElementById('input-boja-pozadina')?.value || '#0f171e';
        const bojaKontejnera = document.getElementById('input-boja-kontejner')?.value || '#1c2a39';
        const bojaH1 = document.getElementById('color-h1')?.value || '#d4b483';
        const bojaH2 = document.getElementById('color-h2')?.value || '#d4b483';
        const bojaP = document.getElementById('color-p')?.value || '#eeeeee';

        // ✍️ Tipografija
        const fontH1 = document.getElementById('font-h1')?.value || 'Cinzel';
        const fontH2 = document.getElementById('font-h2')?.value || 'Cormorant Garamond';
        const fontP = document.getElementById('font-p')?.value || 'Montserrat';

        const simulator = document.getElementById('live-simulator-screen');
        const target = document.getElementById('simulator-content-target');

        if (!simulator || !target) return;

        // 🛡️ Zakucavanje pozadine unutar mobilnog ekrana
        simulator.style.backgroundColor = bojaPozadine;
        let slikaZaPrikaz = trenutniConfig.config?.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina')?.value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        if (slikaZaPrikaz) {
            simulator.style.backgroundImage = `linear-gradient(rgba(15,23,30,0.6), rgba(15,23,30,0.7)), url('${slikaZaPrikaz}')`;
        } else {
            simulator.style.backgroundImage = 'none';
        }
        simulator.style.backgroundSize = 'cover';
        simulator.style.backgroundPosition = 'center';

        // Estetika unutrašnjih kartica
        const stilKontejnera = `background: ${bojaKontejnera}; padding: 22px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%; color: #fff; border: 1px solid rgba(255,255,255,0.02); box-sizing: border-box;`;
        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();
        const aktivniIndex = window.aktivniIndex !== undefined ? window.aktivniIndex : 0;

        // 🧭 RENDER PO ČVOROVIMA
        if (aktivniIndex === null || aktivniIndex === -1 || !trenutniConfig.timeline || trenutniConfig.timeline.length === 0) {
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

            target.innerHTML = `
                <div style="width: 100%; text-align:center; box-sizing: border-box;">
                    <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.6rem; text-transform: uppercase; letter-spacing:2px; margin: 0 0 5px 0;">${pName}</h1>
                    <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem; margin: 0 0 20px 0; font-weight:400;">${pSub}</h2>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; opacity: 0.5; margin:0;">[ Expedition rules stream matrix display zone... ]</p>
                    </div>
                </div>
            `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (!blok) return;

            if (blok.type === 'intro' || blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Cinematic Video Loaded');
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background: rgba(7,11,14,0.95); border: 1px solid rgba(212,180,131,0.15);">
                        <i class="fa-solid fa-circle-play" style="font-size: 32px; color: ${bojaH1}; margin-bottom: 8px; display:block;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; display:block; word-break: break-all;">${vName}</span>
                    </div>
                `;
            }
            else if (blok.type === 'chapter') {
                target.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.1rem; margin: 0 0 2px 0; font-weight:700;">${blok.title || 'Header String'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.85rem; margin: 0 0 10px 0; font-weight:400;">${blok.subtitle || ''}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; line-height: 1.4; opacity:0.85; margin: 0 0 10px 0;">[ Staged chapter text viewport ]</p>
                        <button type="button" style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 5px 12px; font-size: 0.7rem; border-radius: 6px; font-weight:600; cursor: default; outline:none;">${blok.nextButtonText || 'Continue →'}</button>
                    </div>
                `;
            }
            else if (blok.type === 'gate') {
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 18px; color: ${bojaH1}; margin-bottom: 8px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.05rem; margin: 0 0 12px 0; font-weight:700;">${blok.hint || 'Passphrase required'}</h1>
                        <input type="text" placeholder="${blok.placeholder || 'Type here...'}" disabled style="width: 85%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.4); text-align: center; color: #fff; font-size: 0.75rem; margin-bottom:10px; outline:none; box-sizing: border-box;">
                        <button type="button" style="background: ${bojaH1}; color: #0a1015; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; font-weight:700; display:block; margin:0 auto; cursor: default; outline:none;">${blok.buttonText || 'Verify'}</button>
                    </div>
                `;
            }
            else if (blok.type === 'finale') {
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 25px 15px; border: 1px solid rgba(212,180,131,0.15);">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.3rem; margin: 0 0 5px 0; font-weight:700;">${blok.finalLoveMessage || 'End Matrix'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem; margin:0; font-weight:400; opacity: 0.9;">${blok.finalSignature || ''}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Crash in live simulator pipeline preview:", err);
    }
}

// Izlaganje na globalni nivo prozora
window.osveziZiviPreview = osveziZiviPreview;