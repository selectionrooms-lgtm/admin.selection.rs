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
    const zoomOverlay = document.getElementById('zoom-editor-overlay');

    document.addEventListener('click', (e) => {
        // 📡 DEBUG DIJAGNOSTIKA: Pratimo tačan kliknuti element u konzoli
        console.log("🔍 CLICK DETECTED ON TARGET:", e.target);

        const card = e.target.closest('.cms-block-card');

        if (card) {
            const idx = Number(card.getAttribute('data-index')) || 0;

            // 👑 1. EDIT UVEK IMA APSOLUTNI PRIORITET (Tvoj poboljšani filter)
            if (e.target.closest('.btn-edit-zoom,[data-action="edit"]')) {
                e.preventDefault();
                e.stopPropagation();

                console.log("✏️ EDIT MATRIX NODE OKINUT ZA BLOK INDEKS:", card.id === 'splash-config-card' ? -1 : idx);

                if (card.id === 'splash-config-card') {
                    if (window.otvoriCoreZoomEditor) window.otvoriCoreZoomEditor();
                } else {
                    if (window.otvoriZoomEditorZaBlok) window.otvoriZoomEditorZaBlok(idx);
                }

                requestAnimationFrame(() => {
                    if (zoomOverlay) zoomOverlay.style.setProperty('display', 'flex', 'important');
                });
                return;
            }

            // 2. Klik na DELETE dugme
            if (e.target.closest('.btn-delete')) {
                e.preventDefault(); e.stopPropagation();
                if (window.obrisiBlok) window.obrisiBlok(idx);
                return;
            }

            // 3. Kretanje GORE (▲)
            if (e.target.textContent.trim() === '▲') {
                e.preventDefault(); e.stopPropagation();
                if (window.pomeriBlok) window.pomeriBlok(idx, -1);
                return;
            }

            // 4. Kretanje DOLE (▼)
            if (e.target.textContent.trim() === '▼') {
                e.preventDefault(); e.stopPropagation();
                if (window.pomeriBlok) window.pomeriBlok(idx, 1);
                return;
            }

            // 5. Ako nije ništa od dugmića -> OBIČNA SELEKCIJA BLOKA (FOKUS)
            e.preventDefault();
            if (window.postaviAktivniBlok) {
                window.postaviAktivniBlok(card.id === 'splash-config-card' ? -1 : idx);
            }
            return;
        }

        // --- GLOBALNI SISTEMSKI RUTER KLIKOVA (Master & Ostalo) ---
        if (e.target.closest('#btn-master-console-trigger')) { window.otvoriMasterControlPlane?.(); return; }
        if (e.target.closest('#btn-master-console-close')) { window.zatvoriMasterControlPlane?.(); return; }

        if (e.target.closest('#btn-shortcut-intro')) { window.postaviAktivniBlok?.(-1); return; }
        if (e.target.closest('#btn-add-video')) { window.dodajNoviBlok?.('video'); return; }
        if (e.target.closest('#btn-add-chapter')) { window.dodajNoviBlok?.('chapter'); return; }
        if (e.target.closest('#btn-add-gate')) { window.dodajNoviBlok?.('gate'); return; }
        if (e.target.closest('#btn-add-finale')) { window.dodajNoviBlok?.('finale'); return; }

        if (e.target.closest('#btn-mode-mobile')) { window.promeniRezimSimulatora?.('mobile'); return; }
        if (e.target.closest('#btn-mode-pc')) { window.promeniRezimSimulatora?.('pc'); return; }

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

        // Upload sekcije sidebara
        if (e.target.closest('#drop-global-pozadina')) { window.okiniLokalniKlikFajla?.('slika'); return; }
        if (e.target.closest('#drop-global-loader-muzika')) { window.okiniLokalniKlikFajla?.('loader-mp3'); return; }
        if (e.target.closest('#drop-global-ss-muzika')) { window.okiniLokalniKlikFajla?.('ss-mp3'); return; }
    });

    // Gvozdeni ESC ključ za zatvaranje modala nazad
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const masterOverlay = document.getElementById('master-control-plane-overlay');
            if (zoomOverlay && zoomOverlay.style.display === 'flex') {
                zoomOverlay.style.setProperty('display', 'none', 'important');
                window.zatvoriZoomEditor?.();
            }
            if (masterOverlay && masterOverlay.style.display === 'block') {
                window.zatvoriMasterControlPlane?.();
            }
        }
    });
}