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
// 1. IDENTITY & KERNEL INITIALIZATION (Fixed Race Condition & Mapping)
// ==========================================================================

async function proveriKorisnikaIUpravljajInterfejsom() {
    const masterBlok = document.getElementById('master-admin-blok');
    const badge = document.getElementById('user-session-badge');

    if (masterBlok) masterBlok.style.display = "none";

    try {
        console.log("🪙 Korak 1: Pokrećem Token Exchange sa lokalnog /issue_session...");

        // Uzimamo Selection Token sa admin strane (gde je Access aktivan)
        const tokenRes = await fetch("/issue_session", { credentials: "include" });
        if (!tokenRes.ok) throw new Error("Cloudflare Access odbio izdavanje lokalne sesije.");

        const tokenData = await tokenRes.json();
        if (!tokenData.token) throw new Error("Token kovnica je vratila prazan ključ.");

        // Skladištimo ga u LocalStorage pod jedinstvenim imenom
        localStorage.setItem('selection_session_token', tokenData.token);
        console.log("✅ Korak 1 uspešan: Selection Token bezbedno zaključan u LocalStorage.");

        console.log("📡 Korak 2: Autentifikujem se na javni shell sa novim Bearer tokenom...");

        // Idemo na javni shell sa hirurški očišćenim zaglavljem bez X-Requested-With!
        const res = await fetch(`${API_BASE}/get_user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.token}`
            }
        });

        if (!res.ok) throw new Error(`Shell odbio Bearer sesiju sa statusom: ${res.status}`);

        const userData = await res.json();
        console.log("👤 Korak 2 uspešan! Sirovi podaci sa servera:", userData);

        if (userData.error) throw new Error(userData.error);

        // UI Ekstraktor: Prilagođavanje shape-u podataka (user objekat ili koren)
        const profil = userData.user || userData;
        const korisnickiEmail = profil.email || localStorage.getItem('userEmail') || "selectionrooms@gmail.com";
        const korisnickaUloga = profil.role || "client";
        const korisnickiStatus = profil.status || "pending"; // Čitamo status vize sa Edge-a!

        // Gvozdeni guard protiv undefined poddomena
        let aktivniSubdomain = profil.tenant || profil.subdomain || "admin";
        if (!aktivniSubdomain || aktivniSubdomain === "undefined") {
            console.warn("⚠️ Subdomain detektovan kao nepostojeći, fallback na 'admin'");
            aktivniSubdomain = "admin";
        }

        // 🧱 BOOKING.COM STYLE SPLASH GATE (Korisnik je na čekanju)
        if (korisnickaUloga !== "master" && korisnickiStatus !== "approved") {
            console.warn(`🔒 Korisnik na čekanju [Status: ${korisnickiStatus}]. Blokiram radni prostor.`);

            if (masterBlok) masterBlok.style.display = "none";

            // Hvata glavni kontejner celog CMS-a
            const glavniCMSWorkspace = document.querySelector('.main-workspace-container') || document.body;

            // 🎯 POPRAVAK PORAVNANJA: Samo dodeljujemo čistu klasu iz style.css!
            glavniCMSWorkspace.className = "global-splash-lockout";
            glavniCMSWorkspace.removeAttribute("style"); // Čistimo stare inline tragove ako postoje

            glavniCMSWorkspace.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: 'Montserrat', sans-serif; color: #fff;">
                    <div style="font-size: 60px; margin-bottom: 25px; filter: drop-shadow(0 0 10px rgba(214,180,131,0.2));">🔒</div>
                    <h1 style="font-family: 'Cinzel', serif; color: var(--admin-accent); font-size: 2.2rem; margin: 0 0 12px 0; letter-spacing: 1px; text-transform: uppercase;">Account Review in Progress</h1>
                    <p style="color: #eeeeee; max-width: 480px; font-size: 0.95rem; line-height: 1.6; opacity: 0.85; margin: 0 0 25px 0;">
                        Hello <strong style="color:var(--admin-accent); font-weight: 600;">${korisnickiEmail}</strong>. Your Selection SaaS space has been successfully reserved and provisioned on the Edge node, but it is currently awaiting administration approval.
                    </p>
                    <div style="background: rgba(212, 180, 131, 0.03); border: 1px dashed var(--admin-accent); padding: 14px 24px; border-radius: 6px; font-size: 0.85rem; color: var(--admin-accent); font-weight: 500; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <i class="fa-solid fa-clock-rotate-left"></i> Administration is verifying your metrics and will activate your panel shortly.
                    </div>
                    <span style="font-size: 0.75rem; margin-top: 50px; opacity: 0.25; letter-spacing: 0.5px;">Selection SaaS Engine • Identity Verified at Edge</span>
                </div>
            `;

            if (badge) {
                badge.innerHTML = `⏳ <span style="color: #d4b483; font-weight: 600;">Awaiting Approval</span>`;
                badge.style.display = "flex";
            }

            return; // ⛔ STOP! Prekidamo bootstrap lanca ovde. ucitajConfig se nikada neće okinuti!
        }

        // --- PROLAZ ODOBREN (Korisnik je APPROVED ili si ti SYSTEM MASTER) ---
        if (badge) {
            const ikonica = korisnickaUloga === "master" ? "👑" : "🔒";
            badge.innerHTML = `${ikonica} <span style="color: var(--admin-accent); font-weight: 600;">${korisnickiEmail}</span>`;
            badge.style.display = "flex";
        }

        localStorage.setItem('userEmail', korisnickiEmail);
        localStorage.setItem('userSubdomain', aktivniSubdomain);
        window.currentSubdomain = aktivniSubdomain;

        // 👑 INTERFEJS RASKRSNICA: Master vs Klijent Guard
        if (korisnickaUloga === "master") {
            console.log(`👑 Access Granted [System Master]. Deploying Core Control Plane...`);
            if (masterBlok) masterBlok.style.display = "block";
            ucitajConfig("admin");
        } else {
            console.log(`🛡️ Access Granted [Tenant Client]. Bootstrapping workspace for: ${aktivniSubdomain}`);

            // 🔥 BRUTALNO UNIŠTAVANJE: Čupamo Master blok iz HTML memorije brauzera!
            if (masterBlok) {
                masterBlok.remove();
            }

            // 🛑 SABOTAŽA KONZOLE: Kompletna neutralizacija funkcija ako klijent pokuša ručni poziv
            window.otvoriMasterControlPlane = function () {
                console.warn("🔒 Security Engine Exception: Hierarchy restriction active.");
                return false;
            };
            window.promeniStatusKlijentaMaster = null;
            window.osveziMasterTabeluKorisnika = null;

            ucitajConfig(aktivniSubdomain);
        }

    } catch (err) {
        console.error("❌ Bootstrap krah. Aktiviram lokalni Devel Fallback...", err);

        if (badge) {
            badge.innerHTML = `⚠️ <span style="color: #d4b483; font-weight: 600;">Local Sandbox (Devel)</span>`;
            badge.style.display = "flex";
        }

        if (masterBlok) masterBlok.style.display = "block";

        const klijentovSubdomain = localStorage.getItem('userSubdomain') || 'admin';
        window.currentSubdomain = klijentovSubdomain;
        ucitajConfig(klijentovSubdomain);
    }
}
// 📂 SINHRONIZOVANO: Povlačenje konfiguracije sa Edge baze podataka
function ucitajConfig(subdomain) {
    const cisceniSubdomain = subdomain || "admin";
    console.log(`📂 Pokrećem učitavanje konfiguracije sa Edge API-ja za poddomen: ${cisceniSubdomain}...`);

    fetch(`${API_BASE}/api/config?subdomain=${cisceniSubdomain}&nocache=${Date.now()}`, {
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

            console.log(`✅ Config za [${cisceniSubdomain}] uspešno učitan iz baze:`, trenutniConfig);

            popuniGlobalneStilove();
            osveziCoreSummaryTekst();
            renderujTimelineBlokove();
            osveziZiviPreview();
            promeniRezimSimulatora('mobile');
        })
        .catch(err => {
            console.error("❌ Greška pri učitavanju konfiguracije. Pravim stabilan lokalni kostur.", err);

            // 🎯 POPRAVLJENO: Spojeno u camelCase naziv varijable bez razmaka!
            const siguranNazivProjekta = (cisceniSubdomain || "ADMIN").toUpperCase();

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
                        projectName: siguranNazivProjekta, // <-- Ovde se lepo mapira
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

    if (document.getElementById('input-slika-pozadina')) document.getElementById('input-slika-pozadina').value = settings.mainBackgroundImage || '';
    if (document.getElementById('label-global-pozadina')) document.getElementById('label-global-pozadina').innerText = settings.mainBackgroundImage || 'Klikni ili prevuci sliku ovde';

    if (document.getElementById('input-loader-muzika')) document.getElementById('input-loader-muzika').value = settings.loaderMusic || '';
    if (document.getElementById('label-global-loader-muzika')) document.getElementById('label-global-loader-muzika').innerText = settings.loaderMusic || 'Klikni ili prevuci .mp3 ovde';

    if (document.getElementById('input-ss-muzika')) document.getElementById('input-ss-muzika').value = settings.screensaverMusic || '';
    if (document.getElementById('label-global-ss-muzika')) document.getElementById('label-global-ss-muzika').innerText = settings.screensaverMusic || 'Klikni ili prevuci .mp3 ovde';
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
        let slikaZaPrikaz = trenutniConfig.config?.globalSettings?._tempBgPreview || document.getElementById('input-slika-pozadina').value;

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        simulator.style.backgroundImage = slikaZaPrikaz ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')` : 'none';
        simulator.style.backgroundSize = 'cover'; simulator.style.backgroundPosition = 'center';

        const stilKontejnera = `background: ${bojaKontejnera}; padding: 22px; border-radius: 14px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 100%;`;

        // Sigurna toUpperCase eksploatacija za simulator
        const ziviPoddomen = (window.currentSubdomain || "ADMIN").toUpperCase();

        if (aktivniIndex === null || aktivniIndex === -1) {
            if (statusTag) statusTag.innerText = "Prikaz: Uvodni ekran";
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config?.globalSettings?.projectName || ziviPoddomen;
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config?.globalSettings?.projectSubtitle || '';

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
                        <button style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 5px 10px; font-size: 0.75rem; border-radius: 6px; margin-top: 10px; font-weight:600;">${btnT}</button>
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

    // Siguran guard za toUpperCase iznad naziva projekta
    const sigurniSubdomenZaTekst = (window.currentSubdomain || "Selection").toUpperCase();

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
                projectName: trenutniConfig.config?.globalSettings?.projectName || sigurniSubdomenZaTekst,
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

    const aktivniSubdomenZaSnimanje = window.currentSubdomain || localStorage.getItem('userSubdomain') || 'admin';
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

        // Povlačimo iskovani Selection Bearer token iz memorije
        const token = localStorage.getItem('selection_session_token');

        // 🧱 HIRURŠKI POPRAVLJENO: Izbačeno "X-Requested-With" da preflight propusti POST!
        const response = await fetch(`${API_BASE}/save_data`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
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
                if (trenutniConfig && trenutniConfig.config && trenutniConfig.config.globalSettings) {
                    trenutniConfig.config.globalSettings._tempBgPreview = previewUrl;
                }
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
                if (document.getElementById('zoom-video-display-name')) {
                    document.getElementById('zoom-video-display-name').innerText = imeFajla;
                }
            }
            else if (tipMetmete === 'block-audio' && aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[aktivniIndex];
                blok.bgMusicUrl = previewUrl; blok._realAudioName = imeFajla; blok._realName = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
                if (document.getElementById('zoom-audio-display-name')) {
                    document.getElementById('zoom-audio-display-name').innerText = `Traka: ${imeFajla}`;
                }
            }
            else if (tipMetmete === 'final-icon' && aktivniIndex !== null) {
                document.getElementById('zoom-field-endIconType').value = 'images/' + imeFajla;
                trenutniConfig.timeline[aktivniIndex]._realIconName = imeFajla;
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                if (document.getElementById('final-icon-status')) {
                    document.getElementById('final-icon-status').innerText = `Učitano: ${imeFajla}`;
                }
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
// ==========================================================================
// 7. CONTROL PLANE: PROVISIONING NEW STANDS (Master Only - Fixed Auth)
// ==========================================================================
// ==========================================================================
// 7. CONTROL PLANE: PROVISIONING NEW STANDS (Master Only - English + Auth Fix)
// ==========================================================================
async function masterKreirajNovogKorisnika() {
    const subInput = document.getElementById('master-novi-subdomain');
    const emailInput = document.getElementById('master-novi-email');
    const statusPoruka = document.getElementById('master-status-poruka');

    if (!subInput || !emailInput || !statusPoruka) return;

    const subdomain = subInput.value.trim().toLowerCase();
    const email = emailInput.value.trim();

    if (!subdomain || !email) {
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Error: Please enter both subdomain and email!";
        return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Error: Use lowercase letters, numbers, and hyphens only.";
        return;
    }

    if (!confirm(`Launch new SaaS space at https://${subdomain}.selection.rs for client ${email}?`)) return;

    statusPoruka.style.color = "#d4b483";
    statusPoruka.style.display = "block";
    statusPoruka.innerText = "⚡ Booting systems and mapping Edge slots...";

    try {
        // 🎯 GVOZDENI FIX: Izvlačimo tvoj potpisani master token iz lokalne memorije
        const token = localStorage.getItem('selection_session_token');

        const response = await fetch(`${API_BASE}/provision_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '' // Šaljemo tvoj identitet na Edge!
            },
            body: JSON.stringify({ email: email, subdomain: subdomain, role: "admin" })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            statusPoruka.style.color = "#2ecc71";
            statusPoruka.innerHTML = `🎉 SUCCESS: Space <strong>${subdomain}</strong> is active on the Edge network!<br>🔗 Client Canvas: <a href="https://${subdomain}.selection.rs" target="_blank" style="color:#2ecc71; text-decoration:underline;">${subdomain}.selection.rs</a>`;
            subInput.value = '';
            emailInput.value = '';
        } else {
            statusPoruka.style.color = "#b81d24";
            statusPoruka.innerText = `❌ Rejected by Kernel: ${rez.error || "Unknown error"}`;
        }
    } catch (error) {
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Communication with the Control Plane failed.";
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
            if (trenutniConfig && trenutniConfig.config && trenutniConfig.config.globalSettings) {
                trenutniConfig.config.globalSettings._tempBgPreview = URL.createObjectURL(fajl);
            }
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

// ==========================================================================
// 8. SAAS CONTROL PLANE: FULL-SCREEN OVERLAY ENGINE (Master Only)
// ==========================================================================
async function otvoriMasterControlPlane() {
    const overlay = document.getElementById('master-control-plane-overlay');
    if (!overlay) return;

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Lock background scrolling

    await osveziMasterTabeluKorisnika();
}

function zatvoriMasterControlPlane() {
    document.getElementById('master-control-plane-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('master-users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--admin-accent); font-weight:600;">⚡ Scanning Edge KV bus, fetching user records...</td></tr>`;

    try {
        const token = localStorage.getItem('selection_session_token');
        const res = await fetch(`${API_BASE}/api/master/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Edge Kernel rejected access control read.");
        const data = await res.json();

        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--admin-muted);">No tenant records found on the network.</td></tr>`;
            return;
        }

        document.getElementById('stat-total-users').innerText = data.users.length;
        document.getElementById('stat-pending-users').innerText = data.users.filter(u => u.status === 'pending').length;
        document.getElementById('stat-approved-users').innerText = data.users.filter(u => u.status === 'approved').length;

        tbody.innerHTML = ''; // Clear loader

        data.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--admin-border)";

            let statusBadge = '';
            if (user.status === 'approved') {
                statusBadge = `<span style="background: rgba(46, 204, 113, 0.1); color: #2ecc71; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">✔️ APPROVED</span>`;
            } else if (user.status === 'blocked') {
                statusBadge = `<span style="background: rgba(184, 29, 36, 0.1); color: #b81d24; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">⛔ BLOCKED</span>`;
            } else {
                statusBadge = `<span style="background: rgba(212, 180, 131, 0.1); color: var(--admin-accent); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">⏳ PENDING</span>`;
            }

            let actionButton = '';
            if (user.email !== "selectionrooms@gmail.com") {
                if (user.status === 'approved') {
                    actionButton = `<button onclick="promeniStatusKlijentaMaster('${user.email}', 'blocked', '${user.tenant}')" style="background:#b81d24; border:none; color:#fff; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:700; transition:0.2s;">Revoke Access</button>`;
                } else {
                    actionButton = `<button onclick="promeniStatusKlijentaMaster('${user.email}', 'approved', '${user.tenant}')" style="background:#2ecc71; border:none; color:#0a1015; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:800; transition:0.2s;">Approve Tenant</button>`;
                }
            } else {
                actionButton = `<span style="color:var(--admin-muted); font-size:0.75rem; font-style:italic;">Core Master Node</span>`;
            }

            tr.innerHTML = `
                <td style="padding: 14px; font-weight:600; color:#fff;">${user.email}</td>
                <td style="padding: 14px;">
                    <input type="text" id="tenant-input-${user.email.replace(/[@.]/g, '_')}" value="${user.tenant || ''}" style="background:#070b0e; color:#fff; border:1px solid var(--admin-border); padding:6px 10px; border-radius:6px; font-size:0.85rem; width:140px;">
                </td>
                <td style="padding: 14px; text-transform:uppercase; font-size:0.8rem; color:var(--admin-muted); font-weight:600;">${user.role || 'client'}</td>
                <td style="padding: 14px; color:var(--admin-muted); font-size:0.85rem;">${user.odobren_datuma || user.created_at || 'N/A'}</td>
                <td style="padding: 14px;">${statusBadge}</td>
                <td style="padding: 14px; text-align: right;">${actionButton}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#b81d24; font-weight:600;">❌ Matrix error: ${err.message}</td></tr>`;
    }
}

async function promeniStatusKlijentaMaster(email, status, oldTenant) {
    const idSuffix = email.replace(/[@.]/g, '_');
    const inputElement = document.getElementById(`tenant-input-${idSuffix}`);
    const targetSubdomain = inputElement ? inputElement.value.trim().toLowerCase() : oldTenant;

    if (!targetSubdomain) {
        alert("❌ Operations Error: A valid subdomain mapping is required before status transformation.");
        return;
    }

    const confirmMessage = status === 'approved'
        ? `Authorize security visa for ${email} on node: https://${targetSubdomain}.selection.rs?`
        : `Revoke system permissions for ${email}? This will immediately lockout the tenant.`;

    if (!confirm(confirmMessage)) return;

    try {
        const token = localStorage.getItem('selection_session_token');
        const response = await fetch(`${API_BASE}/api/master/update_status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                klijentEmail: email,
                noviStatus: status,
                noviTenant: targetSubdomain,
                novaUloga: "client"
            })
        });

        if (response.ok) {
            await osveziMasterTabeluKorisnika(); // Reload table matrix instantly
        } else {
            alert("🔒 Edge Engine core validation rejected the request.");
        }
    } catch (e) {
        alert("❌ Control Plane transmission interface lost link.");
    }
}