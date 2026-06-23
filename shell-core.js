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

            // 🧱 1. Prvo podižemo kompletan interfejs i renderujemo kockice!
            initCmsEditor(configurationMatrix);

            // 📡 2. Tek kada elementi POSTOJE u memoriji, lepimo mrežne drajvere!
            inicijalizujLokalneDugmiceILepljenja();
        })
        .catch(err => {
            console.error("⚠️ Workspace stream read failed. Fallback triggered.", err);
        });
});

function inicijalizujLokalneDugmiceILepljenja() {
    const listaKockica = document.getElementById('cms-blocks-list');
    const zoomOverlay = document.getElementById('zoom-editor-overlay');

    if (listaKockica) {
        listaKockica.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit-zoom');
            const btnDelete = e.target.closest('.btn-delete');
            const card = e.target.closest('.cms-block-card');

            if (btnEdit) {
                e.stopPropagation();
                if (card && card.id === 'splash-config-card') {
                    if (window.otvoriCoreZoomEditor) {
                        window.otvoriCoreZoomEditor();
                        if (zoomOverlay) zoomOverlay.style.setProperty('display', 'flex', 'important');
                    }
                } else if (card) {
                    const idx = parseInt(card.getAttribute('data-index'));
                    if (window.otvoriZoomEditorZaBlok) {
                        window.otvoriZoomEditorZaBlok(idx);
                        if (zoomOverlay) zoomOverlay.style.setProperty('display', 'flex', 'important');
                    }
                }
            } else if (btnDelete) {
                e.stopPropagation();
                if (card) {
                    const idx = parseInt(card.getAttribute('data-index'));
                    if (window.obrisiBlok) window.obrisiBlok(idx);
                }
            }
        });
    }

    // Povezivanje fiksnih HTML prečica iz levog panela i topbara
    document.getElementById('btn-shortcut-intro')?.addEventListener('click', () => window.postActiveBlock?.(-1));
    document.getElementById('btn-add-video')?.addEventListener('click', () => window.dodajNoviBlok?.('video'));
    document.getElementById('btn-add-chapter')?.addEventListener('click', () => window.dodajNoviBlok?.('chapter'));
    document.getElementById('btn-add-gate')?.addEventListener('click', () => window.dodajNoviBlok?.('gate'));
    document.getElementById('btn-add-finale')?.addEventListener('click', () => window.dodajNoviBlok?.('finale'));

    // Povezivanje drajvera za prebacivanje PC/Mobile režima
    document.getElementById('btn-mode-mobile')?.addEventListener('click', () => window.promeniRezimSimulatora?.('mobile'));
    document.getElementById('btn-mode-pc')?.addEventListener('click', () => window.promeniRezimSimulatora?.('pc'));

    // Funkcija za bezbedno zatvaranje modala
    const ugasiZoomOklop = () => {
        if (zoomOverlay) zoomOverlay.style.setProperty('display', 'none', 'important');
        window.zatvoriZoomEditor?.();
    };

    // Povezivanje drajvera unutar samog Zoom prozora
    document.getElementById('btn-zoom-close-header')?.addEventListener('click', ugasiZoomOklop);
    document.getElementById('btn-zoom-cancel')?.addEventListener('click', ugasiZoomOklop);
    document.getElementById('btn-zoom-save')?.addEventListener('click', () => {
        if (window.potvrdiIZatvoriZoom) window.potvrdiIZatvoriZoom();
        if (zoomOverlay) zoomOverlay.style.setProperty('display', 'none', 'important');
    });

    // Povezivanje oninput promena na levom panelu
    document.getElementById('color-h1')?.addEventListener('input', () => window.osveziZiviPreview?.());
    document.getElementById('color-h2')?.addEventListener('input', () => window.osveziZiviPreview?.());
    document.getElementById('color-p')?.addEventListener('input', () => window.osveziZiviPreview?.());
    document.getElementById('font-h1')?.addEventListener('change', () => window.osveziZiviPreview?.());
    document.getElementById('font-h2')?.addEventListener('change', () => window.osveziZiviPreview?.());
    document.getElementById('font-p')?.addEventListener('change', () => window.osveziZiviPreview?.());
    document.getElementById('input-boja-pozadina')?.addEventListener('input', () => window.osveziZiviPreview?.());
    document.getElementById('input-boja-kontejner')?.addEventListener('input', () => window.osveziZiviPreview?.());
}