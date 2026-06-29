// admin/bootstrap.js (V25.4.5 - Anti-Loop Explicit Exchanger)
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
        console.log("🕵️‍♂️ [1/4] Provera Selection sesije na unifikovanoj kapiji...");
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
        console.warn("⚠️ [State Machine] Sesija nije aktivna ili je istekla.");

        if (err.message === "API_STATUS_401" || err.message === "HTML_FALLBACK_DETECTED") {
            // 1. ČITAMO CF TOKEN
            const cfTokenAssertion = document.cookie.match(/CF_Authorization=([^;]+)/)?.[1];

            // 🛑 GVOZDENA KOČNICA: Ako nema CF tokena u browseru, STOP! Ne osvežavaj besomučno!
            if (!cfTokenAssertion) {
                console.error("⛔ [Anti-Loop Guard] CF_Authorization ne postoji u kolačićima. Prekidam izvršavanje da sprečim loop.");

                root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
                document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No Cloudflare Access token." } }));

                // Prikazujemo statičnu poruku korisniku umesto loop-a
                const tbody = document.getElementById('users-table-body');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center" style="padding: 60px 20px;">
                                <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Niste autentifikovani na Cloudflare Access nivou.</div>
                                <button onclick="window.location.href='https://api.selection.rs/api/me?returnTo=${encodeURIComponent(window.location.href)}'" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #d4b483; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Iniciraj Cloudflare Login</button>
                            </td>
                        </tr>`;
                }
                return null;
            }

            // 2. AKO TOKEN POSTOJI, IDEMO NA EKSPLICITNU RAZMENU
            console.log("🚀 [Token Bridge] Token pronađen. Pokrećem eksplicitnu razmenu...");

            try {
                const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ cfToken: cfTokenAssertion })
                });

                if (exchangeRes.ok) {
                    console.log("🟢 Razmena uspešna. Kolačić postavljen. Radim re-entry...");
                    // Čist, kontrolisani re-entry
                    return await bootstrapAdmin();
                } else {
                    console.error("❌ Kapija je odbila CF token na /api/auth/exchange.");
                }
            } catch (exchangeError) {
                console.error("❌ Greška na mreži tokom razmene:", exchangeError.message);
            }

            // Fallback ako exchange propadne - stopiramo loop i dajemo dugme za ručni reset
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 40px;">
                            <div style="color: var(--text-muted); margin-bottom: 15px;">Razmena autorizacije nije uspela.</div>
                            <button onclick="window.location.reload()" class="btn-reconnect" style="background:#0070f3; color:#fff; padding: 8px 16px; border:none; border-radius:4px; cursor:pointer;">Pokušaj ponovo</button>
                        </td>
                    </tr>`;
            }
            return null;
        }

        root.setAttribute("data-status", AUTH_STATE.ERROR);
        console.error("💥 SYSTEM FATAL ERROR:", err.message);
        return null;
    }
}

// Pokretač
bootstrapAdmin();