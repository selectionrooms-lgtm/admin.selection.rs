// SELECTION MASTER CONTROL PLANE — Bootstrap Engine (V19.0.0 - API Gateway Aligned)

// ⚡ USTAVNA ISPRAVKA: Sve mrežne cevi sada gađaju centralni, zaštićeni API Gateway
const API_BASE = "https://api.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) {
        console.error("Fatal: Očekivani element #selection-admin-root nije pronađen u DOM-u.");
        return null;
    }
    root.setAttribute("data-status", "loading");

    try {
        console.log("🛡️ [Master Boot] Proveravam mrežni identitet preko novog API Gateway-a...");

        // Šaljemo credentials: "include" kako bi brauzer preneo Cloudflare Access kolačiće na api.selection.rs
        const res = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            credentials: "include"
        });

        if (res.status === 401 || res.status === 403) {
            root.setAttribute("data-status", "forbidden");
            renderSistemskiEkran(root, "Pristup Odbijen", "Autorizacija neuspešna na kapiji API Gateway-a ili nemate administratorski nivo ovlašćenja.", "#ff453a");
            return null;
        }

        if (!res.ok) throw new Error(`HTTP_ERROR_${res.status}`);

        const profile = await res.json();

        root.setAttribute("data-status", "ready");
        console.log("👑 USPEH: Centralni API verifikovao identitet:", profile.email);

        // Obaveštavamo ceo frontend sistem (tabelu i skripte) da su stigli ustavni podaci o korisniku
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: profile }));
        return profile;

    } catch (err) {
        console.error("❌ Bootstrap fail:", err);
        root.setAttribute("data-status", "error");
        renderSistemskiEkran(root, "Sistemski prekid", "Prekinuta veza sa centralnim Edge ruterom (api.selection.rs). Osvežite panel.", "#d4b483", true);
        return null;
    }
}

// 🛡️ Menjanje stanja isključivo unutar našeg admin root-a (Zadržana Apple-like estetika gold na anthracite)
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
        btn.style.cssText = "background-color: #d4b483; color: #0b0f14; border: none; padding: 10px 24px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 13px; transition: opacity 0.2s;";
        btn.textContent = "Osveži";
        btn.addEventListener("click", () => window.location.reload());
        kontejner.appendChild(btn);
    }

    rootElement.replaceChildren(kontejner);
}