// admin.selection.rs/bootstrap.js (V25.1.0 - Hardened Twin-Engine Explicit Exchange)
const API_BASE = "https://api.selection.rs";

// 🪐 SSOT AUTH STATE MACHINE
export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

/**
 * 🛡️ SAFE FETCH PRESRETAČ
 * Striktno kontroliše JSON parsiranje i seče HTML anomalije.
 * Za bazične rute vraća sirovi odgovor kako bi bootstrap mogao sam da kontroliše statuse (401, 403).
 */
async function safeFetch(url) {
    const res = await fetch(url, {
        method: "GET",
        credentials: "include", // Donosi i šalje kolačić automatski na api.selection.rs
        headers: { "Content-Type": "application/json" }
    });

    const text = await res.text();
    const cleanText = text.trim();
    const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html") || cleanText.startsWith("<head");

    if (looksLikeHtml) {
        console.error("🚨 [Security Breach Attempt] Presretnut HTML odgovor na API ruti:", url);
        throw new Error("HTML_FALLBACK_DETECTED");
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

    // Inicijalizacija mašine stanja u LOADING režim
    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Provera sistemske JWT sesije na ivici.");

        let profile;
        try {
            // Korak A: Proveravamo da li browser već ima važeći selection_session kolačić
            profile = await safeFetch(`${API_BASE}/api/me`);
            console.log("🟢 [Direct Auth] Aktivna sesija pronađena. Preskačem razmenu.");
        } catch (err) {
            // Ako sesije nema (API vratio 401), pokrećemo proces eksplicitne razmene tokena
            if (err.message === "API_STATUS_401") {
                console.log("🔄 Sistemska sesija fali na API-ju. Povlačim CF token iz lokalnog Pages proksija...");

                // Korak B: Gađamo lokalni Pages Functions proksi na ISTOM domenu da nam izvuče cf-access-jwt-assertion
                const localProxyRes = await fetch(`${window.location.origin}/api/me`);

                const proxyContentType = localProxyRes.headers.get("Content-Type") || "";
                if (!localProxyRes.ok || !proxyContentType.includes("application/json")) {
                    console.error("❌ Lokalni proksi nije vratio JSON! Proveri functions/api/me.js strukturu.");
                    throw new Error("NO_AUTH_SESSION");
                }

                const proxyData = await localProxyRes.json();

                console.log("🚀 [Token Bridge] Pokrećem eksplicitnu razmenu na API sloju (/api/auth/exchange)...");

                // Korak D: Izvršavamo stvarni POST zahtev za razmenu koji upisuje kolačić sa ispravnim domenom
                const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include", // 👈 KLJUČNO: Dozvoljava API-ju da urezuje Set-Cookie
                    body: JSON.stringify({ cfToken: cfTokenAssertion })
                });

                if (!exchangeRes.ok) {
                    const errData = await exchangeRes.json().catch(() => ({}));
                    console.error("❌ Razmena tokena na API-ju odbijena:", errData.error || exchangeRes.statusText);
                    throw new Error("NO_AUTH_SESSION");
                }

                console.log("🟢 Razmena uspešna (Kolačić upisan). Pokrećem re-entry verifikaciju identiteta...");

                // Korak E: Re-entry verifikacija profilnog konteksta nakon što je sesija uspešno uspostavljena
                profile = await safeFetch(`${API_BASE}/api/me?t=${Date.now()}`);
            } else {
                throw err; // Propuštamo sve ostale stvarne krahove formata
            }
        }

        const finalIdentity = profile.identity || profile;
        console.log("🔑 [3/4] Identitet uspešno verifikovan kroz sistemsko jezgro.");

        // Uspešna tranzicija cele aplikacije u AUTHENTICATED stanje
        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        console.log(`🛡️ [4/4] Inicijalizacija uspešna. Dobrodošao nazad u Selection štab, ${finalIdentity.email}`);
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        console.warn("⚠️ [State Machine Transition] Prekid inicijalizacije.");

        if (err.message === "NO_AUTH_SESSION") {
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
            document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));

            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 60px 20px;">
                            <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Vaša sesija je istekla ili niste autorizovani.</div>
                            <button onclick="window.location.href = window.location.origin" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 4px 14px rgba(0,112,243,0.3);">Ponovo poveži nalog (Reconnect)</button>
                        </td>
                    </tr>`;
            }
            return null;
        }

        root.setAttribute("data-status", AUTH_STATE.ERROR);
        console.error("💥 SYSTEM FATAL ERROR:", err.message);
        const tbody = document.getElementById('users-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
        return null;
    }
}