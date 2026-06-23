/* ==========================================================================
   📺 SELECTION CANVAS — REAL-TIME PREVIEW ENGINE (Isolated Container V2)
   ========================================================================== */

export function osveziZiviPreview(trenutniConfigParam) {
    const trenutniConfig = trenutniConfigParam || window.trenutniConfig;
    if (!trenutniConfig) return;

    try {
        // 🎨 Povlačenje aktivne palete boja iz administrativne konzole
        const bojaPozadine = document.getElementById('input-boja-pozadina')?.value || '#0f171e';
        const bojaKontejnera = document.getElementById('input-boja-kontejner')?.value || '#1c2a39';
        const bojaH1 = document.getElementById('color-h1')?.value || '#d4b483';
        const bojaH2 = document.getElementById('color-h2')?.value || '#d4b483';
        const bojaP = document.getElementById('color-p')?.value || '#eeeeee';

        // ✍️ Povlačenje tipografskih matrica
        const fontH1 = document.getElementById('font-h1')?.value || 'Cinzel';
        const fontH2 = document.getElementById('font-h2')?.value || 'Cormorant Garamond';
        const fontP = document.getElementById('font-p')?.value || 'Montserrat';

        // 🎯 TARGET SELEKTORI: Selektujemo izolovanu kapsulu ekrana
        const simulatorScreen = document.getElementById('live-simulator-screen');
        const targetViewport = document.getElementById('simulator-content-target');

        if (!simulatorScreen || !targetViewport) return;

        // 🛡️ IZOLACIJA STILOVA: Pozadina i slika se nanose isključivo unutar kapsule ekrana
        simulatorScreen.style.backgroundColor = bojaPozadine;
        let slikaZaPrikaz = trenutniConfig.config?.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina')?.value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        simulatorScreen.style.backgroundImage = slikaZaPrikaz ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')` : 'none';
        simulatorScreen.style.backgroundSize = 'cover';
        simulatorScreen.style.backgroundPosition = 'center';

        // Strukturna definicija unutrašnjeg kontejnera kockice unutar ekrana
        const stilKontejnera = `background: ${bojaKontejnera}; padding: 25px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%; color: #fff; border: 1px solid rgba(255,255,255,0.03);`;

        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();
        const aktivniIndex = window.aktivniIndex !== undefined ? window.aktivniIndex : 0;

        // 🧭 RENDER LOGIKA PO ČVOROVIMA
        if (aktivniIndex === null || aktivniIndex === -1) {
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

            targetViewport.innerHTML = `
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

            // A. Video čvor / Intro čvor
            if (blok.type === 'intro' || blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Cinematic Stream Projection Active');
                const pName = trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;

                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background: rgba(7, 11, 14, 0.85); border: 1px solid rgba(212, 180, 131, 0.15);">
                        <span style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 10px;">${pName}</span>
                        <i class="fa-solid fa-circle-play" style="font-size: 36px; color: ${bojaH1}; margin-bottom: 8px; display: block;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; opacity: 0.7; display:block; word-break: break-all;">${vName}</span>
                    </div>
                `;
            }
            // B. Chapter (Narativni) čvor
            else if (blok.type === 'chapter') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.15rem; margin-bottom:2px; letter-spacing: 0.5px;">${blok.title || 'Header String'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.85rem; margin-bottom: 12px;">${blok.subtitle || ''}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; line-height: 1.4; opacity:0.85; margin-bottom: 5px;">[ Staged chapter narrative text viewport ]</p>
                        <button type="button" style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 6px 14px; font-size: 0.7rem; border-radius: 6px; margin-top: 10px; font-weight:600; cursor: default;">${blok.nextButtonText || 'Continue →'}</button>
                    </div>
                `;
            }
            // C. Gate (Verifikacioni) čvor
            else if (blok.type === 'gate') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 18px; color: ${bojaH1}; margin-bottom: 8px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.05rem; margin-bottom: 12px;">${blok.hint || 'Passphrase required'}</h1>
                        <input type="text" placeholder="${blok.placeholder || 'Type credentials...'}" disabled style="width: 85%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.4); text-align: center; color: #fff; font-size: 0.75rem; margin-bottom:10px; outline: none;">
                        <button type="button" style="background: ${bojaH1}; color: #0a1015; border: none; padding: 6px 16px; border-radius: 6px; font-size: 0.7rem; font-weight:700; display:block; margin:0 auto; cursor: default;">${blok.buttonText || 'Verify'}</button>
                    </div>
                `;
            }
            // D. Outro (Finale) čvor
            else if (blok.type === 'finale') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 30px 15px; border: 1px solid rgba(212,180,131,0.15);">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.3rem; margin-bottom: 6px; letter-spacing: 1px;">${blok.finalLoveMessage || 'End Matrix'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem; opacity: 0.9;">${blok.finalSignature || ''}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Crash in live canvas layout engine preview:", err);
    }
}

// Globalno izlaganje funkcije za prozor
window.osveziZiviPreview = osveziZiviPreview;