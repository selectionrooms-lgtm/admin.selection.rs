// SELECTION MASTER CONTROL PLANE — Bootstrap Engine (V5.2.0 - Absolute DOM Isolation)
const API_BASE = "https://shell.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) {
        console.error("Fatal: Očekivani element #selection-admin-root nije pronađen u DOM-u.");
        return null;
    }
    root.setAttribute("data-status", "loading");

    try {
        console.log("🛡️ [Master Boot] Proveravam mrežni identitet preko Cloudflare Access-a...");

        const res = await fetch(`${API_BASE}/api/me`, { method: 'GET', credentials: "include" });

        if (res.status === 401 || res.status === 403) {
            root.setAttribute("data-status", "forbidden");
            renderSistemskiEkran(root, "Pristup Odbijen", "Autorizacija neuspešna ili nemate administrativni nivo ovlašćenja.", "#ff453a");
            return null;
        }

        if (!res.ok) throw new Error(`HTTP_ERROR_${res.status}`);

        const profile = await res.json();

        root.setAttribute("data-status", "ready");
        console.log("👑 USPEH: Cloudflare Access verifikovao identitet:", profile.email);

        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: profile }));
        return profile;

    } catch (err) {
        console.error("❌ Bootstrap fail:", err);
        root.setAttribute("data-status", "error");
        renderSistemskiEkran(root, "Sistemski prekid", "Prekinuta veza sa centralnim Edge ruterom. Osvežite panel.", "#d4b483", true);
        return null;
    }
}

// 🛡️ Hirurški precizno menjanje stanja isključivo unutar našeg admin root-a (Bez innerHTML-a)
function renderSistemskiEkran(rootElement, naslov, opis, bojaNaslova, prikaziDugme = false) {
    const kontejner = document.createElement("div");
    kontejner.style.cssText = "min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; text-align: center; padding: 20px;";

    const h1 = document.createElement("h1");
    h1.style.cssText = `font-size: 22px; margin-bottom: 10px; font-weight: 500; letter-spacing: -0.5px; color: ${bojaNaslova};`;
    h1.textContent = naslov;

    const p = document.createElement("p");
    p.style.cssText = "color: #7e8e9f; max-width: 450px; font-size: 13px; line-height: 1.6; margin-bottom: 20px;";
    p.textContent = opis;

    kontejner.appendChild(h1);
    kontejner.appendChild(p);

    if (prikaziDugme) {
        const btn = document.createElement("button");
        btn.style.cssText = "background-color: #d4b483; color: #0b0f14; border: none; padding: 10px 24px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 13px;";
        btn.textContent = "Osveži";
        btn.addEventListener("click", () => window.location.reload());
        kontejner.appendChild(btn);
    }

    // 🛠️ FIX: Izolovano menjamo decu samo unutar admin root-a, ne diramo ostatak tela stranice
    rootElement.replaceChildren(kontejner);
}