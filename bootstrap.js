// admin/bootstrap.js (V25.3.0 - Unified Direct API Gateway Alignment)
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
        credentials: "include", // Šalje __Secure-selection_session automatski
        headers: { "Content-Type": "application/json" }
    });

    // Sprečavamo krah ako Cloudflare ili Nginx vrate HTML error stranicu umesto JSON-a
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

        // Direktno pitamo SSOT bez lokalnog čitanja document.cookie
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
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
            document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));

            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 60px 20px;">
                            <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Vaša sesija je istekla ili niste autorizovani.</div>
                            <button onclick="window.location.replace('https://api.selection.rs/api/me')" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 4px 14px rgba(0,112,243,0.3);">Ponovo poveži nalog</button>
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

// Inicijalni korenski okidač
bootstrapAdmin();