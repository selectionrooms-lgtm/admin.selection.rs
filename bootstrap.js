// admin.selection.rs/bootstrap.js (V25.0.0 - Twin-Engine Explicit Exchange)
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
 * Osigurava da ne pokušavamo da parsiramo HTML login stranice ako nešto pukne na mreži.
 */
async function safeFetch(url) {
    const res = await fetch(url, {
        method: "GET",
        credentials: "include", // Donosi selection_session kolačić automatski
        headers: { "Content-Type": "application/json" }
    });

    const text = await res.text();
    const looksLikeHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");

    if (looksLikeHtml || res.status === 401 || res.status === 403) {
        throw new Error("NO_AUTH_SESSION");
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("BAD_RESPONSE_FORMAT");
    }
}

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;

    // Inicijalizacija mašine stanja
    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Provera sistemske JWT sesije.");

        let profile;
        try {
            // Prvo proveravamo da li browser već ima važeći selection_session kolačić
            profile = await safeFetch(`${API_BASE}/api/me`);
        } catch (err) {
            if (err.message === "NO_AUTH_SESSION") {
                console.log("🔄 Sistemska sesija fali. Povlačim CF token iz lokalnog Pages proksija...");

                // Gađamo lokalni Pages Functions proksi na ISTOM domenu da nam izvuče cf-access-jwt-assertion
                const localProxyRes = await fetch(`${window.location.origin}/api/me`);
                if (!localProxyRes.ok) throw new Error("NO_AUTH_SESSION");

                const proxyData = await localProxyRes.json();

                // Uzimamo sirovi token iz proksija
                const cfTokenAssertion = proxyData.token || proxyData.jwt || document.cookie.match(/CF_Authorization=([^;]+)/)?.[1];

                if (!cfTokenAssertion) {
                    throw new Error("NO_AUTH_SESSION");
                }

                console.log("🚀 Pokrećem eksplicitnu razmenu na API sloju (Token Exchange)...");
                const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include", // Ključno: dozvoljava API-ju da upiše Set-Cookie
                    body: JSON.stringify({ cfToken: cfTokenAssertion })
                });

                if (!exchangeRes.ok) throw new Error("NO_AUTH_SESSION");

                console.log("🟢 Razmena uspešna. Re-entry verifikacija pokrenuta...");
                profile = await safeFetch(`${API_BASE}/api/me`);
            } else {
                throw err;
            }
        }

        const finalIdentity = profile.identity || profile;
        console.log("🔑 [3/4] Identitet uspešno verifikovan kroz sistemsko jezgro.");

        // Uspešna tranzicija u AUTHENTICATED
        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        console.log(`🛡️ [4/4] Inicijalizacija uspešna. Dobrodošao nazad, ${finalIdentity.email}`);
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