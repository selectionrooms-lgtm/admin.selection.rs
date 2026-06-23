// shell-core.js — Main SaaS Application Core Orchestrator
import { verifyIdentityAndGetProfile } from './auth.js';
import { initCmsEditor } from './cms-editor.js';

const API_BASE = "https://shell.selection.rs";

document.addEventListener("DOMContentLoaded", async () => {
    const sessionProfile = await verifyIdentityAndGetProfile();
    if (!sessionProfile) return;

    const masterBlok = document.getElementById('master-admin-blok');

    if (sessionProfile.userRole === 'master') {
        console.log("👑 Escalating local system clearance to Master Level. Injecting Terminal tools...");
        if (masterBlok) masterBlok.style.setProperty('display', 'block', 'important');

        // Dynamically import control-plane i vezujemo drajvere za dugmad na klik
        import('./control-plane.js').then((module) => {
            module.initControlPlaneElements();

            // 🛡️ MODULAR FIX: Ručno lepimo funkcije na ID dugmića jer su zatvorene u modulu!
            const btnOpen = document.getElementById('btn-master-console-trigger');
            const btnClose = document.getElementById('btn-master-console-close');

            if (btnOpen) btnOpen.onclick = () => module.otvoriMasterControlPlane();
            if (btnClose) btnClose.onclick = () => module.zatvoriMasterControlPlane();

            // Izlažemo i funkciju za kreiranje korisnika na prozor da bi HTML mogao da je okine
            window.masterKreirajNovogKorisnika = module.masterKreirajNovogKorisnika;
            window.otvoriMasterControlPlane = module.otvoriMasterControlPlane;
            window.zatvoriMasterControlPlane = module.zatvoriMasterControlPlane;

            console.log("✅ Master Control Plane Terminal fully loaded and active.");
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
        })
        .catch(err => {
            console.error("⚠️ Workspace stream read failed. Fallback triggered.", err);
        });
});