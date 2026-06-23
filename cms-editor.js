// cms-editor.js — Workspace & Narrative Matrix Builder
import { osveziZiviPreview } from './simulator.js';

const API_BASE = "https://shell.selection.rs";
let trenutniConfig = null;
let fajloviZaUpload = [];
let isEditingCore = false; // 🔒 OSIGURANO: Unutrašnje stanje editora vraćeno na vrh modula!

export function initCmsEditor(configData) {
    trenutniConfig = configData;

    // Globalni drajveri za window nivo (da bi stari onclick u HTML-u radili bez pucanja)
    window.postaviAktivniBlok = postaviAktivniBlok;
    window.dodajNoviBlok = dodajNoviBlok;
    window.obrisiBlok = obrisiBlok;
    window.pomeriBlok = pomeriBlok;
    window.otvoriCoreZoomEditor = otvoriCoreZoomEditor;
    window.otvoriZoomEditorZaBlok = otvoriZoomEditorZaBlok;
    window.zatvoriZoomEditor = zatvoriZoomEditor;
    window.potvrdiIZatvoriZoom = potvrdiIZatvoriZoom;
    window.ukloniSlikuIzGalerijeZoom = ukloniSlikuIzGalerijeZoom;
    window.sacuvajSveNaServer = sacuvajSveNaServer;
    window.okiniLokalniKlikFajla = okiniLokalniKlikFajla;
    window.getAktivniIndex = () => window.aktivniIndex;
    window.okiniPreviewUpdate = () => osveziZiviPreview(trenutniConfig);
    window.sinhronizujZoomSaPreviewom = () => osveziZiviPreview(trenutniConfig);

    renderujTimelineBlokove();
    popuniGlobalneStilove(); // 🎯 OSIGURANO: Automatsko punjenje levog panela stilovima na startu!
    inicijalizujDugmadZaSnimanje();
    inicijalizujDragAndDrop();
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
    if (document.getElementById('label-global-pozadina')) document.getElementById('label-global-pozadina').innerText = settings.mainBackgroundImage || 'Click or drag image here';

    if (document.getElementById('input-loader-muzika')) document.getElementById('input-loader-muzika').value = settings.loaderMusic || '';
    if (document.getElementById('label-global-loader-muzika')) document.getElementById('label-global-loader-muzika').innerText = settings.loaderMusic || 'Click or drag .mp3 file';

    if (document.getElementById('input-ss-muzika')) document.getElementById('input-ss-muzika').value = settings.screensaverMusic || '';
    if (document.getElementById('label-global-ss-muzika')) document.getElementById('label-global-ss-muzika').innerText = settings.screensaverMusic || 'Click or drag .mp3 file';
}

export function renderujTimelineBlokove() {
    const container = document.getElementById('cms-blocks-list');
    if (!container) return; container.innerHTML = '';

    const coreCard = document.createElement('div');
    coreCard.className = 'cms-block-card'; coreCard.id = 'splash-config-card';
    coreCard.onclick = (e) => { if (e.target.closest('.block-actions')) return; postaviAktivniBlok(-1); };
    if (window.aktivniIndex === -1) coreCard.classList.add('active-block');

    coreCard.innerHTML = `
        <div class="block-info-side">
            <div class="block-num"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--admin-accent);"></i></div>
            <div class="block-meta-details">
                <div class="block-type-tag">APPLICATION INTRO STAGE</div>
                <div class="block-summary-text">Intro Screen & Preliminary Parameters</div>
                <div class="block-media-indicators"><span><i class="fa-solid fa-gear"></i> Title, Subtitle, and Rules Matrix</span></div>
            </div>
        </div>
        <div class="block-actions">
            <button class="btn-action btn-edit-zoom" onclick="event.stopPropagation(); otvoriCoreZoomEditor()"><i class="fa-solid fa-expand"></i> Open & Edit Core</button>
        </div>
    `;
    container.appendChild(coreCard);

    const name = trenutniConfig.config?.globalSettings?.projectName || 'Unnamed';
    const sub = trenutniConfig.config?.globalSettings?.projectSubtitle || '';
    const el = document.getElementById('summary-core-title');
    if (el) el.innerHTML = `Active Project: <strong>${name}</strong> — <em>"${sub}"</em>`;

    if (!trenutniConfig.timeline) trenutniConfig.timeline = [];
    trenutniConfig.timeline.forEach((blok, index) => {
        const card = document.createElement('div');
        card.className = 'cms-block-card'; card.setAttribute('data-index', index);
        if (index === window.aktivniIndex) card.classList.add('active-block');
        card.onclick = (e) => { if (e.target.closest('.block-actions')) return; postaviAktivniBlok(index); };

        let mediaIndicators = '';
        if (blok.type === 'video') mediaIndicators += `<span><i class="fa-solid fa-video"></i> ${blok._realVideoName || 'Video payload'}</span>`;
        if (blok.type === 'chapter' && blok.galleryImages) mediaIndicators += `<span><i class="fa-solid fa-images"></i> Contains ${blok.galleryImages.length} images</span>`;
        if (blok.bgMusicUrl) mediaIndicators += `<span><i class="fa-solid fa-music"></i> Audio active</span>`;

        card.innerHTML = `
            <div class="block-info-side">
                <div class="block-num">MATRIX BLOCK #${index + 1}</div>
                <div class="block-meta-details">
                    <div class="block-type-tag">${blok.type.toUpperCase()} NODE</div>
                    <div class="block-summary-text">${blok.title || blok.hint || 'Staged Node'}</div>
                    <div class="block-media-indicators">${mediaIndicators || '<span><i class="fa-solid fa-folder-open"></i> Empty node</span>'}</div>
                </div>
            </div>
            <div class="block-actions">
                <button class="btn-action btn-edit-zoom" onclick="event.stopPropagation(); otvoriZoomEditorZaBlok(${index})"><i class="fa-solid fa-expand"></i> Edit</button>
                <button class="btn-action" onclick="event.stopPropagation(); pomeriBlok(${index}, -1)">▲</button>
                <button class="btn-action" onclick="event.stopPropagation(); pomeriBlok(${index}, 1)">▼</button>
                <button class="btn-action btn-delete" onclick="event.stopPropagation(); obrisiBlok(${index})">X</button>
            </div>
        `;
        container.appendChild(card);
    });
}

export function postaviAktivniBlok(index) {
    window.aktivniIndex = index;
    document.querySelectorAll('.cms-block-card, #splash-config-card').forEach(c => c.classList.remove('active-block'));
    if (index === -1) document.getElementById('splash-config-card')?.classList.add('active-block');
    else {
        const activeCard = document.querySelector(`.cms-block-card[data-index="${index}"]`);
        if (activeCard) activeCard.classList.add('active-block');
    }
    osveziZiviPreview(trenutniConfig);
}

export function dodajNoviBlok(tip) {
    const noviBlok = { type: tip, sceneEffect: 'none' };
    if (tip === 'chapter') { noviBlok.title = 'New narrative layer'; noviBlok.galleryImages = []; }
    else if (tip === 'gate') { noviBlok.hint = 'Enter secret value'; noviBlok.answers = []; }
    trenutniConfig.timeline.push(noviBlok);
    renderujTimelineBlokove();
    otvoriZoomEditorZaBlok(trenutniConfig.timeline.length - 1);
}

export function obrisiBlok(index) {
    if (confirm("Delete node card?")) { trenutniConfig.timeline.splice(index, 1); window.aktivniIndex = null; renderujTimelineBlokove(); osveziZiviPreview(trenutniConfig); }
}

export function pomeriBlok(index, smer) {
    const noviIndex = index + smer; if (noviIndex < 0 || noviIndex >= trenutniConfig.timeline.length) return;
    const privremeni = trenutniConfig.timeline[index]; trenutniConfig.timeline[index] = trenutniConfig.timeline[noviIndex]; trenutniConfig.timeline[noviIndex] = privremeni;
    window.aktivniIndex = noviIndex; renderujTimelineBlokove(); postaviAktivniBlok(noviIndex);
}

export function otvoriZoomEditorZaBlok(index) {
    window.aktivniIndex = index; isEditingCore = false; postaviAktivniBlok(index);
    const blok = trenutniConfig.timeline[index];
    document.getElementById('zoom-module-title').innerText = `EDITING NODE: ${blok.type.toUpperCase()}`;
    document.getElementById('zoom-dynamic-body').innerHTML = `
        <div class="form-group"><label>Title:</label><input type="text" id="zoom-field-title" value="${blok.title || ''}" oninput="sinhronizujZoomSaPreviewom()"></div>
    `;
    document.getElementById('zoom-editor-overlay').style.display = 'flex';
}

export function otvoriCoreZoomEditor() {
    isEditingCore = true; window.aktivniIndex = -1;
    document.getElementById('zoom-module-title').innerText = `EDITING CORE PARAMETERS`;
    document.getElementById('zoom-dynamic-body').innerHTML = `
        <input type="text" id="zoom-core-projectName" value="${trenutniConfig.config?.globalSettings?.projectName || ''}" oninput="sinhronizujZoomSaPreviewom()">
    `;
    document.getElementById('zoom-editor-overlay').style.display = 'flex';
}

export function zatvoriZoomEditor() { document.getElementById('zoom-editor-overlay').style.display = 'none'; isEditingCore = false; renderujTimelineBlokove(); }

export function potvrdiIZatvoriZoom() {
    if (isEditingCore) {
        trenutniConfig.config.globalSettings.projectName = document.getElementById('zoom-core-projectName').value;
    } else if (window.aktivniIndex !== null && window.aktivniIndex !== -1) {
        trenutniConfig.timeline[window.aktivniIndex].title = document.getElementById('zoom-field-title')?.value || '';
    }
    renderujTimelineBlokove(); zatvoriZoomEditor();
}

export function ukloniSlikuIzGalerijeZoom(imgIndex) {
    trenutniConfig.timeline[window.aktivniIndex].galleryImages.splice(imgIndex, 1); renderujTimelineBlokove(); osveziZiviPreview(trenutniConfig);
}

export async function sacuvajSveNaServer(akcija = 'save') {
    if (!confirm("Commit matrix to Edge cloud nodes?")) return;
    const formData = new FormData();
    formData.append('config_data', JSON.stringify(trenutniConfig));
    formData.append('action', akcija);
    formData.append('subdomain', window.currentSubdomain);

    try {
        const token = localStorage.getItem('selection_session_token');
        const response = await fetch(`${API_BASE}/save_data`, {
            method: 'POST',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            body: formData
        });
        if (response.ok) { alert("🎉 Deployment Complete!"); location.reload(); } else { alert("🔒 Validation error."); }
    } catch (e) { alert("❌ Transmission broken."); }
}

export function inicijalizujDugmadZaSnimanje() { /* Konstruktor donjeg panela za save/publish */ }
export function inicijalizujDragAndDrop() { /* Drag drop bus */ }
export function okiniLokalniKlikFajla(tip) { /* File selector driver */ }