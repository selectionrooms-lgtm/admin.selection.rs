// shell-core.js — Main SaaS Application Core Orchestrator
import { verifyIdentityAndGetProfile } from './auth.js';
import { initCmsEditor } from './cms-editor.js';

const API_BASE = "https://shell.selection.rs";

document.addEventListener("DOMContentLoaded", async () => {
    const sessionProfile = await verifyIdentityAndGetProfile();
    if (!sessionProfile) return;

    const masterBlok = document.getElementById('master-admin-blok');

    if (sessionProfile.userRole === 'master') {
        console.log("👑 Escalating local system clearance to Master Level...");
        if (masterBlok) masterBlok.style.setProperty('display', 'block', 'important');

        import('./control-plane.js').then((module) => {
            module.initControlPlaneElements();

            const btnOpen = document.getElementById('btn-master-console-trigger');
            const btnClose = document.getElementById('btn-master-console-close');

            if (btnOpen) btnOpen.onclick = () => module.otvoriMasterControlPlane();
            if (btnClose) btnClose.onclick = () => module.zatvoriMasterControlPlane();

            window.masterKreirajNovogKorisnika = module.masterKreirajNovogKorisnika;
            window.otvoriMasterControlPlane = module.otvoriMasterControlPlane;
            window.zatvoriMasterControlPlane = module.zatvoriMasterControlPlane;
        });
    } else {
        if (masterBlok) masterBlok.remove();
    }

    fetch(`${API_BASE}/api/config?subdomain=${sessionProfile.activeSubdomain}&nocache=${Date.now()}`, {
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Edge database link failed.");
            return res.json();
        })
        .then(data => {
            let configurationMatrix = data.draft_config || data.live_config || data.config || data;

            initCmsEditor(configurationMatrix);
            inicijalizujLokalneDugmiceILepljenja();
        })
        .catch(err => {
            console.error("⚠️ Workspace stream read failed. Fallback triggered.", err);
        });
});

function inicijalizujLokalneDugmiceILepljenja() {
    document.addEventListener('click', (e) => {
        const zoomOverlay = document.getElementById('zoom-editor-overlay');
        const card = e.target.closest('.cms-block-card');

        if (card) {
            const idx = Number(card.getAttribute('data-index'));
            const btnDelete = e.target.closest('.btn-delete');
            const btnEdit = e.target.closest('.btn-edit-zoom');
            const btnMoveUp = e.target.textContent.trim() === '▲';
            const btnMoveDown = e.target.textContent.trim() === '▼';

            // A. Brisanje čvora
            if (btnDelete) {
                e.preventDefault(); e.stopPropagation();
                if (window.obrisiBlok) window.obrisiBlok(idx);
                return;
            }

            // B. Pomeranje na gore
            if (btnMoveUp) {
                e.preventDefault(); e.stopPropagation();
                if (window.pomeriBlok) window.pomeriBlok(idx, -1);
                return;
            }

            // C. Pomeranje na dole
            if (btnMoveDown) {
                e.preventDefault(); e.stopPropagation();
                if (window.pomeriBlok) window.pomeriBlok(idx, 1);
                return;
            }

            // D. 👑 PRIORITETNI EDIT FILTER (Stabilan i oklopljen)
            if (btnEdit || e.target.classList.contains('btn-edit-zoom') || e.target.closest('.btn-edit-zoom')) {
                e.preventDefault(); e.stopPropagation();
                console.log("✏️ EDIT OKINUT ZA INDEKS KOCKICE:", idx);

                if (window.otvoriZoomEditorZaBlok) window.otvoriZoomEditorZaBlok(idx);

                requestAnimationFrame(() => {
                    const dynamicOverlay = document.getElementById('zoom-editor-overlay');
                    if (dynamicOverlay) dynamicOverlay.style.setProperty('display', 'flex', 'important');
                });
                return;
            }

            // E. ✨ ZAŠTITA OD DUPLIH AKCIJA: Ako je kliknuto bilo koje unutrašnje namensko dugme, ovde prekidamo granu
            if (e.target.closest('.btn-action') || e.target.classList.contains('btn-action')) {
                return;
            }

            // F. Običan klik na praznu površinu kartice vrši samo SELEKCIJU (FOKUS)
            e.preventDefault();
            if (window.postaviAktivniBlok) window.postaviAktivniBlok(idx);
            return;
        }

        // --- GLOBALNE TOPBAR I SISTEMSKE PREČICE ---
        if (e.target.closest('#btn-shortcut-intro')) { window.dodajNoviBlok?.('intro'); return; }
        if (e.target.closest('#btn-add-video')) { window.dodajNoviBlok?.('video'); return; }
        if (e.target.closest('#btn-add-chapter')) { window.dodajNoviBlok?.('chapter'); return; }
        if (e.target.closest('#btn-add-gate')) { window.dodajNoviBlok?.('gate'); return; }
        if (e.target.closest('#btn-add-finale')) { window.dodajNoviBlok?.('finale'); return; }

        if (e.target.closest('#btn-master-console-trigger')) { window.otvoriMasterControlPlane?.(); return; }
        if (e.target.closest('#btn-master-console-close')) { window.zatvoriMasterControlPlane?.(); return; }

        // Zatvaranje modala
        if (e.target.closest('#btn-zoom-close-header') || e.target.closest('#btn-zoom-cancel')) {
            if (zoomOverlay) zoomOverlay.style.setProperty('display', 'none', 'important');
            window.zatvoriZoomEditor?.();
            return;
        }
        if (e.target.closest('#btn-zoom-save')) {
            if (window.potvrdiIZatvoriZoom) window.potvrdiIZatvoriZoom();
            if (zoomOverlay) zoomOverlay.style.setProperty('display', 'none', 'important');
            return;
        }

        // Upload sekcije
        if (e.target.closest('#drop-global-pozadina')) { window.okiniLokalniKlikFajla?.('slika'); return; }
        if (e.target.closest('#drop-global-loader-muzika')) { window.okiniLokalniKlikFajla?.('loader-mp3'); return; }
        if (e.target.closest('#drop-global-ss-muzika')) { window.okiniLokalniKlikFajla?.('ss-mp3'); return; }
    });

    // 🔒 GLOBALNI ESCAPE OKIDAČ (Uvek aktivan)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const dynamicOverlay = document.getElementById('zoom-editor-overlay');
            const masterOverlay = document.getElementById('master-control-plane-overlay');

            if (dynamicOverlay && dynamicOverlay.style.display === 'flex') {
                dynamicOverlay.style.setProperty('display', 'none', 'important');
                window.zatvoriZoomEditor?.();
            }
            if (masterOverlay && masterOverlay.style.display === 'block') {
                window.zatvoriMasterControlPlane?.();
            }
        }
    });
}