// shell-core.js — Main SaaS Application Core Orchestrator
import { verifyIdentityAndGetProfile } from './auth.js';
import { initCmsEditor } from './cms-editor.js';

const API_BASE = "https://shell.selection.rs";

document.addEventListener("DOMContentLoaded", async () => {
    // 🛡️ 1. Execute edge network verification on the Cloudflare node
    const sessionProfile = await verifyIdentityAndGetProfile();

    // If the profile returns null, the identity is parked in the waiting room. Halt execution.
    if (!sessionProfile) return;

    const masterBlok = document.getElementById('master-admin-blok');

    // 👑 2. SECURITY INJECTION FOR MASTER ROLE ONLY
    if (sessionProfile.userRole === 'master') {
        console.log("👑 Escalating local system clearance to Master Level. Injecting Terminal tools...");

        // Eksplicitno i bezbedno palimo master kontrole samo tebi
        if (masterBlok) masterBlok.style.setProperty('display', 'block', 'important');

        // Dynamically import the control plane system so clients never download this code
        import('./control-plane.js').then((module) => {
            module.initControlPlaneElements();
            console.log("✅ Master Control Plane Terminal fully loaded and active.");
        });
    } else {
        // 🔒 Sabotaža za klijente: Hirurški brišemo Master HTML strukturu iz klijentskog brauzera
        if (masterBlok) masterBlok.remove();
    }

    // 🧱 3. Bootstrapping Tenant Workspace Config Matrix
    fetch(`${API_BASE}/api/config?subdomain=${sessionProfile.activeSubdomain}&nocache=${Date.now()}`, {
        credentials: "include"
    })
        .then(res => {
            if (!res.ok) throw new Error("Edge database link failed.");
            return res.json();
        })
        .then(data => {
            let configurationMatrix = data.draft_config || data.live_config || data.config || data;

            // Initialize the workspace narrative engine with synchronized data
            initCmsEditor(configurationMatrix);
        })
        .catch(err => {
            console.error("⚠️ Workspace stream read failed. Starting engine fallback mode.", err);
        });
});