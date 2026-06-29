// admin/bootstrap.js (V25.4.0 - Explicit Exchanger Flow)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

async function safeFetch(url) {
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    });

    const text = await res.text();
    const cleanText = text.trim();
    const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html") || cleanText.startsWith("<head");

    if (looksLikeHtml) {
        throw new Error("HTML_FALLBACK_DETECTED");
    }

    if (res.status === 401) {
        throw new Error("API_STATUS_401");
    }

    if (!res.ok) {
        throw new Error(`API_STATUS_${res.status}`);
    }

    try {
        return JSON.parse(cleanText);
    } catch {
        throw new Error("BAD_RESPONSE_FORMAT");
    }
}

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;

    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Provera Selection sesije na unifikovanoj kapiji.");

        // Prvi korak: Proveravamo čist /api/me
        const profile = await safeFetch(`${API_BASE}/api/me`);

        const finalIdentity = profile.identity || profile;
        console.log("🔑 [3/4] Identitet uspešno verifikovan kroz sistemsko jezgro.");

        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        console.log(`🛡️ [4/4] Inicijalizacija uspešna. Dobrodošao, ${finalIdentity.email}`);
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        console.warn("⚠️ [State Machine Transition] Prekid inicijalizacije.");

        if (err.message === "API_STATUS_401" || err.message === "HTML_FALLBACK_DETECTED") {
            console.log("🔄 Sesija fali. Pokrećem EXPLICIT EXCHANGER...");

            // Čitamo CF_Authorization koji je urezan na nivou celog .selection.rs domena
            const cfTokenAssertion = document.cookie.match(/CF_Authorization=([^;]+)/)?.[1];

            if (cfTokenAssertion) {
                console.log("🚀 [Token Bridge] Šaljem token na eksplicitnu razmenu (/api/auth/exchange)...");

                try {
                    const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ cfToken: cfTokenAssertion })
                    });

                    if (exchangeRes.ok) {
                        console.log("🟢 Razmena uspešna. Pokrećem re-entry verifikaciju...");
                        // Rekurzivno ponavljamo bootstrap, sada imamo kolačić!
                        return await bootstrapAdmin();
                    } else {
                        console.error("❌ Razmena tokena odbijena od strane API kapije.");
                    }
                } catch (exchangeError) {
                    console.error("❌ Mrežni krah tokom razmene tokena:", exchangeError.message);
                }
            } else {
                console.warn("⚠️ Cloudflare Access viza nije pronađena u pretraživaču.");
            }

            // Ako nema tokena ili je razmena propala, šaljemo na CF Access login preko admin.selection.rs aplikacije
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
            document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));

            console.log("🛡️ Preusmeravam pretraživač na Cloudflare mrežni izazov...");
            // Pošto admin.selection.rs ima "Require" polisu u Access-u, obično osvežavanje stranice rešava login
            window.location.reload();
            return null;
        }

        root.setAttribute("data-status", AUTH_STATE.ERROR);
        console.error("💥 SYSTEM FATAL ERROR:", err.message);

        const tbody = document.getElementById('users-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
        return null;
    }
}

// Inicijalni korenski okidač
bootstrapAdmin();