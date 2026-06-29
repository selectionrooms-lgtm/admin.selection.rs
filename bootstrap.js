// admin/bootstrap.js (V26.0.7 - Sovereign State Latch Fetcher)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

// 🔒 Inicijalizacija globalnog latch stanja na samom startu za control-plane
window.__CF_BOOTSTRAP_STATE__ = null;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export async function bootstrapAdmin() {
    console.count("🔍 [Kernel] BOOTSTRAP_EXECUTION_COUNT");

    const root = document.getElementById("selection-admin-root");
    if (!root) {
        console.error("⛔ [Kernel] Root element fali u DOM-u.");
        return null;
    }

    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        const cfTokenAssertion = getCookie("CF_Authorization");
        console.log("🔍 [Kernel] CF_Authorization token prepoznat u klijentu:", !!cfTokenAssertion);

        if (!cfTokenAssertion) {
            console.error("🔒 [Gatekeeper] CF_Authorization kolačić ne postoji. Preusmeravam na login.");
            PrikaziRucniLoginUI();
            return null;
        }

        console.log("📡 [Network Plane] START FETCH -> /api/me");
        const res = await fetch(`${API_BASE}/api/me`, {
            method: "GET",
            credentials: "include", // Kolačići lete cross-origin automatski
            headers: {
                "Content-Type": "application/json",
                "x-source-token": cfTokenAssertion // Dupla sigurnosna šina za cross-domain
            }
        });

        console.log("📡 [Network Plane] RESPONSE STATUS:", res.status);
        const text = await res.text();
        const cleanText = text.trim();

        // Provera WAF/Access HTML presretanja
        if (cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html")) {
            throw new Error("HTML_FALLBACK_DETECTED");
        }

        if (!res.ok) {
            throw new Error(`API_STATUS_${res.status}`);
        }

        const profile = JSON.parse(cleanText);
        if (!profile || profile.success === false || !profile.identity) {
            throw new Error("D1_IDENTITY_REJECTION");
        }

        console.log("🟢 [Kernel] D1 SUVERENI IDENTITET ODOBREN:", profile.identity.email);
        const finalIdentity = profile.identity;

        // 🧠 STATE LATCH ZAKUCAVANJE: Čeka spreman control-plane.js
        window.__CF_BOOTSTRAP_STATE__ = finalIdentity;
        window.CF_SOURCE_TOKEN = cfTokenAssertion;

        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        // Okidamo signal za asinhroni front lanac
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        console.error("🚨 [Kernel] BOOTSTRAP EXCEPTION:", err.message);
        root.setAttribute("data-status", AUTH_STATE.ERROR);
        PrikaziRucniLoginUI();
        return null;
    }
}

function PrikaziRucniLoginUI() {
    const root = document.getElementById("selection-admin-root");
    if (root) root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);

    document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));
    const tbody = document.getElementById('users-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 60px 20px;">
                    <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Vaša sesija je istekla ili nemate Master pristup bazi.</div>
                    <button onclick="window.location.href='https://admin.selection.rs'" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #d4b483; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Poveži nalog preko Cloudflare Access-a</button>
                </td>
            </tr>`;
    }
}

bootstrapAdmin();