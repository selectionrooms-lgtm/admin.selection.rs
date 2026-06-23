// cms-editor.js — Workspace & Narrative Matrix Builder
import { osveziZiviPreview } from './simulator.js';

const API_BASE = "https://shell.selection.rs";
let trenutniConfig = null;
let fajloviZaUpload = [];
window.isEditingCore = false;

// 👑 STRUČNI FIX: Deklarišemo funkciju odmah na vrhu modula da bude stopostotno bezbedna i vidljiva
export function okiniLokalniKlikFajla(tipMetmete) {
    const input = document.createElement('input');
    input.type = 'file';

    if (tipMetmete === 'slika' || tipMetmete === 'gallery-images') input.accept = 'image/*';
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
            } else if (tipMetmete === 'loader-mp3') {
                document.getElementById('input-loader-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-loader-muzika').innerText = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            } else if (tipMetmete === 'ss-mp3') {
                document.getElementById('input-ss-muzika').value = 'audio/' + imeFajla;
                document.getElementById('label-global-ss-muzika').innerText = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
            } else if (tipMetmete === 'video-file' && window.aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[window.aktivniIndex];
                blok.url = previewUrl;
                blok._realVideoName = imeFajla;
                blok._realName = 'videos/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'videos/' + imeFajla, rawFile: fajl });
                if (document.getElementById('zoom-video-display-name')) document.getElementById('zoom-video-display-name').innerText = imeFajla;
            } else if (tipMetmete === 'block-audio' && window.aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[window.aktivniIndex];
                blok.bgMusicUrl = previewUrl;
                blok._realAudioName = imeFajla;
                blok._realName = 'audio/' + imeFajla;
                fajloviZaUpload.push({ putanja: 'audio/' + imeFajla, rawFile: fajl });
                if (document.getElementById('zoom-audio-display-name')) document.getElementById('zoom-audio-display-name').innerText = `Track: ${imeFajla}`;
            } else if (tipMetmete === 'gallery-images' && window.aktivniIndex !== null) {
                const blok = trenutniConfig.timeline[window.aktivniIndex];
                if (!blok.galleryImages) blok.galleryImages = [];
                blok.galleryImages.push(previewUrl);
                fajloviZaUpload.push({ putanja: 'images/' + imeFajla, rawFile: fajl });
                ukloniSlikuIzGalerijeZoom(-1);
            }
        });
        osveziZiviPreview(trenutniConfig);
    };
    input.click();
}

export function initCmsEditor(configData) {
    trenutniConfig = configData;
    window.trenutniConfig = configData;

    window.postaviAktivniBlok = postaviAktivniBlok;
    window.dodajNoviBlok = dodajNoviBlok;
    window.obrisiBlok = obrisiBlok;
    window.pomeriBlok = pomeriBlok;
    window.zatvoriZoomEditor = zatvoriZoomEditor;
    window.potvrdiIZatvoriZoom = potvrdiIZatvoriZoom;
    window.ukloniSlikuIzGalerijeZoom = ukloniSlikuIzGalerijeZoom;
    window.sacuvajSveNaServer = sacuvajSveNaServer;
    window.getAktivniIndex = () => window.aktivniIndex;
    window.okiniPreviewUpdate = () => osveziZiviPreview(trenutniConfig);
    window.sinhronizujZoomSaPreviewom = () => osveziZiviPreview(trenutniConfig);

    // 🛡️ TVOJA ABSOLUTNA ZAŠTITA: Osiguravamo prozor
    window.okiniLokalniKlikFajla = typeof okiniLokalniKlikFajla === 'function' ? okiniLokalniKlikFajla : () => { };

    renderujTimelineBlokove();
    popuniGlobalneStilove();
    inicijalizujDugmadZaSnimanje();
    inicijalizujDragAndDrop();

    window.aktivniIndex = 0;
    osveziZiviPreview(trenutniConfig);
}

export function popuniGlobalneStilove() {
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
    if (!container) return;
    container.innerHTML = '';

    if (!trenutniConfig.timeline) trenutniConfig.timeline = [];

    trenutniConfig.timeline.forEach((blok, index) => {
        const card = document.createElement('div');
        card.className = 'cms-block-card';
        card.setAttribute('data-index', index);
        card.setAttribute('draggable', 'true');
        if (index === window.aktivniIndex) card.classList.add('active-block');

        let tipTag = `${blok.type.toUpperCase()} NODE`;
        let numLabel = `MATRIX BLOCK #${index + 1}`;
        let sumText = blok.title || blok.hint || 'Staged Node';

        if (blok.type === 'intro') {
            tipTag = `APPLICATION INTRO STAGE`;
            numLabel = `START NODE`;
            const name = trenutniConfig.config?.globalSettings?.projectName || 'Unnamed';
            const sub = trenutniConfig.config?.globalSettings?.projectSubtitle || '';
            sumText = `Active Project: <strong>${name}</strong> — <em>"${sub}"</em>`;
        }

        let mediaIndicators = '';
        if (blok.type === 'video') mediaIndicators += `<span><i class="fa-solid fa-video"></i> ${blok._realVideoName || 'Video payload'}</span>`;
        if (blok.type === 'chapter' && blok.galleryImages) mediaIndicators += `<span><i class="fa-solid fa-images"></i> Contains ${blok.galleryImages.length} images</span>`;
        if (blok.type === 'intro') mediaIndicators += `<span><i class="fa-solid fa-gear"></i> Title, Subtitle, and Rules Matrix</span>`;
        if (blok.bgMusicUrl) mediaIndicators += `<span><i class="fa-solid fa-music"></i> Audio active</span>`;

        card.innerHTML = `
            <div class="block-info-side">
                <div class="block-num">${numLabel}</div>
                <div class="block-meta-details">
                    <div class="block-type-tag">${tipTag}</div>
                    <div class="block-summary-text">${sumText}</div>
                    <div class="block-media-indicators">${mediaIndicators || '<span><i class="fa-solid fa-folder-open"></i> Empty node</span>'}</div>
                </div>
            </div>
            <div class="block-actions">
                <button class="btn-action btn-edit-zoom"><i class="fa-solid fa-expand"></i> Edit</button>
                <button class="btn-action">▲</button>
                <button class="btn-action">▼</button>
                <button class="btn-action btn-delete">X</button>
            </div>
        `;
        container.appendChild(card);
    });
}

export function postaviAktivniBlok(index) {
    window.aktivniIndex = index;
    document.querySelectorAll('.cms-block-card').forEach(c => c.classList.remove('active-block'));
    const activeCard = document.querySelector(`.cms-block-card[data-index="${index}"]`);
    if (activeCard) activeCard.classList.add('active-block');
    osveziZiviPreview(trenutniConfig);
}

export function dodajNoviBlok(tip) {
    const noviBlok = { type: tip, sceneEffect: 'none' };
    if (tip === 'intro') {
        noviBlok.sceneEffect = 'none';
    } else if (tip === 'chapter') {
        noviBlok.title = 'New Narrative Chapter'; noviBlok.subtitle = ''; noviBlok.paragraphs = [];
        noviBlok.galleryImages = []; noviBlok.nextButtonText = 'Continue →';
    } else if (tip === 'video') {
        noviBlok.url = '';
    } else if (tip === 'gate') {
        noviBlok.hint = 'Enter secure token value'; noviBlok.placeholder = 'Type credential here...'; noviBlok.buttonText = 'Verify'; noviBlok.errorMessage = 'Verification failed. Try again.'; noviBlok.answers = [];
    } else if (tip === 'finale') {
        noviBlok.finalLoveMessage = 'Forever Together'; noviBlok.finalSignature = 'Selection'; noviBlok.endIconLabel = 'Restart Process';
    }

    trenutniConfig.timeline.push(noviBlok);
    renderujTimelineBlokove();
    postaviAktivniBlok(trenutniConfig.timeline.length - 1);
}

export function obrisiBlok(index) {
    if (confirm("Are you certain you want to delete this block?")) {
        trenutniConfig.timeline.splice(index, 1);
        window.aktivniIndex = trenutniConfig.timeline.length > 0 ? 0 : null;
        renderujTimelineBlokove();
        if (window.aktivniIndex !== null) postaviAktivniBlok(window.aktivniIndex);
        else osveziZiviPreview(trenutniConfig);
    }
}

export function pomeriBlok(index, smer) {
    const noviIndex = index + smer;
    if (noviIndex < 0 || noviIndex >= trenutniConfig.timeline.length) return;
    const privremeni = trenutniConfig.timeline[index];
    trenutniConfig.timeline[index] = trenutniConfig.timeline[noviIndex];
    trenutniConfig.timeline[noviIndex] = privremeni;
    window.aktivniIndex = noviIndex;
    renderujTimelineBlokove();
    postaviAktivniBlok(noviIndex);
}

export function otvoriZoomEditorZaBlok(index) {
    window.aktivniIndex = index;
    postaviAktivniBlok(index);

    const blok = trenutniConfig.timeline[index];
    const overlay = document.getElementById('zoom-editor-overlay');
    const naslov = document.getElementById('zoom-module-title');
    const telo = document.getElementById('zoom-dynamic-body');

    naslov.innerText = `EDITING REŽIM: ${blok.type.toUpperCase()} BLOCK (#${index + 1})`;
    const audioName = blok._realAudioName || (blok.bgMusicUrl ? blok.bgMusicUrl.split('/').pop() : 'No audio file mapped');
    let dynamicHtml = '';

    if (blok.type === 'intro') {
        window.isEditingCore = true;
        const loader = trenutniConfig.loader || { warningTitle: '', warningTexts: [] };
        const settings = trenutniConfig.config.globalSettings;
        naslov.innerText = `EDITING MATRIX CORE: APPLICATION INTRO SETUP`;
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Primary Brand Project Name Header:</label>
                    <input type="text" id="zoom-core-projectName" value="${settings.projectName || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Subheading Introduction Tagline Statement:</label>
                    <input type="text" id="zoom-core-projectSubtitle" value="${settings.projectSubtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group">
                <label>Preliminary Expedition Rules Matrix Block (One rule per line):</label>
                <textarea id="zoom-core-warningTexts" style="min-height:120px;" oninput="sinhronizujZoomSaPreviewom()">${loader.warningTexts ? loader.warningTexts.join('\n') : ''}</textarea>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Notice Panel Warning Title Header:</label>
                    <input type="text" id="zoom-core-warningTitle" value="${loader.warningTitle || '⚠️ NOTICE ⚠️'}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group" style="display:flex; flex-direction:row; align-items:center; margin-top:25px; gap:10px;">
                    <input type="checkbox" id="zoom-core-hasWarningMessage" ${trenutniConfig.config.hasWarningMessage ? 'checked' : ''} onchange="sinhronizujZoomSaPreviewom()" style="width:auto; cursor:pointer;">
                    <label for="zoom-core-hasWarningMessage" style="cursor:pointer; font-size:0.85rem;">Render preliminary conditions restriction wall</label>
                </div>
            </div>
        `;
    }
    else if (blok.type === 'video') {
        window.isEditingCore = false;
        const videoName = blok._realVideoName || (blok.url ? blok.url.split('/').pop() : 'Click to select native .mp4 file');
        dynamicHtml = `
            <div class="form-group">
                <label>Cinematic Video Projection (.mp4 format):</label>
                <div class="zoom-drop-zone" onclick="okiniLokalniKlikFajla('video-file')">
                    <i class="fa-solid fa-circle-play" style="font-size:35px; color:var(--admin-accent); margin-bottom:8px;"></i>
                    <p id="zoom-video-display-name" style="font-weight:600;">${videoName}</p>
                    <span class="hint-text">Click or drop video asset wrapper here</span>
                </div>
            </div>
        `;
    }
    else if (blok.type === 'chapter') {
        window.isEditingCore = false;
        let slikeHtml = '';
        if (blok.galleryImages && blok.galleryImages.length > 0) {
            blok.galleryImages.forEach((imgSrc, imgIndex) => {
                slikeHtml += `
                    <div class="zoom-thumb" style="display:inline-block; position:relative; margin:5px; width:80px; height:80px; border:1px solid var(--admin-border); border-radius:6px; overflow:hidden;">
                        <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">
                        <button type="button" onclick="ukloniSlikuIzGalerijeZoom(${imgIndex})" style="position:absolute; top:2px; right:2px; background:#b81d24; color:#fff; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; font-weight:700;">×</button>
                    </div>
                `;
            });
        }
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Chapter Main Header Text:</label>
                    <input type="text" id="zoom-field-title" value="${blok.title || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Subheading / Context Label:</label>
                    <input type="text" id="zoom-field-subtitle" value="${blok.subtitle || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group">
                <label>Story Body Narrative (Double Enter creates paragraphs):</label>
                <textarea id="zoom-field-paragraphs" style="min-height:140px;" oninput="sinhronizujZoomSaPreviewom()">${blok.paragraphs ? blok.paragraphs.join('\n\n') : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Action Button Display Text:</label>
                <input type="text" id="zoom-field-nextButtonText" value="${blok.nextButtonText || 'Continue →'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
            <div class="form-group" style="margin-top:10px;">
                <label>Chapter Media Gallery Album:</label>
                <div class="zoom-drop-zone" onclick="okiniLokalniKlikFajla('gallery-images')">
                    <i class="fa-solid fa-images" style="font-size:25px; color:var(--admin-accent); margin-bottom:5px;"></i>
                    <p style="font-size:0.8rem; font-weight:600;">Click to upload gallery images</p>
                </div>
                <div id="zoom-gallery-container" style="margin-top:10px;">${slikeHtml}</div>
            </div>
        `;
    }
    else if (blok.type === 'gate') {
        window.isEditingCore = false;
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Verification Core Riddle / Primary Question:</label>
                    <input type="text" id="zoom-field-hint" value="${blok.hint || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Input Guideline Label (Placeholder):</label>
                    <input type="text" id="zoom-field-placeholder" value="${blok.placeholder || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Valid Passphrases (Comma separated):</label>
                    <input type="text" id="zoom-field-answers" value="${blok.answers ? blok.answers.join(', ') : ''}" placeholder="e.g. destiny, luxury">
                </div>
                <div class="form-group">
                    <label>Rejection Alert Error Label String:</label>
                    <input type="text" id="zoom-field-errorMessage" value="${blok.errorMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <div class="form-group">
                <label>Submission Button String:</label>
                <input type="text" id="zoom-field-buttonText" value="${blok.buttonText || 'Verify'}" oninput="sinhronizujZoomSaPreviewom()">
            </div>
        `;
    }
    else if (blok.type === 'finale') {
        window.isEditingCore = false;
        dynamicHtml = `
            <div class="grid-2">
                <div class="form-group">
                    <label>Cinematic Final Love Declaration Statement:</label>
                    <input type="text" id="zoom-field-finalLoveMessage" value="${blok.finalLoveMessage || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
                <div class="form-group">
                    <label>Closing Signature Label:</label>
                    <input type="text" id="zoom-field-finalSignature" value="${blok.finalSignature || ''}" oninput="sinhronizujZoomSaPreviewom()">
                </div>
            </div>
            <input type="hidden" id="zoom-field-endIconType" value="${blok.endIconType || 'images/rose.png'}">
        `;
    }

    telo.innerHTML = `
        ${dynamicHtml}
        <div class="form-group" style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
            <label><i class="fa-solid fa-sparkles" style="color:var(--admin-accent);"></i> VFX Overlay Particles for this node:</label>
            <select id="zoom-field-sceneEffect" onchange="sinhronizujZoomSaPreviewom()">
                <option value="none" ${blok.sceneEffect === 'none' ? 'selected' : ''}>Absolute Dark Mode</option>
                <option value="rose-petals" ${blok.sceneEffect === 'rose-petals' ? 'selected' : ''}>Rose Petals</option>
                <option value="confetti" ${blok.sceneEffect === 'confetti' ? 'selected' : ''}>Gold Confetti</option>
                <option value="snow" ${blok.sceneEffect === 'snow' ? 'selected' : ''}>Gold Dust</option>
            </select>
        </div>
        <div class="form-group" style="margin-top:15px;">
            <label>Dedicated Ambient Audio Track (.mp3):</label>
            <div class="zoom-drop-zone" style="padding:12px;" onclick="okiniLokalniKlikFajla('block-audio')">
                <i class="fa-solid fa-music" style="color:var(--admin-accent); margin-right:8px;"></i>
                <span id="zoom-audio-display-name">Track Wrapper: ${audioName}</span>
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
}

export function zatvoriZoomEditor() { document.getElementById('zoom-editor-overlay').style.display = 'none'; window.isEditingCore = false; renderujTimelineBlokove(); }

export function potvrdiIZatvoriZoom() {
    const blok = trenutniConfig.timeline[window.aktivniIndex];
    if (!blok) return;

    if (blok.type === 'intro' || window.isEditingCore) {
        trenutniConfig.config.globalSettings.projectName = document.getElementById('zoom-core-projectName').value;
        trenutniConfig.config.globalSettings.projectSubtitle = document.getElementById('zoom-core-projectSubtitle').value;
        trenutniConfig.loader.warningTitle = document.getElementById('zoom-core-warningTitle').value;
        trenutniConfig.config.hasWarningMessage = document.getElementById('zoom-core-hasWarningMessage').checked;
        const rawTexts = document.getElementById('zoom-core-warningTexts').value;
        trenutniConfig.loader.warningTexts = rawTexts.split('\n').filter(r => r.trim() !== '');
    } else {
        if (document.getElementById('zoom-field-sceneEffect')) blok.sceneEffect = document.getElementById('zoom-field-sceneEffect').value;
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
        }
    }
    renderujTimelineBlokove();
    zatvoriZoomEditor();
    osveziZiviPreview(trenutniConfig);
}

export function inicijalizujDugmadZaSnimanje() {
    const floatHolder = document.getElementById('floating-action-holder');
    if (!floatHolder) return;
    floatHolder.innerHTML = `
        <button type="button" class="btn-save" onclick="sacuvajSveNaServer('save')" style="background:#1c2a39; border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; cursor:pointer; padding:12px; border-radius:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:500; box-shadow:0 4px 15px rgba(0,0,0,0.3);"><i class="fa-solid fa-floppy-disk"></i> Lock Changes to Draft</button>
        <button type="button" class="btn-save" onclick="sacuvajSveNaServer('publish')" style="width:100%; cursor:pointer; padding:12px; border-radius:8px; background:var(--admin-accent); color:var(--admin-sidebar); font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; border:none; box-shadow:0 4px 15px rgba(212,180,131,0.2);"><i class="fa-solid fa-rocket"></i> Launch Live Network</button>
    `;
}

export function inicijalizujDragAndDrop() {
    const container = document.getElementById('cms-blocks-list');
    if (!container) return;

    let dragIzvorIndex = null;

    container.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        const card = e.target.closest('.cms-block-card');
        if (!card) return;
        dragIzvorIndex = parseInt(card.getAttribute('data-index'));
        card.style.opacity = '0.4';
    });

    container.addEventListener('dragend', (e) => {
        e.stopPropagation();
        const card = e.target.closest('.cms-block-card');
        if (card) card.style.opacity = '1';
        document.querySelectorAll('.cms-block-card').forEach(c => c.classList.remove('drag-over-active'));
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = e.target.closest('.cms-block-card');
        if (card) card.classList.add('drag-over-active');
    });

    container.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        const card = e.target.closest('.cms-block-card');
        if (card) card.classList.remove('drag-over-active');
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = e.target.closest('.cms-block-card');
        if (!card) return;

        const dragCiljIndex = parseInt(card.getAttribute('data-index'));
        if (dragIzvorIndex === null || dragIzvorIndex === dragCiljIndex) return;

        const privremeni = trenutniConfig.timeline[dragIzvorIndex];
        trenutniConfig.timeline.splice(dragIzvorIndex, 1);
        trenutniConfig.timeline.splice(dragCiljIndex, 0, privremeni);

        window.aktivniIndex = dragCiljIndex;
        renderujTimelineBlokove();
        postaviAktivniBlok(dragCiljIndex);
    });

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropPozadina = e.target.closest('#drop-global-pozadina');
        if (dropPozadina && e.dataTransfer.files.length > 0) {
            const fajl = e.dataTransfer.files[0];
            document.getElementById('input-slika-pozadina').value = 'images/' + fajl.name;
            document.getElementById('label-global-pozadina').innerText = 'images/' + fajl.name;
            fajloviZaUpload.push({ putanja: 'images/' + fajl.name, rawFile: fajl });
            trenutniConfig.config.globalSettings._tempBgPreview = URL.createObjectURL(fajl);
            osveziZiviPreview(trenutniConfig);
        }
    });
}

/* ==========================================================================
   💾 SYSTEM PERSISTENCE & MEDIA RECONCILIATION LAYER (Structured)
   ========================================================================== */

/**
 * Hirurško uklanjanje specifične slike iz galerijskog albuma unutar Zoom prozora
 */
export function ukloniSlikuIzGalerijeZoom(imgIndex) {
    if (window.aktivniIndex === null || window.aktivniIndex === -1) return;

    const blok = trenutniConfig.timeline[window.aktivniIndex];
    if (!blok || !blok.galleryImages) return;

    // Ako indeks nije sistemski osvežavajući marker (-1), vršimo brisanje iz niza
    if (imgIndex !== -1) {
        blok.galleryImages.splice(imgIndex, 1);
    }

    // Ponovno generisanje i renderovanje čistog HTML-a za thumbnail galeriju
    let slikeHtml = '';
    blok.galleryImages.forEach((imgSrc, i) => {
        slikeHtml += `
            <div class="zoom-thumb" style="display:inline-block; position:relative; margin:5px; width:80px; height:80px; border:1px solid var(--admin-border); border-radius:6px; overflow:hidden;">
                <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">
                <button type="button" onclick="ukloniSlikuIzGalerijeZoom(${i})" style="position:absolute; top:2px; right:2px; background:#b81d24; color:#fff; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center;">×</button>
            </div>
        `;
    });

    const galleryContainer = document.getElementById('zoom-gallery-container');
    if (galleryContainer) {
        galleryContainer.innerHTML = slikeHtml;
    }

    // Instantna sinhronizacija i osvežavanje živog preview panela sa desne strane
    osveziZiviPreview(trenutniConfig);
}

/**
 * Glavna asinhrona magistrala za pakovanje i slanje celokupne konfiguracije na Cloudflare Edge
 */
export async function sacuvajSveNaServer(akcija = 'save') {
    const poruka = akcija === 'publish' ? "Launch CHANGES LIVE?" : "Commit alterations to Draft?";
    if (!confirm(poruka)) return;

    // Čišćenje lokalnih blob url-ova pre slanja kako baza na serveru ne bi čuvala privremene linkove
    if (trenutniConfig.timeline) {
        trenutniConfig.timeline.forEach(blok => {
            if (blok.url && blok.url.startsWith('blob:')) {
                blok.url = blok._realName || '';
            }
            if (blok.bgMusicUrl && blok.bgMusicUrl.startsWith('blob:')) {
                blok.bgMusicUrl = blok._realName || '';
            }
        });
    }

    // Formiranje čistog eksportnog objekta prema strogoj šemi sistema
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
            warningTitle: document.getElementById('zoom-core-warningTitle')?.value || "⚠️ NOTICE ⚠️",
            warningFinalLine: "",
            warningTexts: trenutniConfig.loader?.warningTexts || []
        },
        timeline: trenutniConfig.timeline || []
    };

    // Pakovanje podataka i sirovih fajlova u višenamenski FormData paket
    const formData = new FormData();
    formData.append('config_data', JSON.stringify(cistConfigZaExport));
    formData.append('action', akcija);
    formData.append('subdomain', window.currentSubdomain);

    if (fajloviZaUpload.length > 0) {
        fajloviZaUpload.forEach((item, idx) => {
            formData.append(`file_${idx}`, item.rawFile, item.putanja);
        });
    }

    try {
        const token = localStorage.getItem('selection_session_token');
        const response = await fetch(`${API_BASE}/save_data`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });

        if (response.ok) {
            alert("🎉 System Synced to Edge!");
            location.reload();
        } else {
            alert("🔒 Sync Denied.");
        }
    } catch (e) {
        console.error("⛔ Slanje na server je prekinuto:", e);
        alert("❌ Network connection lost.");
    }
}