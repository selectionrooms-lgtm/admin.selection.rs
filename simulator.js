/* ==========================================================================
   📺 SELECTION CANVAS — REAL-TIME PREVIEW ENGINE (Production Stable)
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

        // 🎯 TARGET SELEKTORI: Mapiramo direktno na slobodno platno panela
        const previewPanel = document.getElementById('global-preview-panel');
        const targetViewport = document.getElementById('simulator-content-target');

        if (!previewPanel || !targetViewport) return;

        // 🛡️ GVOZDENI STIL ZA PLATNO: Primena pozadine direktno na celokupan desni panel
        previewPanel.style.backgroundColor = bojaPozadine;
        let slikaZaPrikaz = trenutniConfig.config?.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina')?.value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        previewPanel.style.backgroundImage = slikaZaPrikaz ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')` : 'none';
        previewPanel.style.backgroundSize = 'cover';
        previewPanel.style.backgroundPosition = 'center';

        // Strukturna definicija unutrašnjeg kontejnera (Sada se elegantno prilagođava širini)
        const stilKontejnera = `background: ${bojaKontejnera}; padding: 35px; border-radius: 16px; text-align: left; box-shadow: 0 15px 35px rgba(0,0,0,0.5); width: 100%; max-width: 550px; color: #fff; border: 1px solid rgba(255,255,255,0.03);`;

        // Centriranje unutrašnjeg viewport-a unutar slobodnog prostora
        targetViewport.style.display = 'flex';
        targetViewport.style.justifyContent = 'center';
        targetViewport.style.alignItems = 'center';
        targetViewport.style.padding = '40px';

        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();
        const aktivniIndex = window.aktivniIndex !== undefined ? window.aktivniIndex : 0;

        // 🧭 RENDER LOGIKA PO ČVOROVIMA
        if (aktivniIndex === null || aktivniIndex === -1) {
            // Fallback render za bazični Intro Display Loader ukoliko indeks promaši
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

            targetViewport.innerHTML = `
                <div style="width: 100%; text-align:center; max-width: 550px;">
                    <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 2rem; text-transform: uppercase; letter-spacing:3px; margin-bottom:8px;">${pName}</h1>
                    <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1.1rem; margin-bottom:25px;">${pSub}</h2>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.8rem; opacity: 0.5;">[ Preliminary expedition setup configuration matrix active... ]</p>
                    </div>
                </div>
            `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (!blok) return;

            // A. Video čvor
            if (blok.type === 'intro' || blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Cinematic Stream Projection Active');
                const pName = trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;

                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background: rgba(7, 11, 14, 0.85); border: 1px solid rgba(212, 180, 131, 0.15);">
                        <span style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 15px;">${pName}</span>
                        <i class="fa-solid fa-circle-play" style="font-size: 45px; color: ${bojaH1}; margin-bottom: 12px; display: block; filter: drop-shadow(0 0 10px rgba(212,180,131,0.2));"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.8rem; opacity: 0.7; display:block; word-break: break-all;">${vName}</span>
                    </div>
                `;
            }
            // B. Chapter (Narativni) čvor
            else if (blok.type === 'chapter') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.4rem; margin-bottom:4px; letter-spacing: 0.5px;">${blok.title || 'Header String'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1rem; margin-bottom: 15px;">${blok.subtitle || ''}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.85rem; line-height: 1.5; opacity:0.85; margin-bottom: 5px;">[ Staged chapter narrative text viewport ]</p>
                        <button type="button" style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 8px 18px; font-size: 0.8rem; border-radius: 6px; margin-top: 15px; font-weight:600; cursor: default;">${blok.nextButtonText || 'Continue →'}</button>
                    </div>
                `;
            }
            // C. Gate (Verifikacioni) čvor
            else if (blok.type === 'gate') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 22px; color: ${bojaH1}; margin-bottom: 12px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.2rem; margin-bottom: 15px;">${blok.hint || 'Passphrase required'}</h1>
                        <input type="text" placeholder="${blok.placeholder || 'Type credentials...'}" disabled style="width: 85%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.4); text-align: center; color: #fff; font-size: 0.8rem; margin-bottom:12px; outline: none;">
                        <button type="button" style="background: ${bojaH1}; color: #0a1015; border: none; padding: 8px 20px; border-radius: 6px; font-size: 0.8rem; font-weight:700; display:block; margin:0 auto; cursor: default;">${blok.buttonText || 'Verify'}</button>
                    </div>
                `;
            }
            // D. Outro (Finale) čvor
            else if (blok.type === 'finale') {
                targetViewport.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 40px 20px; border: 1px solid rgba(212,180,131,0.2);">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.6rem; margin-bottom: 8px; letter-spacing: 1px;">${blok.finalLoveMessage || 'End Matrix'}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1.1rem; opacity: 0.9;">${blok.finalSignature || ''}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Crash in live canvas layout engine preview:", err);
    }
}

// Globalno izlaganje funkcije za canvas drajvere
window.osveziZiviPreview = osveziZiviPreview;