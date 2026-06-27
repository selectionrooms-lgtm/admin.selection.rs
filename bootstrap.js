// admin/bootstrap.js (V25.2.0 - Direct Browser Cookie Reader)
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
        credentials: "include", // Automatski prenosi session kolačić
        headers: { "Content-Type": "application/json" }
    });

    const text = await res.text();
    const cleanText = text.trim();
    const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html") || cleanText.startsWith("<head");

    if (looksLikeHtml) {
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

    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Provera Selection sesije.");

        let profile;
        try {
            // Korak A: Proveravamo da li pretraživač već ima važeći session kolačić
            profile = await safeFetch(`${API_BASE}/api/me`);
            console.log("🟢 [Direct Auth] Aktivna sesija pronađena. Preskačem razmenu.");
        } catch (err) {
            // Ako sesije nema (API vratio 401), čitamo token direktno iz pretraživača
            if (err.message === "API_STATUS_401") {
                console.log("🔄 Sistemska sesija fali. Čitam CF token direktno iz pretraživača...");

                // Čitamo CF_Authorization koji je Cloudflare Access urezao na celom .selection.rs domenu
                const cfTokenAssertion = document.cookie.match(/CF_Authorization=([^;]+)/)?.[1];

                if (!cfTokenAssertion) {
                    console.warn("⚠️ Cloudflare Access viza nije pronađena u pretraživaču.");
                    throw new Error("NO_AUTH_SESSION");
                }

                console.log("🚀 [Token Bridge] Pokrećem eksplicitnu razmenu na API sloju (/api/auth/exchange)...");

                const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include", // Dozvoljava upis Set-Cookie
                    body: JSON.stringify({ cfToken: cfTokenAssertion })
                });

                if (!exchangeRes.ok) {
                    const errData = await exchangeRes.json().catch(() => ({}));
                    console.error("❌ Razmena tokena odbijena:", errData.error || exchangeRes.statusText);
                    throw new Error("NO_AUTH_SESSION");
                }

                console.log("🟢 Razmena uspešna. Pokrećem re-entry verifikaciju identiteta...");
                profile = await safeFetch(`${API_BASE}/api/me?t=${Date.now()}`);
            } else {
                throw err;
            }
        }

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

        if (err.message === "NO_AUTH_SESSION" || err.message === "HTML_FALLBACK_DETECTED") {
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
            document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));

            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 60px 20px;">
                            <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Vaša sesija je istekla ili niste autorizovani.</div>
                            <button onclick="window.location.href = window.location.origin" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 4px 14px rgba(0,112,243,0.3);">Ponovo poveži nalog</button>
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