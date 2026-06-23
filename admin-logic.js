// ==========================================================================
// SELECTION CMS PLATFORMA — admin-logic.js (V18.5 - Edge Sync Edition)
// ==========================================================================

let trenutniConfig = null;
let aktivniIndex = null;
let isEditingCore = false;

// Globalni niz u koji skladištimo binarne fajlove pre slanja na Edge
let fajloviZaUpload = [];

// Centralni domen tvog zaštićenog API-ja
const API_BASE = "https://shell.selection.rs";

document.addEventListener("DOMContentLoaded", () => {
    proveriKorisnikaIUpravljajInterfejsom();
});

// ==========================================================================
// 1. IDENTITY & KERNEL INITIALIZATION (Fixed Race Condition & Fallback)
// ==========================================================================
// admin-logic.js — Nova sinhronizovana inicijalizacija

async function proveriKorisnikaIUpravljajInterfejsom() {
    const masterBlok = document.getElementById('master-admin-blok');
    const badge = document.getElementById('user-session-badge');

    if (masterBlok) masterBlok.style.display = "none";

    try {
        console.log("🪙 Korak 1: Pokrećem Token Exchange sa lokalnog /issue_session...");

        // 1. Uzimamo Selection Token sa admin strane (gde je Access aktivan)
        // Pošto gađamo isti domen, relativna putanja radi bez CORS muka!
        const tokenRes = await fetch("/issue_session", { credentials: "include" });
        if (!tokenRes.ok) throw new Error("Cloudflare Access odbio izdavanje lokalne sesije.");

        const tokenData = await tokenRes.json();
        if (!tokenData.token) throw new Error("Token kovnica je vratila prazan ključ.");

        // Skladištimo ga u LocalStorage pod jedinstvenim imenom
        localStorage.setItem('selection_session_token', tokenData.token);
        console.log("✅ Korak 1 uspešan: Selection Token bezbedno zaključan u LocalStorage.");

        console.log("📡 Korak 2: Autentifikujem se na javni shell sa novim Bearer tokenom...");

        // 🚀 Sada idemo na javni shell sa hirurški očišćenim zaglavljem!
        const res = await fetch(`${API_BASE}/get_user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.token}`
            }
        });

        if (!res.ok) throw new Error(`Shell odbio Bearer sesiju sa statusom: ${res.status}`);

        const userData = await res.json();
        console.log("👤 Korak 2 uspešan! Podaci o korisniku povučeni:", userData);

        if (userData.error) throw new Error(userData.error);

        // Renderovanje interfejsa na osnovu podataka iz našeg tokena
        if (badge) {
            const ikonica = userData.role === "master" ? "👑" : "🔒";
            badge.innerHTML = `${ikonica} <span style="color: var(--admin-accent); font-weight: 600;">${userData.email}</span>`;
            badge.style.display = "flex";
        }

        localStorage.setItem('userEmail', userData.email);

        if (userData.role === "master") {
            if (masterBlok) masterBlok.style.display = "block";
            localStorage.setItem('userSubdomain', 'admin');
            ucitajConfig("admin");
        } else {
            if (masterBlok) masterBlok.style.display = "none";
            localStorage.setItem('userSubdomain', userData.subdomain);
            ucitajConfig(userData.subdomain);
        }

    } catch (err) {
        console.error("❌ Bootstrap krah. Aktiviram lokalni Devel Fallback...", err);

        if (badge) {
            badge.innerHTML = `⚠️ <span style="color: #d4b483; font-weight: 600;">Lokalni Režim (Devel)</span>`;
            badge.style.display = "flex";
        }

        if (masterBlok) masterBlok.style.display = "block";

        const klijentovSubdomain = localStorage.getItem('userSubdomain') || 'admin';
        localStorage.setItem('userSubdomain', klijentovSubdomain);
        ucitajConfig(klijentovSubdomain);
    }
}

// 📂 SINHRONIZOVANO: Sada gađa čist /api/config endpoint na novom ruteru
function ucitajConfig(subdomain) {
    console.log(`📂 Pokrećem učitavanje konfiguracije sa Edge API-ja za poddomen: ${subdomain}...`);

    // Umesto korene rute, gađamo namenski javni endpoint koji je registrovan u polisi
    fetch(`${API_BASE}/api/config?subdomain=${subdomain}&nocache=${Date.now()}`, {
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Server je vratio grešku: " + res.status);
            return res.json();
        })
        .then(data => {
            if (data.draft_config || data.live_config) {
                trenutniConfig = data.draft_config || data.live_config;
            } else if (data.config) {
                trenutniConfig = data.config;
            } else {
                trenutniConfig = data;
            }

            console.log(`✅ Config za [${subdomain}] uspešno učitan iz baze:`, trenutniConfig);

            popuniGlobalneStilove();
            osveziCoreSummaryTekst();
            renderujTimelineBlokove();
            osveziZiviPreview();
            promeniRezimSimulatora('mobile');
        })
        .catch(err => {
            console.error("❌ Greška pri učitavanju konfiguracije. Pravim stabilan lokalni kostur.", err);

            trenutniConfig = {
                config: {
                    globalSettings: {
                        primaryColor: "#d4b483",
                        secondaryColor: "#d4b483",
                        textColor: "#eeeeee",
                        backgroundColor: "#0f171e",
                        containerBg: "#1c2a39",
                        mainBackgroundImage: "",
                        fontHeader: "Cinzel",
                        fontQuote: "Cormorant Garamond",
                        fontBody: "Montserrat",
                        projectName: subdomain.toUpperCase(),
                        projectSubtitle: "Dobrodošli u Vaš Selection prostor",
                        loaderMusic: "",
                        screensaverMusic: "",
                        screensaverTimeout: 60
                    },
                    hasWarningMessage: true
                },
                loader: { warningTitle: "⚠️ UPOZORENJE ⚠️", warningFinalLine: "", warningTexts: ["Pravilo 1", "Pravilo 2"] },
                timeline: []
            };
            popuniGlobalneStilove();
            osveziCoreSummaryTekst();
            renderujTimelineBlokove();
            osveziZiviPreview();
            promeniRezimSimulatora('mobile');
        });
}

function popuniGlobalneStilove() {
    if (!trenutniConfig || !trenutniConfig.config || !trenutniConfig.config.globalSettings) return;
    const settings = trenutniConfig.config.globalSettings;

    if (document.getElementById('color-h1')) document.getElementById('color-h1').value = settings.primaryColor || '#d4b483';
    if (document.getElementById('color-h2')) document.getElementById('color-h2').value = settings.secondaryColor || '#d4b483';
    if (document.getElementById('color-p')) document.getElementById('color-p').value = settings.textColor || '#eeeeee';
    if (document.getElementById('input-boja-pozadina')) document.getElementById('input-boja-pozadina').value = settings.backgroundColor || '#0f171e';
    if (document.getElementById('input-boja-kontejner')) document.getElementById('input-boja-kontejner').value = settings.containerBg || '#1c2a39';
    if (document.getElementById('input-ss-tajmer')) document.getElementById('input-ss-tajmer').value = settings.screensaverTimeout || 60;

    document.getElementById('input-slika-pozadina').value = settings.mainBackgroundImage || '';
    document.getElementById('label-global-pozadina').innerText = settings.mainBackgroundImage || 'Klikni ili prevuci sliku ovde';

    document.getElementById('input-loader-muzika').value = settings.loaderMusic || '';
    document.getElementById('label-global-loader-muzika').innerText = settings.loaderMusic || 'Klikni ili prevuci .mp3 ovde';

    document.getElementById('input-ss-muzika').value = settings.screensaverMusic || '';
    document.getElementById('label-global-ss-muzika').innerText = settings.screensaverMusic || 'Klikni ili prevuci .mp3 ovde';
}

function osveziCoreSummaryTekst() {
    const el = document.getElementById('summary-core-title');
    if (el && trenutniConfig && trenutniConfig.config && trenutniConfig.config.globalSettings) {
        const name = trenutniConfig.config.globalSettings.projectName || 'Unnamed';
        const sub = trenutniConfig.config.globalSettings.projectSubtitle || '';
        el.innerHTML = `Aktivni projekat: <strong>${name}</strong> — <em>"${sub}"</em>`;
    }
}

// 🪙 MINTING ENGINE: Razmena Access sesije za statični Bearer Token
async function mintujSesioniToken() {
    console.log("🪙 Pokrećem token exchange...");
    try {
        const res = await fetch(`${API_BASE}/auth/mint`, {
            method: 'GET',
            credentials: "include"
        });

        if (!res.ok) throw new Error("Neuspešan mint tokena");

        const data = await res.json();
        if (data.token) {
            localStorage.setItem('selection_session_token', data.token);
            console.log("✅ Token uspešno mintovan i keširan u LocalStorage.");
            return data.token;
        }
    } catch (err) {
        console.error("❌ Greška pri mintovanju:", err);
    }
    return null;
}

// ==========================================================================
// 2. TIMELINE CARDS RENDERING LAYER
// ==========================================================================
function renderujTimelineBlokove() {
    const container = document.getElementById('cms-blocks-list');
    if (!container) return;
    container.innerHTML = '';

    const coreCard = document.createElement('div');
    coreCard.className = 'cms-block-card';
    coreCard.id = 'splash-config-card';
    coreCard.onclick = (e) => {
        if (e.target.closest('.block-actions')) return;
        postaviAktivniBlok(-1);
    };

    if (aktivniIndex === -1) coreCard.classList.add('active-block');

    coreCard.innerHTML = `
        <div class="block-info-side">
            <div class="block-num"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--admin-accent);"></i></div>
            <div class="block-meta-details">
                <div class="block-type-tag">UVOĐENJE U APLIKACIJU</div>
                <div class="block-summary-text" id="summary-core-title">Početni Ekran i Uvodna Pravila</div>
                <div class="block-media-indicators"><span><i class="fa-solid fa-gear"></i> Naslov, titl i uvodna pravila ekspedicije</span></div>
            </div>
        </div>
        <div class="block-actions">
            <button class="btn-action btn-edit-zoom" onclick="event.stopPropagation(); otvoriCoreZoomEditor()">
                <i class="fa-solid fa-expand"></i> Otvori i Uredi
            </button>
        </div>
    `;
    container.appendChild(coreCard);
    osveziCoreSummaryTekst();

    if (!trenutniConfig.timeline || trenutniConfig.timeline.length === 0) {
        inicijalizujDragAndDrop();
        return;
    }

    trenutniConfig.timeline.forEach((blok, index) => {
        const card = document.createElement('div');
        card.className = 'cms-block-card';
        card.setAttribute('data-index', index);

        if (index === aktivniIndex) card.classList.add('active-block');

        card.onclick = (e) => {
            if (e.target.closest('.block-actions')) return;
            postaviAktivniBlok(index);
        };

        let mediaIndicators = '';
        if (blok.type === 'video') {
            const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Video fajl ubačen');
            mediaIndicators += `<span><i class="fa-solid fa-video"></i> ${vName}</span>`;
        }
        if (blok.type === 'chapter' && blok.galleryImages && blok.galleryImages.length > 0) {
            mediaIndicators += `<span><i class="fa-solid fa-images"></i> Sadrži ${blok.galleryImages.length} slika</span>`;
        }
        if (blok.bgMusicUrl) {
            mediaIndicators += `<span><i class="fa-solid fa-music"></i> Muzika aktivna</span>`;
        }
        if (blok.sceneEffect && blok.sceneEffect !== 'none') {
            mediaIndicators += `<span><i class="fa-solid fa-sparkles"></i> Efekat: ${blok.sceneEffect}</span>`;
        }

        let srpskiTip = blok.type.toUpperCase();
        let summaryTekst = '';

        if (blok.type === 'chapter') { srpskiTip = 'POGLAVLJE SA PRIČOM'; summaryTekst = blok.title || 'Prazan naslov'; }
        else if (blok.type === 'video') { srpskiTip = 'VIDEO SNIMAK'; summaryTekst = blok._realVideoName || 'Video projekcija'; }
        else if (blok.type === 'gate') { srpskiTip = 'KAPIJA (ZAGONETKA)'; summaryTekst = blok.hint || 'Lozinka za prolaz'; }
        else if (blok.type === 'finale') { srpskiTip = 'KRAJ PRIČE (FINALE)'; summaryTekst = blok.finalLoveMessage || 'Završni ekran'; }

        card.innerHTML = `
            <div class="block-info-side">
                <div class="block-num">KOCKICA #${index + 1}</div>
                <div class="block-meta-details">
                    <div class="block-type-tag">${srpskiTip}</div>
                    <div class="block-summary-text">${summaryTekst}</div>
                    <div class="block-media-indicators">${mediaIndicators || '<span><i class="fa-solid fa-folder-open"></i> Prazna kockica</span>'}</div>
                </div>
            </div>
            <div class="block-actions">
                <button class="btn-action btn-edit-zoom" onclick="event.stopPropagation(); otvoriZoomEditorZaBlok(${index})"><i class="fa-solid fa-expand"></i> Uredi</button>
                <button class="btn-action" onclick="event.stopPropagation(); pomeriBlok(${index}, -1)">▲</button>
                <button class="btn-action" onclick="event.stopPropagation(); pomeriBlok(${index}, 1)">▼</button>
                <button class="btn-action btn-delete" onclick="event.stopPropagation(); obrisiBlok(${index})">X</button>
            </div>
        `;
        container.appendChild(card);
    });

    inicijalizujDragAndDrop();
}

function postaviAktivniBlok(index) {
    aktivniIndex = index;
    document.querySelectorAll('.cms-block-card, #splash-config-card').forEach(c => c.classList.remove('active-block'));

    if (index === -1) {
        const coreCard = document.getElementById('splash-config-card');
        if (coreCard) coreCard.classList.add('active-block');
    } else if (index !== null) {
        const aktivnaKartica = document.querySelector(`.cms-block-card[data-index="${index}"]`);
        if (aktivnaKartica) aktivnaKartica.classList.add('active-block');
    }
    osveziZiviPreview();
}

function dodajNoviBlok(tip) {
    const noviBlok = { type: tip, sceneEffect: 'none' };
    if (tip === 'chapter') {
        noviBlok.title = 'Novo Poglavlje'; noviBlok.subtitle = ''; noviBlok.paragraphs = [];
        noviBlok.galleryImages = []; noviBlok.nextButtonText = 'Dalje →';
    } else if (tip === 'video') {
        noviBlok.url = '';
    } else if (tip === 'gate') {
        noviBlok.hint = 'Unesite tajnu reč'; noviBlok.placeholder = 'Kucaj ovde...'; noviBlok.buttonText = 'Potvrdi'; noviBlok.errorMessage = 'Netačno, pokušaj ponovo.'; noviBlok.answers = [];
    } else if (tip === 'finale') {
        noviBlok.finalLoveMessage = 'Zauvek zajedno'; noviBlok.finalSignature = 'Selection'; noviBlok.endIconLabel = 'Restartuj';
    }

    trenutniConfig.timeline.push(noviBlok);
    renderujTimelineBlokove();
    otvoriZoomEditorZaBlok(trenutniConfig.timeline.length - 1);
}

function obrisiBlok(index) {
    if (confirm("Da li sigurno želiš da obrišeš ovu kockicu iz priče?")) {
        trenutniConfig.timeline.splice(index, 1);
        aktivniIndex = null;
        renderujTimelineBlokove();
        osveziZiviPreview();
    }
}

function pomeriBlok(index, smer) {
    const noviIndex = index + smer;
    if (noviIndex < 0 || noviIndex >= trenutniConfig.timeline.length) return;
    const privremeni = trenutniConfig.timeline[index];
    trenutniConfig.timeline[index] = trenutniConfig.timeline[noviIndex];
    trenutniConfig.timeline[noviIndex] = privremeni;
    aktivniIndex = noviIndex;
    renderujTimelineBlokove();
    postaviAktivniBlok(noviIndex);
}

// ==========================================================================
// 3. EXPANDED ZOOM EDITOR ENGINE (Modal Workspace)
// ==========================================================================
function otvoriZoomEditorZaBlok(index) {
    aktivniIndex = index;
    isEditingCore = false;
    postaviAktivniBlok(index);

    const blok = trenutniConfig.timeline[index];
    const overlay = document.getElementById('zoom-editor-overlay');
    const naslov = document.getElementById('zoom-module-title');
    const telo = document.getElementById('zoom-dynamic-body');

    naslov.innerText = `REŽIM UREĐIVANJA: ${blok.type.toUpperCase()} KOCKICA (#${index + 1})`;
    const audioName = blok._realAudioName || (blok.bgMusicUrl ? blok.bgMusicUrl.split('/').pop() : 'Nema trake');
    let dynamicHtml = '';

    if (blok.type === 'video') {
        const videoName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Klikni za odabir .mp4 fajla');
        dynamicHtml = `
            <div class="form-group">
                <label>Video snimak (.mp4 projekcija):</label>
                <div class="zoom-drop-zone" onclick="okiniLokalniKlikFajla('video-file')">
                    <i class="fa-solid fa-circle-play" style="font-size:35px; color:var(--admin-accent); margin-bottom:8px;"></i>
                    <p id="zoom-video-display-name" style="font-weight:600;">${videoName}</p>
                    <span class="hint-text">Klikni ili spusti fajl ovde</span>
                </div>
            </div>
        `;
    }
    else if (blok.type === 'chapter') {
        let slikeHtml = '';
        if (blok.galleryImages && blok.galleryImages.length > 0) {
            blok.galleryImages.forEach((imgSrc, imgIndex) => {
                slikeHtml += `
                    <div class="zoom-thumb" draggable="true" data-img-index="${imgIndex}"
                         ondragstart="hendlujDragStart(event)" ondragover="hendlujDragOver(event)" ondrop="hendlujDrop(event, ${index})">
                        <img src="${imgSrc}">
                        <button onclick="ukloniSlikuIzGalerijeZoom(${imgIndex})">×</button>
                    </div>
                `;
            });
        }

        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Naslov Poglavlja:</label>
                    <input type="text" id="zoom-field-title" value="${blok.title || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Podnaslov / Poruka:</label>
                    <input type="text" id="zoom-field-subtitle" value="${blok.subtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group">
                <label>Tekst priče (Double Enter pravi novi pasus):</label>
                <textarea id="zoom-field-paragraphs" style="min-height:180px;" oninput="sinhronizujZoomSaPreviewom()">${blok.paragraphs ? blok.paragraphs.join('\n\n') : ''}</textarea>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Tekst na dugmetu za nastavak:</label>
                    <input type="text" id="zoom-field-nextButtonText" value="${blok.nextButtonText || 'Dalje →'}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group" style="margin-top:15px;">
                <label>Foto Galerija poglavlja (Spusti slike direktno unutra):</label>
                <div class="zoom-drop-zone" onclick="okiniLokalniKlikFajla('gallery-images')">
                    <i class="fa-solid fa-images" style="font-size:30px; color:var(--admin-accent); margin-bottom:5px;"></i>
                    <p style="font-size:0.85rem; font-weight:600;">Klikni ili prevuci slike za album</p>
                </div>
                <div class="zoom-media-grid" id="zoom-gallery-container">${slikeHtml}</div>
            </div>
        `;
    }
    else if (blok.type === 'gate') {
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Tekst Zagonetke / Glavno Pitanje:</label>
                    <input type="text" id="zoom-field-hint" value="${blok.hint || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Smernica unutar polja (Placeholder):</label>
                    <input type="text" id="zoom-field-placeholder" value="${blok.placeholder || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Sve tačne lozinke (odvojene zarezom):</label>
                    <input type="text" id="zoom-field-answers" value="${blok.answers ? blok.answers.join(', ') : ''}" placeholder="npr. ljubav, 33, sreca">
                </div>
                <div class="form-group">
                    <label>Poruka za pogrešnu lozinku:</label>
                    <input type="text" id="zoom-field-errorMessage" value="${blok.errorMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group" style="max-width:50%;">
                <label>Tekst na dugmetu:</label>
                <input type="text" id="zoom-field-buttonText" value="${blok.buttonText || 'Potvrdi'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        `;
    }
    else if (blok.type === 'finale') {
        const iconName = blok._realIconName || 'Podrazumevana ikona (rose.png)';
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Završna ljubavna poruka:</label>
                    <input type="text" id="zoom-field-finalLoveMessage" value="${blok.finalLoveMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Završni potpis:</label>
                    <input type="text" id="zoom-field-finalSignature" value="${blok.finalSignature || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Ikona na centralnom dugmetu:</label>
                    <div class="zoom-drop-zone" id="final-icon-drop-zone" onclick="okiniLokalniKlikFajla('final-icon')">
                        <i class="fa-solid fa-heart-pulse" style="font-size:25px; color:var(--admin-accent); margin-bottom:5px;"></i>
                        <p id="final-icon-status" style="font-weight:600; font-size:0.8rem;">${iconName}</p>
                    </div>
                    <input type="hidden" id="zoom-field-endIconType" value="${blok.endIconType || 'images/rose.png'}">
                </div>
                <div class="form-group">
                    <label>Tekst na finalnom dugmetu:</label>
                    <input type="text" id="zoom-field-endIconLabel" value="${blok.endIconLabel || 'Restartuj'}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
        `;
    }

    telo.innerHTML = `
        ${dynamicHtml}
        <div class="form-group" style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
            <label><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> Ambijentalne čestice / Efekat za ovu scenu:</label>
            <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()" style="width:50%; background:#070b0e; color:#fff; padding:8px; border:1px solid rgba(255,255,255,0.1); border-radius:6px;">
                <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Bez čestica (Čist mrak)</option>
                <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals (Latice crvenih ruža)</option>
                <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Confetti (Zlatne konfete)</option>
                <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust (Zlatne čestice prašine)</option>
            </select>
        </div>
        <div class="form-group" style="margin-top:15px;">
            <label>Namenska audio traka za ovu scenu (.mp3):</label>
            <div class="zoom-drop-zone" style="padding:12px;" onclick="okiniLokalniKlikFajla('block-audio')">
                <i class="fa-solid fa-music" style="color:var(--admin-accent); margin-right:8px;"></i>
                <span id="zoom-audio-display-name" style="font-weight:600;">Traka: ${audioName}</span>
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
}

function otvoriCoreZoomEditor() {
    isEditingCore = true;
    aktivniIndex = -1;

    const overlay = document.getElementById('zoom-editor-overlay');
    const naslov = document.getElementById('zoom-module-title');
    const telo = document.getElementById('zoom-dynamic-body');

    naslov.innerText = `UREĐIVANJE: POČETNI EKRAN I UVODNA PRAVILA`;

    const loader = trenutniConfig.loader || { warningTitle: '', warningTexts: [] };
    const settings = trenutniConfig.config.globalSettings;

    telo.innerHTML = `
        <div class="grid-2">
            <div class="form-group">
                <label>Glavni Naslov Projekta (Velika slova)</label>
                <input type="text" id="zoom-core-projectName" value="${settings.projectName || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label>Podnaslov / Uvodna rečenica klijentu</label>
                <input type="text" id="zoom-core-projectSubtitle" value="${settings.projectSubtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="form-group">
            <label>Uvodna Pravila / Napomene pre ulaska (Jedno pravilo po redu):</label>
            <textarea id="zoom-core-warningTexts" style="min-height:160px;" oninput="sinhronizujZoomSaPreviewom()">${loader.warningTexts ? loader.warningTexts.join('\n') : ''}</textarea>
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label>Naslov iznad pravila:</label>
                <input type="text" id="zoom-core-warningTitle" value="${loader.warningTitle || '⚠️ NAPOMENA ⚠️'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group toggle-group" style="margin-top:25px;">
                <input type="checkbox" id="zoom-core-hasWarningMessage" ${trenutniConfig.config.hasWarningMessage ? 'checked' : ''} onchange="sinhronizujZoomSaPreviewom()">
                <label for="zoom-core-hasWarningMessage" style="cursor:pointer; font-size:0.85rem; margin-left:8px;">Prikaži panel sa pravilima pre početka aplikacije</label>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function zatvoriZoomEditor() {
    document.getElementById('zoom-editor-overlay').style.display = 'none';
    isEditingCore = false;
    renderujTimelineBlokove();
}

function potvrdiIZatvoriZoom() {
    if (isEditingCore) {
        trenutniConfig.config.globalSettings.projectName = document.getElementById('zoom-core-projectName').value;
        trenutniConfig.config.globalSettings.projectSubtitle = document.getElementById('zoom-core-projectSubtitle').value;
        trenutniConfig.loader.warningTitle = document.getElementById('zoom-core-warningTitle').value;
        trenutniConfig.config.hasWarningMessage = document.getElementById('zoom-core-hasWarningMessage').checked;

        const rawTexts = document.getElementById('zoom-core-warningTexts').value;
        trenutniConfig.loader.warningTexts = rawTexts.split('\n').filter(r => r.trim() !== '');
        osveziCoreSummaryTekst();
    }
    else if (aktivniIndex !== null && aktivniIndex !== -1) {
        const blok = trenutniConfig.timeline[aktivniIndex];

        if (document.getElementById('zoom-field-sceneEffect')) {
            blok.sceneEffect = document.getElementById('zoom-field-sceneEffect').value;
        }

        if (blok.type === 'chapter') {
            blok.title = document.getElementById('zoom-field-title').value;
            blok.subtitle = document.getElementById('zoom-field-subtitle').value;
            blok.nextButtonText = document.getElementById('zoom-field-nextButtonText').value;
            const rawBody = document.getElementById('zoom-field-paragraphs').value;
            blok.paragraphs = rawBody.split('\n\n').filter(p => p.trim() !== '');
        }
        else if (blok.type === 'gate') {
            blok.hint = document.getElementById('zoom-field-hint').value;
            blok.placeholder = document.getElementById('zoom-field-placeholder').value;
            blok.buttonText = document.getElementById('zoom-field-buttonText').value;
            blok.errorMessage = document.getElementById('zoom-field-errorMessage').value;
            const rawAns = document.getElementById('zoom-field-answers').value;
            blok.answers = rawAns.split(',').map(a => a.trim()).filter(a => a !== '');
        }
        else if (blok.type === 'finale') {
            blok.finalLoveMessage = document.getElementById('zoom-field-finalLoveMessage').value;
            blok.finalSignature = document.getElementById('zoom-field-finalSignature').value;
            blok.endIconType = document.getElementById('zoom-field-endIconType').value;
        }
    }
    renderujTimelineBlokove();
    zatvoriZoomEditor();
}

function ukloniSlikuIzGalerijeZoom(imgIndex) {
    if (aktivniIndex !== null && aktivniIndex !== -1) {
        const blok = trenutniConfig.timeline[aktivniIndex];
        blok.galleryImages.splice(imgIndex, 1);
        if (blok._realGalleryNames) blok._realGalleryNames.splice(imgIndex, 1);
        osveziZoomGalerijuEkran(aktivniIndex);
        osveziZiviPreview();
    }
}

// ==========================================================================
// 4. THE LIVE SIMULATOR REAL-TIME PREVIEW ENGINE
// ==========================================================================
function osveziZiviPreview() {
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
        let slikaZaPrikaz = trenutniConfig.config.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina').value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        simulator.style.backgroundImage = slikaZaPrikaz ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')` : 'none';
        simulator.style.backgroundSize = 'cover'; simulator.style.backgroundPosition = 'center';

        const stilKontejnera = `background: ${bojaKontejnera}; padding: 22px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%;`;

        if (aktivniIndex === null || aktivniIndex === -1) {
            if (statusTag) statusTag.innerText = "Prikaz: Uvodni ekran";
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config.globalSettings.projectName || 'Selection';
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config.globalSettings.projectSubtitle || '';

            target.innerHTML = `
                <div style="width: 100%; text-align:center;">
                    <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.8rem; text-transform: uppercase; letter-spacing:2px; margin-bottom:5px;">${pName}</h1>
                    <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1rem; margin-bottom:20px;">${pSub}</h2>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; opacity: 0.5;">[ Uvodna pravila ekspedicije... ]</p>
                    </div>
                </div>
            `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (statusTag) statusTag.innerText = `Prikaz: Kockica #${aktivniIndex + 1} (${blok.type.toUpperCase()})`;

            if (blok.type === 'video') {
                const vName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Nema fajla');
                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; background:#000;">
                        <i class="fa-solid fa-circle-play" style="font-size: 30px; color: ${bojaH1}; margin-bottom: 5px;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; display:block;">${vName}</span>
                    </div>
                `;
            }
            else if (blok.type === 'chapter') {
                const t = document.getElementById('zoom-field-title')?.value || blok.title || 'Naslov';
                const s = document.getElementById('zoom-field-subtitle')?.value || blok.subtitle || 'Podnaslov';
                const btnT = document.getElementById('zoom-field-nextButtonText')?.value || blok.nextButtonText || 'Dalje';

                target.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.2rem; margin-bottom:2px;">${t}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.85rem; margin-bottom: 10px;">${s}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; line-height: 1.4; opacity:0.85;">[ Prvi pasus priče... ]</p>
                        <button style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 5px 10px; font-size: 0.7 tribe; border-radius: 6px; margin-top: 10px; font-weight:600;">${btnT}</button>
                    </div>
                `;
            }
            else if (blok.type === 'gate') {
                const hint = document.getElementById('zoom-field-hint')?.value || blok.hint || 'Unesite lozinku';
                const placeholder = document.getElementById('zoom-field-placeholder')?.value || blok.placeholder || 'Reč...';
                const btnText = document.getElementById('zoom-field-buttonText')?.value || blok.buttonText || 'Potvrdi';

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
                const msg = document.getElementById('zoom-field-finalLoveMessage')?.value || blok.finalLoveMessage || 'Kraj';
                const sig = document.getElementById('zoom-field-finalSignature')?.value || blok.finalSignature || 'Selection';

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 25px 15px;">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.4rem; margin-bottom: 5px;">${msg}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1rem;">${sig}</h2>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Greška u live preview pogonu:", err);
    }
}

function sinhronizujZoomSaPreviewom() { osveziZiviPreview(); }

// ==========================================================================
// 5. DATA SAVE & EDGE DEPLOYMENT PIPELINE (V18.5 - Bearer Integrated)
// ==========================================================================
async function sacuvajSveNaServer(akcija = 'save') {
    const porukaUpozorenja = akcija === 'publish'
        ? "⚠️ PAŽNJA: Da li želiš momentalno da LANSIRAŠ sve izmene na JAVNI sajt? Klijenti će odmah videti promenu."
        : "Da li želiš da zaključaš trenutne izmene u privremeni radni Draft?";

    if (!confirm(porukaUpozorenja)) return;
    if (!trenutniConfig) return;

    if (trenutniConfig.timeline) {
        trenutniConfig.timeline.forEach(blok => {
            if (blok.url && blok.url.startsWith('blob:')) blok.url = blok._realName || '';
            if (blok.bgMusicUrl && blok.bgMusicUrl.startsWith('blob:')) blok.bgMusicUrl = blok._realName || '';
            if (blok.galleryImages) {
                blok.galleryImages = blok.galleryImages.map((img, i) => {
                    if (img.startsWith('blob:') && blok._realGalleryNames && blok._realGalleryNames[i]) {
                        return blok._realGalleryNames[i];
                    }
                    return img;
                }).filter(img => !img.startsWith('blob:'));
            }
        });
    }

    const cistConfigZaExport = {
        config: {
            globalSettings: {
                primaryColor: document.getElementById('color-h1').value,
                secondaryColor: document.getElementById('color-h2').value,
                textColor: document.getElementById('color-p').value,
                backgroundColor: document.getElementById('input-boja-pozadina').value,
                containerBg: document.getElementById('input-boja-kontejner').value,
                mainBackgroundImage: document.getElementById('input-slika-pozadina').value.replace(/^\//, ''),
                fontHeader: document.getElementById('font-h1').value,
                fontQuote: document.getElementById('font-h2').value,
                fontBody: document.getElementById('font-p').value,
                loaderMusic: document.getElementById('input-loader-muzika').value.replace(/^\//, ''),
                screensaverMusic: document.getElementById('input-ss-muzika').value.replace(/^\//, ''),
                screensaverTimeout: parseInt(document.getElementById('input-ss-tajmer').value) || 60,
                projectName: trenutniConfig.config?.globalSettings?.projectName || "Selection",
                projectSubtitle: trenutniConfig.config?.globalSettings?.projectSubtitle || ""
            },
            hasWarningMessage: trenutniConfig.config?.hasWarningMessage ?? true
        },
        loader: {
            warningTitle: document.getElementById('zoom-core-warningTitle')?.value || "⚠️ UPOZORENJE ⚠️",
            warningFinalLine: "",
            warningTexts: trenutniConfig.loader?.warningTexts || []
        },
        timeline: trenutniConfig.timeline || []
    };

    const formData = new FormData();
    formData.append('config_data', JSON.stringify(cistConfigZaExport));
    formData.append('action', akcija);

    const aktivniSubdomenZaSnimanje = localStorage.getItem('userSubdomain') || 'canvas';
    formData.append('subdomain', aktivniSubdomenZaSnimanje);

    const trenutniEmail = localStorage.getItem('userEmail');
    if (trenutniEmail) formData.append('client_email', trenutniEmail);

    if (fajloviZaUpload && fajloviZaUpload.length > 0) {
        fajloviZaUpload.forEach((item, index) => {
            formData.append(`file_${index}`, item.rawFile, item.putanja);
        });
    }

    try {
        console.log(`🚀 Strimujem mrežni payload [Akcija: ${akcija.toUpperCase()}] na Edge R2/KV Kernel...`);

        // POVLAČIMO MINTTOVANI TOKEN IZ LOKALNE MEMORIJE
        const token = localStorage.getItem('selection_session_token');

        const response = await fetch(`${API_BASE}/save_data`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        const tekstOdgovora = await response.text();
        if (response.ok) {
            fajloviZaUpload = [];
            alert(akcija === 'publish' ? "🎉 USPEŠNO LANSIRANO: Sajt je osvežen i aktivan!" : "💾 USPEŠNO SAČUVANO: Radna verzija je bezbedno zaključana u Draft.");
            location.reload();
        } else {
            let porukaZaPrikaz = tekstOdgovora;
            try {
                const jsonGreska = JSON.parse(tekstOdgovora);
                if (jsonGreska.error) porukaZaPrikaz = jsonGreska.error;
            } catch (e) { }
            alert("🔒 Gvozdeni Kernel odbio zahtev:\n" + porukaZaPrikaz);
        }
    } catch (error) {
        console.error("❌ Prekid na mrežnoj magistrali:", error);
        alert("❌ Prekid komunikacije sa Edge serverom.");
    }
}

// ==========================================================================
// 5.1 PREVIEW PANEL BUTTON INJECTION (Desno ispod simulatora)
// ==========================================================================
function inicijalizujDugmadZaSnimanje() {
    const staraDugmad = document.querySelectorAll('.btn-save');
    staraDugmad.forEach(btn => {
        if (btn && btn.innerText.includes("Sačuvaj i Objavi Sve")) {
            btn.remove();
        }
    });

    const previewPanel = document.getElementById('global-preview-panel');
    if (!previewPanel) return;

    if (document.getElementById('kernel-save-wrapper-right')) return;

    const kontrolnaDugmadDesno = document.createElement('div');
    kontrolnaDugmadDesno.id = 'kernel-save-wrapper-right';

    kontrolnaDugmadDesno.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
    `;

    kontrolnaDugmadDesno.innerHTML = `
        <button type="button" class="btn-save" onclick="sacuvajSveNaServer('save')" style="background: #1c2a39; border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 100%; cursor: pointer; padding: 12px; border-radius: 6px; font-family: 'Montserrat', sans-serif; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 500;"><i class="fa-solid fa-floppy-disk"></i> Sačuvaj u radni Draft</button>
        <button type="button" class="btn-save" onclick="sacuvajSveNaServer('publish')" style="width: 100%; cursor: pointer; padding: 12px; border-radius: 6px; background: var(--admin-accent); color: var(--admin-sidebar); font-family: 'Montserrat', sans-serif; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; border: none;"><i class="fa-solid fa-rocket"></i> Lansiraj i Objavi Uživo</button>
    `;

    previewPanel.appendChild(kontrolnaDugmadDesno);
}
setTimeout(inicijalizujDugmadZaSnimanje, 500);

// ==========================================================================
// 6. MULTIMEDIA UPLOAD & INTERACTION HANDLERS
// ==========================================================================
function okiniGlobalniKlikFajla(tipMetmete) {
    const input = document.createElement('input');
    input.type = 'file';

    if (tipMetmete === 'slika' || tipMetmete === 'gallery-images' || tipMetmete === 'final-icon') input.accept = 'image/*';
    else if (tipMetmete === 'video-file') input.accept = 'video/mp4';
    else input.accept = 'audio/mp3';

    if (tipMetmete === 'gallery-images') input.multiple = true;

    input.onchange = (e) => {
        if (e.target.files.length === 0) return;

        Array.from(e.target.files).forEach(fajl => {
            const imeFajla = fajl.name;
            const previewUrl = URL.createObjectURL(fajl);

            if (tipMetmete === 'slika') {
                document.getElementById('input-slika-pozadina').value = 'images/' + imeFajla;
                document.getElementById('label-global-pozadina').innerText = 'images/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                trenutniConfig.config.globalSettings._tempBgPreview = previewUrl;
            }
            else if (tipMetmete === 'loader-mp3') {
                document.getElementById('input-loader-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-loader-muzika').innerText = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            }
            else if (tipMetmete === 'ss-mp3') {
                document.getElementById('input-ss-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-ss-muzika').innerText = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            }
            else if (tipMetmete === 'video-file' && aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[aktivniIndex];
                blok.url = previewUrl; blok._realVideoName = imeFajla; blok._realName = 'videos/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'videos/' + imeFajla, rawFile: fajl });
                document.getElementById('zoom-video-display-name').innerText = imeFajla;
            }
            else if (tipMetmete === 'block-audio' && aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[aktivniIndex];
                blok.bgMusicUrl = previewUrl; blok._realAudioName = imeFajla; blok._realName = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
                document.getElementById('zoom-audio-display-name').innerText = `Traka: ${imeFajla}`;
            }
            else if (tipMetmete === 'final-icon' && aktivniIndex !== null) {
                document.getElementById('zoom-field-endIconType').value = 'images/' + imeFajla;
                trenutniConfig.timeline[aktivniIndex]._realIconName = imeFajla;
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                document.getElementById('final-icon-status').innerText = `Učitano: ${imeFajla}`;
            }
            else if (tipMetmete === 'gallery-images' && aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[aktivniIndex];
                if (!blok.galleryImages) blok.galleryImages = [];
                if (!blok._realGalleryNames) blok._realGalleryNames = [];

                blok.galleryImages.push(previewUrl);
                blok._realGalleryNames.push('images/' + imeFajla);
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                osveziZoomGalerijuEkran(aktivniIndex);
            }
        });
        osveziZiviPreview();
    };
    input.click();
}

// ==========================================================================
// 7. CONTROL PLANE: PROVISIONING NEW STANDS (Master Only)
// ==========================================================================
async function masterKreirajNovogKorisnika() {
    const subInput = document.getElementById('master-novi-subdomain');
    const emailInput = document.getElementById('master-novi-email');
    const statusPoruka = document.getElementById('master-status-poruka');

    if (!subInput || !emailInput || !statusPoruka) return;

    const subdomain = subInput.value.trim().toLowerCase();
    const email = emailInput.value.trim();

    if (!subdomain || !email) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Greška: Unesi i poddomen i email!"; return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Koristi samo mala slova, brojeve i crticu."; return;
    }

    if (!confirm(`Lansiraš novi SaaS prostor na adresi: https://${subdomain}.selection.rs za klijenta ${email}?`)) return;

    statusPoruka.style.color = "#d4b483"; statusPoruka.style.display = "block";
    statusPoruka.innerText = "⚡ Pokrećem sisteme i mapiram KV slotove...";

    try {
        const response = await fetch(`${API_BASE}/provision_user`, {
            method: 'POST',
            credentials: "include",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, subdomain: subdomain, role: "admin" })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            statusPoruka.style.color = "#2ecc71";
            statusPoruka.innerHTML = `🎉 USPEH: Prostor <strong>${subdomain}</strong> je aktiviran na Edge-u!<br>🔗 Klijentski prostor: <a href="https://${subdomain}.selection.rs" target="_blank" style="color:#2ecc71; text-decoration:underline;">${subdomain}.selection.rs</a>`;
            subInput.value = ''; emailInput.value = '';
        } else {
            statusPoruka.style.color = "#b81d24";
            statusPoruka.innerText = `❌ Odbijeno od Kernela: ${rez.error || "Nepoznata greška"}`;
        }
    } catch (error) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Komunikacija sa kontrolnom tablom nije uspela.";
    }
}

// ==========================================================================
// 8. GRAPHIC GALLERY DRAG & DROP INTERNAL SORTING
// ==========================================================================
let izvornaSvezaSlikaIndex = null;
function hendlujDragStart(e) { izvornaSvezaSlikaIndex = e.currentTarget.getAttribute('data-img-index'); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.4'; }
function hendlujDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }

function hendlujDrop(e, blokIndex) {
    if (e.stopPropagation) e.stopPropagation();
    const ciljniIndex = e.currentTarget.getAttribute('data-img-index');
    if (izvornaSvezaSlikaIndex === ciljniIndex || izvornaSvezaSlikaIndex === null) return;

    const blok = trenutniConfig.timeline[blokIndex];
    const pomerenaSlika = blok.galleryImages.splice(izvornaSvezaSlikaIndex, 1)[0];
    blok.galleryImages.splice(ciljniIndex, 0, pomerenaSlika);

    if (blok._realGalleryNames) {
        const pomerenoIme = blok._realGalleryNames.splice(izvornaSvezaSlikaIndex, 1)[0];
        blok._realGalleryNames.splice(ciljniIndex, 0, pomerenoIme);
    }

    osveziZoomGalerijuEkran(blokIndex);
    sinhronizujZoomSaPreviewom();
}

function osveziZoomGalerijuEkran(blokIndex) {
    const blok = trenutniConfig.timeline[blokIndex];
    const kontejner = document.getElementById('zoom-gallery-container');
    if (!kontejner) return;

    let slikeHtml = '';
    if (blok.galleryImages && blok.galleryImages.length > 0) {
        blok.galleryImages.forEach((imgSrc, imgIndex) => {
            slikeHtml += `
                <div class="zoom-thumb" draggable="true" data-img-index="${imgIndex}"
                     ondragstart="hendlujDragStart(event)" ondragover="hendlujDragOver(event)" ondrop="hendlujDrop(event, ${blokIndex})">
                    <img src="${imgSrc}">
                    <button type="button" onclick="event.stopPropagation(); ukloniSlikuIzGalerijeZoom(${imgIndex})">×</button>
                </div>
            `;
        });
    } else {
        slikeHtml = `<p style="font-size: 0.75rem; color: var(--admin-muted); padding: 10px;">Galerija prazna.</p>`;
    }
    kontejner.innerHTML = slikeHtml;
}

function promeniRezimSimulatora(rezim) {
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
    osveziZiviPreview();
}

function inicijalizujDragAndDrop() {
    window.removeEventListener('dragover', globalDragOver); window.removeEventListener('drop', globalDrop);
    window.addEventListener('dragover', globalDragOver); window.addEventListener('drop', globalDrop);
}
function globalDragOver(e) { e.preventDefault(); }
function globalDrop(e) {
    e.preventDefault();
    const dropPozadina = e.target.closest('#drop-global-pozadina');
    const dropLoaderMuzika = e.target.closest('#drop-global-loader-muzika');

    if (e.dataTransfer.files.length > 0) {
        const fajl = e.dataTransfer.files[0];
        const imeFajla = fajl.name;

        if (dropPozadina) {
            document.getElementById('input-slika-pozadina').value = 'images/' + imeFajla;
            document.getElementById('label-global-pozadina').innerText = 'images/' + imeFajla;
            fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
            trenutniConfig.config.globalSettings._tempBgPreview = URL.createObjectURL(fajl);
            osveziZiviPreview();
        }
        else if (dropLoaderMuzika) {
            document.getElementById('input-loader-muzika').value = 'audio/' + imeFajla;
            document.getElementById('label-global-loader-muzika').innerText = 'audio/' + imeFajla;
            fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
        }
    }
}
function okiniLokalniKlikFajla(tip) { okiniGlobalniKlikFajla(tip); }