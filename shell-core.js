// shell-core.js — Main SaaS Application Core Orchestrator
import { verifyIdentityAndGetProfile } from './auth.js';
import { initCmsEditor } from './cms-editor.js';

const API_BASE = "https://shell.selection.rs";

document.addEventListener("DOMContentLoaded", async () => {
    // Provera identiteta na ivici mreže
    const sessionProfile = await verifyIdentityAndGetProfile();
    if (!sessionProfile) return;

    const masterBlok = document.getElementById('master-admin-blok');

    // 👑 MASTER ENGINE ŽIVA REGISTRACIJA
    if (sessionProfile.userRole === 'master') {
        console.log("👑 Escalating local system clearance to Master Level...");
        if (masterBlok) masterBlok.style.setProperty('display', 'block', 'important');

        import('./control-plane.js').then((module) => {
            module.initControlPlaneElements();

            window.masterKreirajNovogKorisnika = module.masterKreirajNovogKorisnika;
            window.otvoriMasterControlPlane = module.otvoriMasterControlPlane;
            window.zatvoriMasterControlPlane = module.zatvoriMasterControlPlane;
        });
    } else {
        if (masterBlok) masterBlok.remove();
    }

    // Povlačenje konfiguracije sa Cloudflare klijentskog gateway-a
    fetch(`${API_BASE}/api/config?subdomain=${sessionProfile.activeSubdomain}&nocache=${Date.now()}`, {
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Edge database link failed.");
            return res.json();
        })
        .then(data => {
            let configurationMatrix = data.draft_config || data.live_config || data.config || data;

            // 🧱 1. Podižemo kompletan interfejs i renderujemo kockice
            initCmsEditor(configurationMatrix);

            // 📡 2. Aktivacija globalnog pametnog rutera za klikove
            aktivirajGvozdeniRuterKlikova();
        })
        .catch(err => {
            console.error("⚠️ Workspace stream read failed. Fallback triggered.", err);
        });
});

function aktivirajGvozdeniRuterKlikova() {
    const zoomOverlay = document.getElementById('zoom-editor-overlay');

    // 🛡️ GLOBALNI EVENT LISTENER (Hvata sve elemente bez obzira na to kad su rođeni u DOM-u)
    document.addEventListener('click', (e) => {

        // 1. Klik na LEGO Kockice (Edit / Delete)
        const btnEdit = e.target.closest('.btn-edit-zoom');
        const btnDelete = e.target.closest('.btn-delete');
        const card = e.target.closest('.cms-block-card');

        if (btnEdit && card) {
            e.preventDefault();
            if (card.id === 'splash-config-card') {
                if (window.otvoriCoreZoomEditor) window.otvoriCoreZoomEditor();
                if (zoomOverlay) zoomOverlay.style.setProperty('display', 'flex', 'important');
            } else {
                const idx = parseInt(card.getAttribute('data-index'));
                if (window.otvoriZoomEditorZaBlok) window.otvoriZoomEditorZaBlok(idx);
                if (zoomOverlay) zoomOverlay.style.setProperty('display', 'flex', 'important');
            }
            return;
        }

        if (btnDelete && card) {
            e.preventDefault();
            const idx = parseInt(card.getAttribute('data-index'));
            if (window.obrisiBlok) window.obrisiBlok(idx);
            return;
        }

        // 2. Klik na Master Control Plane dugmad
        if (e.target.closest('#btn-master-console-trigger')) {
            window.otvoriMasterControlPlane?.();
            return;
        }
        if (e.target.closest('#btn-master-console-close')) {
            window.zatvoriMasterControlPlane?.();
            return;
        }

        // 3. Klik na Topbar dugmad za dodavanje novih čvorova (Nodes)
        if (e.target.closest('#btn-shortcut-intro')) { window.postaviAktivniBlok?.(-1); return; }
        if (e.target.closest('#btn-add-video')) { window.dodajNoviBlok?.('video'); return; }
        if (e.target.closest('#btn-add-chapter')) { window.dodajNoviBlok?.('chapter'); return; }
        if (e.target.closest('#btn-add-gate')) { window.dodajNoviBlok?.('gate'); return; }
        if (e.target.closest('#btn-add-finale')) { window.dodajNoviBlok?.('finale'); return; }

        // 4. Klik na PC / Mobile Simulator View
        if (e.target.closest('#btn-mode-mobile')) { window.promeniRezimSimulatora?.('mobile'); return; }
        if (e.target.closest('#btn-mode-pc')) { window.promeniRezimSimulatora?.('pc'); return; }

        // 5. Zatvaranje i čuvanje unutar Zoom Modala
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

        // 6. 🎯 FIX ZA LEVI PANEL UPLOAD (Gvozdeno presretanje klikova za medije)
        if (e.target.closest('#drop-global-pozadina')) {
            window.okiniLokalniKlikFajla?.('slika');
            return;
        }
        if (e.target.closest('#drop-global-loader-muzika')) {
            window.okiniLokalniKlikFajla?.('loader-mp3');
            return;
        }
        if (e.target.closest('#drop-global-ss-muzika')) {
            window.okiniLokalniKlikFajla?.('ss-mp3');
            return;
        }
    });
}