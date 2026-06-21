// Global CMS State mapping config.json
let trenutniConfig = null;
let aktivniIndex = null; // Koristi se i za selekciju i za zoom tracking
let isEditingCore = false; // Flag ako zumiramo u Core Splash umesto u standardni lego blok

// Globalni niz u koji skladištimo prave binarne fajlove pre slanja na Cloudflare R2
let fajloviZaUpload = [];

// ==========================================================================
// 1. INITIALIZATION & DATA FETCHING
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // PRVO: Proveravamo ko je korisnik i krojimo Sidebar (sakrivamo/prikazujemo krunu)
    proveriKorisnikaIUpravljajInterfejsom();
});

async function proveriKorisnikaIUpravljajInterfejsom() {
    const masterBlok = document.getElementById('master-admin-blok');
    const badge = document.getElementById('user-session-badge');

    try {
        console.log("🔒 Proveravam mrežni identitet korisnika sa Cloudflare Shell-a...");

        // Pitamo naš poddomen ruter ko drži sesiju preko Zero Trust-a
        const res = await fetch('https://shell.selection.rs/get_user', {
            method: 'GET',
            credentials: "include" // Omogućava prenos Cloudflare Access tokena
        });

        if (!res.ok) throw new Error(`Server odgovorio sa statusom: ${res.status}`);

        const userData = await res.json();
        console.log("👤 Podaci o sesiji uspešno povučeni:", userData);

        if (userData.error) {
            throw new Error(userData.error);
        }

        // Ispisujemo ulogovanog korisnika u gornji desni ćošak
        if (badge) {
            const ikonica = userData.role === "master" ? "👑" : "🔒";
            badge.innerHTML = `${ikonica} <span style="color: var(--admin-accent); font-weight: 600;">${userData.email}</span>`;
            badge.style.display = "block";
        }

        // Proveravamo ulogu i krojimo interfejs
        if (userData.role === "master") {
            if (masterBlok) masterBlok.style.display = "block";
            console.log("👑 Dobrodošao, Master Admin. Sistemi za lansiranje su spremni.");

            localStorage.setItem('userEmail', userData.email);
            ucitajConfig("canvas"); // Master po defaultu učitava radni šablon
        } else {
            // OBIČAN KLIJENT -> Striktno i fizički uklanjamo panel iz koda
            if (masterBlok) {
                masterBlok.remove();
            } else {
                const alternativniBlok = document.querySelector('.master-card');
                if (alternativniBlok) alternativniBlok.remove();
            }
            console.log(`🔒 Logovan klijent sa adresom: ${userData.email}`);
            console.log(`📂 Dodeljeni radni prostor iz baze: ${userData.subdomain}`);

            localStorage.setItem('userEmail', userData.email);
            localStorage.setItem('userSubdomain', userData.subdomain);

            // Učitavamo isključivo njegov namenski sajt iz baze podataka
            ucitajConfig(userData.subdomain);
        }

    } catch (err) {
        console.error("❌ Greška pri proveri korisnika. Koristim bezbednosni fallback.", err);

        if (badge) {
            badge.innerHTML = `⚠️ <span style="color: #b81d24; font-weight: 600;">Mreža nedostupna</span>`;
            badge.style.display = "block";
        }

        // STRIKTNA BEZBEDNOST: Fizički uništavamo master blok sa ekrana
        const proveraBloka = document.getElementById('master-admin-blok') || document.querySelector('.master-card');
        if (proveraBloka) {
            proveraBloka.remove();
        }

        // Bezbednosni fallback za poddomen: sprečavamo slanje praznog stringa ili "canvas" za obične klijente
        const klijentovSubdomain = localStorage.getItem('userSubdomain');
        if (klijentovSubdomain) {
            ucitajConfig(klijentovSubdomain);
        } else {
            console.log("📭 Nema lokalno sačuvanog poddomena. Preusmeravam na glavni login.");
        }
    }
}

function ucitajConfig(subdomain) {
    console.log(`📂 Pokrećem učitavanje konfiguracije za poddomen: ${subdomain}...`);

    fetch(`https://shell.selection.rs/?subdomain=${subdomain}&nocache=${Date.now()}`, {
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Server je vratio grešku: " + res.status);
            return res.json();
        })
        .then(data => {
            trenutniConfig = data;
            console.log(`✅ Config za [${subdomain}] uspešno učitan iz Cloudflare baze:`, trenutniConfig);
            popuniGlobalneStilove();
            osveziCoreSummaryTekst();
            renderujTimelineBlokove();
            promeniRezimSimulatora('mobile');
        })
        .catch(err => {
            console.error("❌ Greška pri učitavanju konfiguracije. Pravim prazan šablon.", err);
            trenutniConfig = {
                config: {
                    globalSettings: {
                        primaryColor: "#d4b483",
                        secondaryColor: "#d4b483",
                        textColor: "#eeeeee",
                        metaColor: "#a0acb8",
                        backgroundColor: "#0f171e",
                        mainBackgroundImage: "",
                        containerBg: "#1c2a39",
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
                loader: { warningTitle: "⚠️ UPOZORENJE ⚠️", warningFinalLine: "", warningTexts: [] },
                timeline: []
            };
            popuniGlobalneStilove();
            osveziCoreSummaryTekst();
            renderujTimelineBlokove();
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

    const slikaPozadine = settings.mainBackgroundImage || '';
    if (document.getElementById('input-slika-pozadina')) document.getElementById('input-slika-pozadina').value = slikaPozadine;
    if (document.getElementById('label-global-pozadina')) document.getElementById('label-global-pozadina').innerText = slikaPozadine ? slikaPozadine : 'Klikni ili prevuci sliku ovde';

    const loaderMuzika = settings.loaderMusic || '';
    if (document.getElementById('input-loader-muzika')) document.getElementById('input-loader-muzika').value = loaderMuzika;
    if (document.getElementById('label-global-loader-muzika')) document.getElementById('label-global-loader-muzika').innerText = loaderMuzika ? loaderMuzika : 'Klikni ili prevuci .mp3 ovde';

    const ssMuzika = settings.screensaverMusic || '';
    if (document.getElementById('input-ss-muzika')) document.getElementById('input-ss-muzika').value = ssMuzika;
    if (document.getElementById('label-global-ss-muzika')) document.getElementById('label-global-ss-muzika').innerText = ssMuzika ? ssMuzika : 'Klikni ili prevuci .mp3 ovde';
}

function osveziCoreSummaryTekst() {
    const el = document.getElementById('summary-core-title');
    if (el && trenutniConfig && trenutniConfig.config && trenutniConfig.config.globalSettings) {
        const name = trenutniConfig.config.globalSettings.projectName || 'Unnamed';
        const sub = trenutniConfig.config.globalSettings.projectSubtitle || '';
        el.innerHTML = `Aktivni projekat: <strong>${name}</strong> — <em>"${sub}"</em>`;
    }
}

function otvoriSplashConfig() {
    otvoriCoreZoomEditor();
}

// ==========================================================================
// 3. RIGHT WORKSPACE: DYNAMIC COMPACT TIMELINE CARDS RENDER
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
        <div class="block-num">
            <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--admin-accent);"></i>
        </div>
        <div class="block-meta-details">
            <div class="block-type-tag">UVOĐENJE U APLIKACIJU</div>
            <div class="block-summary-text" id="summary-core-title">Početni Ekran i Uvodna Pravila</div>
            <div class="block-media-indicators"><span><i class="fa-solid fa-gear"></i> Ime projekta, podnaslov i uvodne poruke</span></div>
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
            const vName = blok._realVideoName || (blok.url && !blok.url.startsWith('blob:') ? blok.url.split('/').pop() : 'Video je ubačen');
            if (vName) mediaIndicators += `<span><i class="fa-solid fa-video"></i> ${vName}</span>`;
        }
        if (blok.type === 'chapter' && blok.galleryImages && blok.galleryImages.length > 0) {
            mediaIndicators += `<span><i class="fa-solid fa-images"></i> Sadrži ${blok.galleryImages.length} slika</span>`;
        }
        const aName = blok._realAudioName || (blok.bgMusicUrl && !blok.bgMusicUrl.startsWith('blob:') ? 'Muzika u pozadini' : '');
        if (aName) mediaIndicators += `<span><i class="fa-solid fa-music"></i> Muzika aktivna</span>`;
        if (blok.sceneEffect && blok.sceneEffect !== 'none') {
            mediaIndicators += `<span><i class="fa-solid fa-sparkles"></i> Efekat: ${blok.sceneEffect}</span>`;
        }

        let srpskiTip = '';
        let summaryTekst = '';

        if (blok.type === 'chapter') {
            srpskiTip = 'POGLAVLJE SA PRIČOM';
            summaryTekst = blok.title || 'Naslov poglavlja nije postavljen';
        } else if (blok.type === 'video') {
            srpskiTip = 'VIDEO SNIMAK';
            summaryTekst = blok._realVideoName || (blok.url && !blok.url.startsWith('blob:') ? blok.url : 'Video fajl');
        } else if (blok.type === 'gate') {
            srpskiTip = 'KAPIJA (ZAGONETKA)';
            summaryTekst = blok.hint || 'Tekst asocijacije / Pomoć za rešavanje';
        } else if (blok.type === 'finale') {
            srpskiTip = 'KRAJ PRIČE (FINALE)';
            summaryTekst = blok.finalLoveMessage || 'Završna ljubavna poruka';
        }

        card.innerHTML = `
        <div class="block-info-side">
            <div class="block-num">KOCKICA #${index + 1}</div>
            <div class="block-meta-details">
                <div class="block-type-tag">${srpskiTip}</div>
                <div class="block-summary-text">${summaryTekst}</div>
                <div class="block-media-indicators">${mediaIndicators || '<span><i class="fa-solid fa-folder-open"></i> Prazna kockica (ubaci sadržaj)</span>'}</div>
            </div>
        </div>
        <div class="block-actions">
            <button class="btn-action btn-edit-zoom" onclick="otvoriZoomEditorZaBlok(${index})"><i class="fa-solid fa-expand"></i> Otvori i Uredi</button>
            <button class="btn-action" onclick="pomeriBlok(${index}, -1)">▲</button>
            <button class="btn-action" onclick="pomeriBlok(${index}, 1)">▼</button>
            <button class="btn-action btn-delete" onclick="obrisiBlok(${index})">X</button>
        </div>
    `;

        container.appendChild(card);
    });

    inicijalizujDragAndDrop();
}

function postaviAktivniBlok(index) {
    aktivniIndex = index;

    document.querySelectorAll('.cms-block-card, #splash-config-card').forEach(c => {
        c.classList.remove('active-block');
    });

    if (index === -1) {
        const coreCard = document.getElementById('splash-config-card');
        if (coreCard) coreCard.classList.add('active-block');
    }
    else if (index !== null && index !== undefined) {
        const aktivnaKartica = document.querySelector(`.cms-block-card[data-index="${index}"]`);
        if (aktivnaKartica) aktivnaKartica.classList.add('active-block');
    }

    osveziZiviPreview();
}

// ==========================================================================
// 4. TIMELINE STATE MODIFICATIONS
// ==========================================================================
function dodajNoviBlok(tip) {
    const noviBlok = { type: tip, sceneEffect: 'none' };
    if (tip === 'chapter') {
        noviBlok.title = 'Novo Poglavlje'; noviBlok.subtitle = ''; noviBlok.paragraphs = [];
        noviBlok.galleryImages = []; noviBlok.nextButtonText = 'Sledeća stranica';
    }
    if (tip === 'video') { noviBlok.url = ''; }
    if (tip === 'gate') { noviBlok.hint = ''; noviBlok.placeholder = ''; noviBlok.buttonText = 'Potvrdi'; noviBlok.errorMessage = ''; noviBlok.answers = []; }

    trenutniConfig.timeline.push(noviBlok);
    renderujTimelineBlokove();
    otvoriZoomEditorZaBlok(trenutniConfig.timeline.length - 1);
}

function obrisiBlok(index) {
    if (confirm("Da li sigurno želiš da obrišeš ovu kockicu iz priče?")) {
        trenutniConfig.timeline.splice(index, 1);
        if (aktivniIndex === index) aktivniIndex = null;
        renderujTimelineBlokove();
    }
}

function pomeriBlok(index, smer) {
    const noviIndex = index + smer; if (noviIndex < 0 || noviIndex >= trenutniConfig.timeline.length) return;
    const privremeni = trenutniConfig.timeline[index]; trenutniConfig.timeline[index] = trenutniConfig.timeline[noviIndex]; trenutniConfig.timeline[noviIndex] = privremeni;
    if (aktivniIndex === index) aktivniIndex = noviIndex;
    renderujTimelineBlokove();
}

// ==========================================================================
// 5. THE ADVANCED ZOOM UI ENGINE
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

    const audioName = blok._realAudioName || (blok.bgMusicUrl && !blok.bgMusicUrl.startsWith('blob:') ? blok.bgMusicUrl : 'Nema dodate muzike');
    let dynamicHtml = '';

    if (blok.type === 'video') {
        const videoName = blok._realVideoName || (blok.url && !blok.url.startsWith('blob:') ? blok.url : 'Nema selektovanog videa');
        dynamicHtml = `
        <div class="form-group">
            <label for="zoom-drop-zone-trigger">Video fajl (Prevuci .mp4 direktno u kućicu ili klikni):</label>
            <div id="zoom-drop-zone-trigger" class="zoom-drop-zone" onclick="okiniLokalniKlikFajla()">
                <i class="fa-solid fa-circle-play" style="font-size:35px; color:var(--admin-accent); margin-bottom:8px;"></i>
                <p id="zoom-video-display-name" style="font-weight:600;">${videoName}</p>
                <span class="hint-text">Spusti fajl ovde</span>
            </div>
        </div>
        <div class="form-group" style="margin-top:15px;">
            <label for="zoom-field-sceneEffect"><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> Ambijentalni efekat preko videa:</label>
            <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()">
                <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Čist mrak / Bez efekta (Preporučeno za video)</option>
                <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals (Latice ruža)</option>
                <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Confetti (Konfete)</option>
                <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust / Zlatne čestice</option>
            </select>
        </div>
    `;
    }
    else if (blok.type === 'chapter') {
        let slikeHtml = '';
        if (blok.galleryImages && blok.galleryImages.length > 0) {
            blok.galleryImages.forEach((imgSrc, imgIndex) => {
                slikeHtml += `
                <div class="zoom-thumb" 
                     draggable="true" 
                     data-img-index="${imgIndex}"
                     style="position: relative; cursor: move;"
                     ondragstart="hendlujDragStart(event)"
                     ondragover="hendlujDragOver(event)"
                     ondrop="hendlujDrop(event, ${index})">
                    <img src="${imgSrc.startsWith('blob:') || imgSrc.startsWith('http') ? imgSrc : '/' + imgSrc}" alt="Galerija slika ${imgIndex}">
                    <button onclick="ukloniSlikuIzGalerijeZoom(${imgIndex})">X</button>
                </div>
            `;
            });
        }

        dynamicHtml = `
        <div class="grid-2">
            <div class="form-group">
                <label for="zoom-field-title">Naslov Poglavlja:</label>
                <input type="text" id="zoom-field-title" value="${blok.title || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-subtitle">Podnaslov / Kratka lepa poruka:</label>
                <input type="text" id="zoom-field-subtitle" value="${blok.subtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="form-group">
            <label for="zoom-field-paragraphs">Glavni tekst priče poglavlja (Double Enter pravi novi pasus):</label>
            <textarea id="zoom-field-paragraphs" style="min-height:220px; font-size:0.95rem; line-height:1.5;" oninput="sinhronizujZoomSaPreviewom()">${blok.paragraphs ? blok.paragraphs.join('\n\n') : ''}</textarea>
        </div>
        <div class="grid-2" style="align-items: center; margin-top:10px;">
            <div class="form-group">
                <label for="zoom-field-nextButtonText">Tekst na dugmetu za nastavak:</label>
                <input type="text" id="zoom-field-nextButtonText" value="${blok.nextButtonText || 'Sledeća stranica'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-sceneEffect"><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> Vizuelni efekat za ovo poglavlje:</label>
                <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()">
                    <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Čist mrak / Bez efekta</option>
                    <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals (Latice ruža)</option>
                    <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Confetti (Konfete)</option>
                    <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust / Zlatne čestice</option>
                </select>
            </div>
        </div>
        <div class="form-group" style="margin-top:15px;">
            <label for="zoom-gallery-container-trigger">Galerija slika (Spusti fotografije direktno u kućicu ispod):</label>
            <div id="zoom-gallery-container-trigger" class="zoom-drop-zone" onclick="okiniLokalniKlikFajla()">
                <i class="fa-solid fa-images" style="font-size:30px; color:var(--admin-accent); margin-bottom:5px;"></i>
                <p style="font-size:0.85rem; font-weight:600;">Klikni ili prevuci slike ovde za mini-galeriju</p>
            </div>
            <div class="zoom-media-grid" id="zoom-gallery-container">${slikeHtml}</div>
        </div>
    `;
    }
    else if (blok.type === 'gate') {
        dynamicHtml = `
        <div class="grid-2">
            <div class="form-group">
                <label for="zoom-field-hint">Tekst Zagonetke / Asocijacija (Glavno pitanje):</label>
                <input type="text" id="zoom-field-hint" value="${blok.hint || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-placeholder">Tekst unutar polja za kucanje (Smernica korisniku):</label>
                <input type="text" id="zoom-field-placeholder" value="${blok.placeholder || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label for="zoom-field-answers">Sve tačne lozinke (odvojene zarezom):</label>
                <input type="text" id="zoom-field-answers" value="${blok.answers ? blok.answers.join(', ') : ''}" placeholder="npr. ljubav, sreća, ljupkost">
            </div>
            <div class="form-group">
                <label for="zoom-field-errorMessage">Poruka koja izlazi ako pogreše lozinku:</label>
                <input type="text" id="zoom-field-errorMessage" value="${blok.errorMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="grid-2" style="align-items: center; margin-top:10px;">
            <div class="form-group">
                <label for="zoom-field-buttonText">Tekst na dugmetu za proveru:</label>
                <input type="text" id="zoom-field-buttonText" value="${blok.buttonText || 'Potvrdi'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-sceneEffect"><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> Vizuelni efekat dok rešavaju kapiju:</label>
                <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()">
                    <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Čist mrak / Bez efekta</option>
                    <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals (Latice ruža)</option>
                    <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Confetti (Konfete)</option>
                    <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust / Zlatne čestice</option>
                </select>
            </div>
        </div>
    `;
    }
    else if (blok.type === 'finale') {
        const iconName = blok._realIconName || (blok.endIconType && !blok.endIconType.startsWith('blob:') ? blok.endIconType : 'Slikica nije izabrana (podrazumevana je ruža)');
        dynamicHtml = `
        <div class="grid-2">
            <div class="form-group">
                <label for="zoom-field-finalLoveMessage">Završna ljubavna poruka (Glavni natpis):</label>
                <input type="text" id="zoom-field-finalLoveMessage" value="${blok.finalLoveMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-finalSignature">Završni potpis na samom kraju:</label>
                <input type="text" id="zoom-field-finalSignature" value="${blok.finalSignature || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label for="final-icon-drop-zone">Ikona na dugmetu (Spusti sliku/ikonu direktno u kućicu):</label>
                <div id="final-icon-drop-zone" class="zoom-drop-zone" onclick="okiniLokalniKlikFajla()">
                    <i class="fa-solid fa-heart-pulse" style="font-size:30px; color:var(--admin-accent); margin-bottom:5px;"></i>
                    <p style="font-size:0.85rem; font-weight:600;" id="final-icon-status">${iconName}</p>
                    <span class="hint-text">Spusti fajl ovde ili klikni</span>
                </div>
                <input type="hidden" id="zoom-field-endIconType" value="${blok.endIconType || 'images/rose.png'}">
            </div>
            <div class="form-group">
                <label for="zoom-field-endIconLabel">Tekst na finalnom dugmetu (Labela):</label>
                <input type="text" id="zoom-field-endIconLabel" value="${blok.endIconLabel || 'Restartuj ekspediciju'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        </div>
        <div class="grid-2" style="align-items: center; margin-top:10px;">
            <div class="form-group">
                <label for="zoom-field-epilogueFinalLabel">Sitno tekstualno pitanje na dnu:</label>
                <input type="text" id="zoom-field-epilogueFinalLabel" value="${blok.epilogueFinalLabel || ''}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group">
                <label for="zoom-field-sceneEffect"><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> Vizuelni efekat za finale ekrana:</label>
                <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()">
                    <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Čist mrak / Bez efekta</option>
                    <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals (Latice ruža)</option>
                    <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Confetti (Konfete)</option>
                    <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust / Zlatne čestice</option>
                </select>
            </div>
        </div>
        <div class="form-group" style="margin-top:10px;">
            <label for="zoom-field-epilogueQuote">Završni mudri citat:</label>
            <textarea id="zoom-field-epilogueQuote" style="min-height:100px;" oninput="sinhronizujZoomSaPreviewom()">${blok.epilogueQuote || ''}</textarea>
        </div>
    `;
    }

    telo.innerHTML = `
    ${dynamicHtml}
    <div class="form-group" style="margin-top:15px;">
        <label for="zoom-audio-drop-trigger">Pozadinska muzika ove kockice (Spusti .mp3 u polje ispod):</label>
        <div id="zoom-audio-drop-trigger" class="zoom-drop-zone" style="padding:15px;" onclick="okiniLokalniKlikFajla()">
            <i class="fa-solid fa-music" style="color:var(--admin-accent); margin-right:5px;"></i>
            <span id="zoom-audio-display-name" style="font-weight:600; font-size:0.85rem;">Trenutna traka: ${audioName}</span>
            <span class="hint-text"> (Klikni ili spusti .mp3 ovde za izmenu)</span>
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
            <label for="zoom-core-projectName">Glavni Naslov Projekta (Velika slova na sredini)</label>
            <input type="text" id="zoom-core-projectName" value="${settings.projectName || ''}" oninput="sinhronizujZoomSaPreviewom()">
        </div>
        <div class="form-group">
            <label for="zoom-core-projectSubtitle">Podnaslov / Kratka lepa poruka ispod naslova</label>
            <input type="text" id="zoom-core-projectSubtitle" value="${settings.projectSubtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
        </div>
    </div>
    <div class="form-group">
        <label for="zoom-core-warningTexts">Uvodna Pravila igre / Smernice za ponašanje (Napiši jedno pravilo po redu)</label>
        <textarea id="zoom-core-warningTexts" style="min-height:180px;" oninput="sinhronizujZoomSaPreviewom()">${loader.warningTexts ? loader.warningTexts.join('\n') : ''}</textarea>
    </div>
    <div class="grid-2">
        <div class="form-group">
            <label for="zoom-core-warningTitle">Mali gornji naslov iznad pravila (npr. VAŽNA NAPOMENA:)</label>
            <input type="text" id="zoom-core-warningTitle" value="${loader.warningTitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
        </div>
        <div class="form-group toggle-group" style="margin-top:20px;">
            <input type="checkbox" id="zoom-core-hasWarningMessage" ${trenutniConfig.config.hasWarningMessage ? 'checked' : ''} onchange="sinhronizujZoomSaPreviewom()">
            <label for="zoom-core-hasWarningMessage" style="cursor:pointer; font-size:0.85rem;">Prikaži ekran sa pravilima pre nego što aplikacija počne</label>
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

// ==========================================================================
// 6. ZOOM IN SAVE & CONFIRM LOGIC
// ==========================================================================
function potvrdiIZatvoriZoom() {
    try {
        if (isEditingCore) {
            if (document.getElementById('zoom-core-projectName')) {
                trenutniConfig.config.globalSettings.projectName = document.getElementById('zoom-core-projectName').value;
            }
            if (document.getElementById('zoom-core-projectSubtitle')) {
                trenutniConfig.config.globalSettings.projectSubtitle = document.getElementById('zoom-core-projectSubtitle').value;
            }
            if (document.getElementById('zoom-core-warningTitle')) {
                trenutniConfig.loader.warningTitle = document.getElementById('zoom-core-warningTitle').value;
            }
            if (document.getElementById('zoom-core-hasWarningMessage')) {
                trenutniConfig.config.hasWarningMessage = document.getElementById('zoom-core-hasWarningMessage').checked;
            }

            if (document.getElementById('zoom-core-warningTexts')) {
                const rawTexts = document.getElementById('zoom-core-warningTexts').value;
                trenutniConfig.loader.warningTexts = rawTexts.split('\n').filter(r => r.trim() !== '');
            }

            if (trenutniConfig.loader) {
                trenutniConfig.loader.warningFinalLine = "";
            }

            osveziCoreSummaryTekst();
        }
        else if (aktivniIndex !== null && aktivniIndex !== -1) {
            const blok = trenutniConfig.timeline[aktivniIndex];

            if (document.getElementById('zoom-field-sceneEffect')) {
                blok.sceneEffect = document.getElementById('zoom-field-sceneEffect').value;
            }

            if (blok.type === 'chapter') {
                if (document.getElementById('zoom-field-title')) blok.title = document.getElementById('zoom-field-title').value;
                if (document.getElementById('zoom-field-subtitle')) blok.subtitle = document.getElementById('zoom-field-subtitle').value;
                if (document.getElementById('zoom-field-nextButtonText')) blok.nextButtonText = document.getElementById('zoom-field-nextButtonText').value;

                if (document.getElementById('zoom-field-paragraphs')) {
                    const rawBody = document.getElementById('zoom-field-paragraphs').value;
                    blok.paragraphs = rawBody.split('\n\n').filter(p => p.trim() !== '');
                }
            }
            else if (blok.type === 'gate') {
                if (document.getElementById('zoom-field-hint')) blok.hint = document.getElementById('zoom-field-hint').value;
                if (document.getElementById('zoom-field-placeholder')) blok.placeholder = document.getElementById('zoom-field-placeholder').value;
                if (document.getElementById('zoom-field-errorMessage')) blok.errorMessage = document.getElementById('zoom-field-errorMessage').value;
                if (document.getElementById('zoom-field-buttonText')) blok.buttonText = document.getElementById('zoom-field-buttonText').value;

                if (document.getElementById('zoom-field-answers')) {
                    const rawAns = document.getElementById('zoom-field-answers').value;
                    blok.answers = rawAns.split(',').map(a => a.trim()).filter(a => a !== '');
                }
            }
            else if (blok.type === 'finale') {
                if (document.getElementById('zoom-field-finalLoveMessage')) blok.finalLoveMessage = document.getElementById('zoom-field-finalLoveMessage').value;
                if (document.getElementById('zoom-field-finalSignature')) blok.finalSignature = document.getElementById('zoom-field-finalSignature').value;
                if (document.getElementById('zoom-field-epilogueQuote')) blok.epilogueQuote = document.getElementById('zoom-field-epilogueQuote').value;
                if (document.getElementById('zoom-field-epilogueFinalLabel')) blok.epilogueFinalLabel = document.getElementById('zoom-field-epilogueFinalLabel').value;
                if (document.getElementById('zoom-field-endIconType')) blok.endIconType = document.getElementById('zoom-field-endIconType').value;
                if (document.getElementById('zoom-field-endIconLabel')) blok.endIconLabel = document.getElementById('zoom-field-endIconLabel').value;
            }
        }
    } catch (err) {
        console.error("Greška pri sinhronizaciji polja unutar Zoom-a:", err);
    }

    renderujTimelineBlokove();
    zatvoriZoomEditor();
}

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

        const tempPutanja = trenutniConfig.config.globalSettings?._tempBgPreview;
        const inputPozadina = document.getElementById('input-slika-pozadina');
        let slikaZaPrikaz = tempPutanja || (inputPozadina ? inputPozadina.value : '');

        if (slikaZaPrikaz && !slikaZaPrikaz.startsWith('blob:') && !slikaZaPrikaz.startsWith('http')) {
            slikaZaPrikaz = '/' + slikaZaPrikaz;
        }

        if (slikaZaPrikaz) {
            simulator.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${slikaZaPrikaz}')`;
            simulator.style.backgroundSize = 'cover';
            simulator.style.backgroundPosition = 'center';
        } else {
            simulator.style.backgroundImage = 'none';
        }

        const stilKontejnera = `background: ${bojaKontejnera}; padding: 20px; border-radius: 14px; text-align: left; border: 1px solid rgba(255,255,255,0.04); box-shadow: 0 10px 25px rgba(0,0,0,0.35); width: 100%;`;

        if (aktivniIndex === null || aktivniIndex === undefined || aktivniIndex === -1) {
            if (statusTag) statusTag.innerText = "Prikaz: Uvodni ekran";
            const pName = document.getElementById('zoom-core-projectName')?.value || trenutniConfig.config.globalSettings.projectName || 'Selection';
            const pSub = document.getElementById('zoom-core-projectSubtitle')?.value || trenutniConfig.config.globalSettings.projectSubtitle || '';

            const inputLoaderMusic = document.getElementById('input-loader-muzika')?.value || trenutniConfig.config.globalSettings.loaderMusic || '';
            let audioPreviewHtml = '';
            if (inputLoaderMusic) {
                audioPreviewHtml = `<div style="margin-top: 15px; font-size: 11px; opacity: 0.5; font-family: '${fontP}', sans-serif; color: ${bojaP};"><i class="fa-solid fa-music"></i> Ambijent: ${inputLoaderMusic.split('/').pop()}</div>`;
            }

            target.innerHTML = `
            <div style="width: 100%; padding: 10px; text-align:center;">
                <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 2rem; text-transform: uppercase; letter-spacing:3px; margin-bottom:10px;">${pName}</h1>
                <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1.1rem; margin-bottom:25px;">${pSub}</h2>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 10px;">
                    <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.75rem; opacity: 0.6; line-height:1.4;">[ Uvodna poruka i smernice za igru... ]</p>
                </div>
                ${audioPreviewHtml}
            </div>
        `;
        } else {
            const blok = trenutniConfig.timeline[aktivniIndex];
            if (statusTag) statusTag.innerText = `Prikaz: Kockica #${aktivniIndex + 1} (${blok.type.toUpperCase()})`;

            let kockicaAudioHtml = '';
            if (blok.bgMusicUrl) {
                kockicaAudioHtml = `<span style="font-family: '${fontP}', sans-serif; font-size: 10px; color: ${bojaH1}; display:block; margin-top:10px; opacity:0.5;"><i class="fa-solid fa-music"></i> Audio traka: ${blok._realAudioName || blok.bgMusicUrl.split('/').pop()}</span>`;
            }

            if (blok.type === 'video') {
                let vSource = blok.url || '';
                const vName = blok._realVideoName || (vSource ? vSource.split('/').pop() : 'Nema video fajla');

                if (vSource && !vSource.startsWith('blob:') && !vSource.startsWith('http')) {
                    vSource = '/' + vSource;
                }

                let videoRenderHtml = `
                    <div style="background: #000; width: 100%; aspect-ratio: 16/9; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid rgba(255,255,255,0.05); overflow:hidden;">
                        <i class="fa-solid fa-circle-play" style="font-size: 32px; color: ${bojaH1}; margin-bottom: 6px;"></i>
                        <span style="font-family: '${fontP}', sans-serif; color: #fff; font-size: 0.75rem; max-width:85%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${vName}</span>
                    </div>`;

                if (vSource) {
                    videoRenderHtml = `
                        <video controls style="width:100%; aspect-ratio:16/9; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:#000;">
                            <source src="${vSource}">
                        </video>`;
                }

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        ${videoRenderHtml}
                        <span style="font-family: '${fontP}', sans-serif; font-size: 10px; color: var(--admin-muted); display:block; margin-top:8px; opacity:0.6;">[ Automatska video projekcija ]</span>
                        ${kockicaAudioHtml}
                    </div>
                `;
            }
            else if (blok.type === 'chapter') {
                const t = document.getElementById('zoom-field-title')?.value || blok.title || 'Naslov Poglavlja';
                const s = document.getElementById('zoom-field-subtitle')?.value || blok.subtitle || 'Podnaslov / Prevod';

                let pText = 'Tekst priče...';
                if (document.getElementById('zoom-field-paragraphs')) {
                    const rawTexts = document.getElementById('zoom-field-paragraphs').value;
                    if (rawTexts.trim() !== '') pText = rawTexts.split('\n\n')[0];
                } else if (blok.paragraphs && blok.paragraphs.length > 0) {
                    pText = blok.paragraphs[0];
                }

                const btnT = document.getElementById('zoom-field-nextButtonText')?.value || blok.nextButtonText || 'Sledeća stranica';

                let gHtml = '';
                if (blok.galleryImages && blok.galleryImages.length > 0) {
                    gHtml = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px;">`;
                    blok.galleryImages.slice(0, 3).forEach(src => {
                        let prImg = src;
                        if (prImg && !prImg.startsWith('blob:') && !prImg.startsWith('http')) {
                            prImg = '/' + prImg;
                        }
                        gHtml += `<div style="aspect-ratio:1; border-radius:6px; overflow:hidden; background:#000;"><img src="${prImg}" style="width:100%; height:100%; object-fit:cover;" alt="Preview slika"></div>`;
                    });
                    gHtml += `</div>`;
                }

                target.innerHTML = `
                    <div style="${stilKontejnera}">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.3rem; margin-bottom: 2px; line-height:1.3;">${t}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 0.95rem; margin-bottom: 12px; opacity:0.85;">${s}</h2>
                        <p style="font-family: '${fontP}', sans-serif; color: ${bojaP}; font-size: 0.78rem; line-height: 1.5; opacity:0.9;">${pText}</p>
                        ${gHtml}
                        <button style="background: none; border: 1px solid ${bojaH1}; color: ${bojaH1}; font-family: '${fontP}', sans-serif; padding: 6px 12px; font-size: 0.7rem; border-radius: 6px; margin-top: 15px; font-weight:600;">${btnT} →</button>
                        ${kockicaAudioHtml}
                    </div>
                `;
            }
            else if (blok.type === 'gate') {
                const hint = document.getElementById('zoom-field-hint')?.value || blok.hint || 'Unesite lozinku za nastavak';
                const placeholder = document.getElementById('zoom-field-placeholder')?.value || blok.placeholder || 'Tvoja reč...';
                const btnText = document.getElementById('zoom-field-buttonText')?.value || blok.buttonText || 'Potvrdi';

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center;">
                        <i class="fa-solid fa-key" style="font-size: 20px; color: ${bojaH1}; margin-bottom: 10px; display: block;"></i>
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.15rem; margin-bottom: 15px; line-height: 1.4;">${hint}</h1>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-width: 200px; margin: 0 auto; width:100%;">
                            <input type="text" placeholder="${placeholder}" disabled style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.3); text-align: center; color: #fff; font-size: 0.75rem; font-family: '${fontP}', sans-serif;">
                            <button style="background: ${bojaH1}; color: ${bojaPozadine}; border: none; padding: 9px; border-radius: 6px; font-family: '${fontP}', sans-serif; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing:0.5px;">${btnText}</button>
                        </div>
                        ${kockicaAudioHtml}
                    </div>
                `;
            }
            else if (blok.type === 'finale') {
                const msg = document.getElementById('zoom-field-finalLoveMessage')?.value || blok.finalLoveMessage || 'Kraj';
                const sig = document.getElementById('zoom-field-finalSignature')?.value || blok.finalSignature || 'Selection';

                target.innerHTML = `
                    <div style="${stilKontejnera} text-align: center; padding: 30px 20px;">
                        <h1 style="font-family: '${fontH1}', serif; color: ${bojaH1}; font-size: 1.5rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${msg}</h1>
                        <h2 style="font-family: '${fontH2}', serif; color: ${bojaH2}; font-style: italic; font-size: 1.1rem; opacity: 0.9;">${sig}</h2>
                        <div style="margin-top: 20px; font-size: 10px; color: ${bojaH1}; opacity: 0.3; letter-spacing: 3px;">✦ ✦ ✦</div>
                        ${kockicaAudioHtml}
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Greška unutar live preview engine-a:", err);
    }
}

async function sacuvajSveNaServer() {
    if (!confirm("⚠️ PAŽNJA: Da li želiš da objaviš izmene na JAVNI sajt?")) {
        return;
    }
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
                mainBackgroundImage: document.getElementById('input-slika-pozadina').value,
                fontHeader: document.getElementById('font-h1').value,
                fontQuote: document.getElementById('font-h2').value,
                fontBody: document.getElementById('font-p').value,
                loaderMusic: document.getElementById('input-loader-muzika').value,
                screensaverMusic: document.getElementById('input-ss-muzika').value,
                screensaverTimeout: parseInt(document.getElementById('input-ss-tajmer').value) || 60,
                projectName: trenutniConfig.config?.globalSettings?.projectName || "Selection",
                projectSubtitle: trenches = trenutniConfig.config?.globalSettings?.projectSubtitle || ""
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

    const jsonString = JSON.stringify(cistConfigZaExport, null, 2);

    const formData = new FormData();
    formData.append('config_data', jsonString);

    const aktivniSubdomenZaSnimanje = localStorage.getItem('userSubdomain') || 'canvas';
    formData.append('subdomain', aktivniSubdomenZaSnimanje);

    if (fajloviZaUpload && fajloviZaUpload.length > 0) {
        fajloviZaUpload.forEach((item, index) => {
            formData.append(`file_${index}`, item.rawFile, item.putanja);
        });
    }

    try {
        console.log("🚀 Šaljem konfiguraciju i medije na server...");

        const response = await fetch('https://shell.selection.rs/save_data', {
            method: 'POST',
            credentials: "include",
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (response.ok) {
            trenutniConfig = cistConfigZaExport;
            if (typeof fajloviZaUpload !== 'undefined') fajloviZaUpload = [];
            alert("✅ USPEŠNO: Izmene i mediji su sačuvani na Cloudflare serveru!");
            location.reload();
        } else {
            const errData = await response.json().catch(() => ({}));
            alert("❌ Greška: Server nije sačuvao podatke. " + (errData.error || ""));
        }
    } catch (error) {
        console.error("❌ Greška u komunikaciji:", error);
        alert("❌ Greška u komunikaciji sa Cloudflare serverom.");
    }
}

function sinhronizujZoomSaPreviewom() {
    osveziZiviPreview();
}

function okiniGlobalniKlikFajla(tipMetmete) {
    const input = document.createElement('input');
    input.type = 'file';
    if (tipMetmete === 'slika') input.accept = 'image/*';
    else input.accept = 'audio/*';

    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            const fajl = e.target.files[0];
            const imeFajla = fajl.name;

            if (tipMetmete === 'slika') {
                const previewUrl = URL.createObjectURL(fajl);
                document.getElementById('input-slika-pozadina').value = 'images/' + imeFajla;
                document.getElementById('label-global-pozadina').innerText = 'images/' + imeFajla;

                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });

                if (trenutniConfig && trenutniConfig.config.globalSettings) {
                    trenutniConfig.config.globalSettings._tempBgPreview = previewUrl;
                }
            } else if (tipMetmete === 'loader-mp3') {
                document.getElementById('input-loader-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-loader-muzika').innerText = 'audio/' + imeFajla;

                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            } else if (tipMetmete === 'ss-mp3') {
                document.getElementById('input-ss-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-ss-muzika').innerText = 'audio/' + imeFajla;

                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            }
            osveziZiviPreview();
        }
    };
    input.click();
}

function promeniRezimSimulatora(rezim) {
    const panel = document.getElementById('global-preview-panel');
    const ekran = document.getElementById('live-simulator-screen');
    const btnMobile = document.getElementById('btn-mode-mobile');
    const btnPc = document.getElementById('btn-mode-pc');
    const srednjiPanel = document.querySelector('.main-workspace');

    if (!panel || !ekran || !btnMobile || !btnPc) return;

    if (rezim === 'pc') {
        if (srednjiPanel) {
            srednjiPanel.style.flex = "none";
            srednjiPanel.style.width = "45%";
        }
        panel.style.flex = "none";
        panel.style.width = "55%";
        panel.style.maxWidth = "none";

        ekran.style.borderRadius = "8px";
        ekran.style.border = "1px solid var(--admin-border)";
        ekran.style.width = "100%";
        ekran.style.maxWidth = "850px";

        btnPc.style.backgroundColor = "var(--admin-accent)";
        btnPc.style.color = "var(--admin-sidebar)";
        btnMobile.style.backgroundColor = "transparent";
        btnMobile.style.color = "var(--admin-muted)";
    } else {
        if (srednjiPanel) {
            srednjiPanel.style.flex = "1";
            srednjiPanel.style.width = "auto";
        }

        panel.style.flex = "0.75";
        panel.style.width = "auto";
        panel.style.maxWidth = "360px";

        ekran.style.borderRadius = "24px";
        ekran.style.border = "4px solid #1c2a39";
        ekran.style.width = "100%";
        ekran.style.maxWidth = "100%";

        btnMobile.style.backgroundColor = "var(--admin-accent)";
        btnMobile.style.color = "var(--admin-sidebar)";
        btnPc.style.backgroundColor = "transparent";
        btnPc.style.color = "var(--admin-muted)";
    }

    if (typeof osveziZiviPreview === "function") {
        osveziZiviPreview();
    }
}

let izvornaSvezaSlikaIndex = null;

function hendlujDragStart(e) {
    izvornaSvezaSlikaIndex = e.currentTarget.getAttribute('data-img-index');
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
}

function hendlujDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function hendlujDrop(e, blokIndex) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const ciljniIndex = e.currentTarget.getAttribute('data-img-index');

    if (izvornaSvezaSlikaIndex === ciljniIndex || izvornaSvezaSlikaIndex === null) {
        return;
    }

    const blok = trenutniConfig.timeline[blokIndex];

    const pomerenaSlika = blok.galleryImages.splice(izvornaSvezaSlikaIndex, 1)[0];
    blok.galleryImages.splice(ciljniIndex, 0, pomerenaSlika);

    if (blok._realGalleryNames && blok._realGalleryNames.length > 0) {
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

    // Provera da li galerija uopšte postoji
    if (blok.galleryImages && blok.galleryImages.length > 0) {
        blok.galleryImages.forEach((imgSrc, imgIndex) => {
            let putanjaZaEkran = imgSrc;
            // Popravka putanje ako nije apsolutni URL ili Blob
            if (putanjaZaEkran && !putanjaZaEkran.startsWith('blob:') && !putanjaZaEkran.startsWith('http') && !putanjaZaEkran.startsWith('/')) {
                putanjaZaEkran = '/' + putanjaZaEkran;
            }

            slikeHtml += `
            <div class="zoom-thumb" 
                 draggable="true" 
                 data-img-index="${imgIndex}"
                 ondragstart="hendlujDragStart(event)"
                 ondragover="hendlujDragOver(event)"
                 ondrop="hendlujDrop(event, ${blokIndex})">
                <img src="${putanjaZaEkran}" alt="Sličica ${imgIndex}" loading="lazy">
                <button type="button" 
                        onclick="event.stopPropagation(); ukloniSlikuIzGalerijeZoom(${imgIndex})" 
                        title="Ukloni sliku">×</button>
            </div>
            `;
        });
    } else {
        slikeHtml = `<p style="font-size: 0.75rem; color: var(--admin-muted); padding: 10px;">Galerija je prazna. Prevucite slike ovde.</p>`;
    }

    kontejner.innerHTML = slikeHtml;
}

async function masterKreirajNovogKorisnika() {
    const subInput = document.getElementById('master-novi-subdomain');
    const emailInput = document.getElementById('master-novi-email');
    const statusPoruka = document.getElementById('master-status-poruka');

    if (!subInput || !emailInput || !statusPoruka) return;

    const subdomain = subInput.value.trim().toLowerCase();
    const email = emailInput.value.trim();

    if (!subdomain || !email) {
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Greška: Morate uneti i poddomen i email klijenta!";
        return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Greška: Poddomen sme da sadrži samo mala slova, brojeve i crticu (-).";
        return;
    }

    if (!confirm(`Da li sigurno želiš da lansiraš novi prostor '${subdomain}.selection.rs' za klijenta ${email}?`)) {
        return;
    }

    statusPoruka.style.color = "#d4b483";
    statusPoruka.innerText = "⚡ Pokrećem sisteme... Molimo sačekajte...";

    const noviCistSvemir = {
        config: {
            globalSettings: {
                primaryColor: "#d4b483",
                secondaryColor: "#d4b483",
                textColor: "#eeeeee",
                metaColor: "#a0acb8",
                backgroundColor: "#0f171e",
                mainBackgroundImage: "",
                containerBg: "#1c2a39",
                fontHeader: "Cinzel",
                fontQuote: "Cormorant Garamond",
                fontBody: "Montserrat",
                projectName: subdomain.toUpperCase(),
                projectSubtitle: "Dobrodošli u Vaš novi Selection prostor",
                loaderMusic: "",
                screensaverMusic: "",
                screensaverTimeout: 60
            },
            hasWarningMessage: true
        },
        loader: {
            warningTitle: "⚠️ UPOZORENJE ⚠️",
            warningFinalLine: "",
            warningTexts: ["Pravila korišćenja aplikacije.", "Uživajte u ekspediciji."]
        },
        timeline: []
    };

    const formData = new FormData();
    formData.append('subdomain', subdomain);
    formData.append('client_email', email);
    formData.append('config_data', JSON.stringify(noviCistSvemir, null, 2));

    try {
        console.log(`🚀 Lansiram novi prostor [${subdomain}] preko Cloudflare Shell-a...`);

        const response = await fetch('https://shell.selection.rs/save_data', {
            method: 'POST',
            credentials: "include",
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        const rez = await response.json().catch(() => ({}));

        if (response.ok && rez.success) {
            statusPoruka.style.color = "#2ecc71";
            statusPoruka.innerHTML = `🎉 USPEH: Prostor <strong>${subdomain}</strong> je uspešno kreiran u bazi!<br>
            🔗 Link za klijenta: <a href="https://${subdomain}.selection.rs" target="_blank" style="color:#2ecc71; text-decoration:underline;">${subdomain}.selection.rs</a>`;

            subInput.value = '';
            emailInput.value = '';
        } else {
            statusPoruka.style.color = "#b81d24";
            statusPoruka.innerText = `❌ Greška servera: ${rez.error || "Neznan neuspeh."}`;
        }
    } catch (error) {
        console.error("Master Error:", error);
        statusPoruka.style.color = "#b81d24";
        statusPoruka.innerText = "❌ Greška: Neuspešna komunikacija sa Cloudflare Shell-om.";
    }
}
// ==========================================================================
// 8. GLOBAL DRAG & DROP HANDLERS (Popunjena verzija)
// ==========================================================================
function inicijalizujDragAndDrop() {
    // Čistimo stare listenere da ne bi duplirali akcije
    window.removeEventListener('dragover', globalDragOver);
    window.removeEventListener('drop', globalDrop);

    window.addEventListener('dragover', globalDragOver);
    window.addEventListener('drop', globalDrop);
}

function globalDragOver(e) { e.preventDefault(); }

function globalDrop(e) {
    e.preventDefault();

    const dropPozadina = e.target.closest('#drop-global-pozadina');
    const dropLoaderMuzika = e.target.closest('#drop-global-loader-muzika');
    const dropSsMuzika = e.target.closest('#drop-global-ss-muzika');
    const dropFinaleIkona = e.target.closest('#final-icon-drop-zone');

    if (e.dataTransfer.files.length > 0) {
        const fajl = e.dataTransfer.files[0];
        const imeFajla = fajl.name;

        // 1. Finale ikona
        if (dropFinaleIkona) {
            const ekstenzija = imeFajla.split('.').pop().toLowerCase();
            if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ekstenzija)) {
                document.getElementById('zoom-field-endIconType').value = 'images/' + imeFajla;
                trenutniConfig.timeline[aktivniIndex]._realIconName = imeFajla;
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                document.getElementById('final-icon-status').innerText = `Učitano: ${imeFajla}`;
                osveziZiviPreview();
            } else {
                alert("Molimo te spusti validan slikovni fajl.");
            }
            return;
        }

        // 2. Pozadinska slika
        if (dropPozadina) {
            const previewUrl = URL.createObjectURL(fajl);
            document.getElementById('input-slika-pozadina').value = 'images/' + imeFajla;
            document.getElementById('label-global-pozadina').innerText = 'images/' + imeFajla;
            fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
            trenutniConfig.config.globalSettings._tempBgPreview = previewUrl;
            osveziZiviPreview();
            return;
        }

        // 3. Loader muzika
        if (dropLoaderMuzika) {
            document.getElementById('input-loader-muzika').value = 'audio/' + imeFajla;
            document.getElementById('label-global-loader-muzika').innerText = 'audio/' + imeFajla;
            fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            osveziZiviPreview();
            return;
        }

        // 4. Screensaver muzika
        if (dropSsMuzika) {
            document.getElementById('input-ss-muzika').value = 'audio/' + imeFajla;
            document.getElementById('label-global-ss-muzika').innerText = 'audio/' + imeFajla;
            fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            osveziZiviPreview();
            return;
        }

        // 5. Drag & drop na blokove (ako nije u zoom editoru)
        const card = e.target.closest('.cms-block-card');
        if (card && !isEditingCore) {
            const idx = parseInt(card.getAttribute('data-index'));
            procitajFajlIUbaciUConfig(fajl, idx);
            renderujTimelineBlokove();
        }
        // 6. Drag & drop unutar zoom editora
        else if (document.getElementById('zoom-editor-overlay').style.display === 'flex' && aktivniIndex !== null) {
            procitajFajlIUbaciUConfig(fajl, aktivniIndex);
            if (aktivniIndex !== -1) osveziZoomGalerijuEkran(aktivniIndex);
        }
    }
}