// admin/bootstrap.js (V26.0.6 - Production Hardened State Latch Engine)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

// 🔒 Inicijalizacija globalnog latch stanja na samom startu
window.__CF_BOOTSTRAP_STATE__ = null;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function safeFetch(url, token) {
    console.log("📡 [Network Plane] START FETCH:", url);

    try {
        const res = await fetch(url, {
            method: "GET",
            credentials: "include", // ⚡ Kolačići lete kroz cross-origin
            headers: {
                "Content-Type": "application/json",
                "x-source-token": token || "" // ⚡ Unifikovani čelični standard
            }
        });

        console.log("📡 [Network Plane] FETCH RESPONSE STATUS:", res.status);

        const text = await res.text();
        const cleanText = text.trim();

        // 🛡️ FORENZIČKA ZAŠTITA: Detekcija da li je Cloudflare WAF/Access vratio HTML stranicu umesto JSON-a
        const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html");
        if (looksLikeHtml) {
            throw new Error("HTML_FALLBACK_DETECTED");
        }

        if (res.status === 401 || res.status === 403) {
            throw new Error("API_STATUS_UNAUTHORIZED");
        }

        if (!res.ok) {
            throw new Error(`API_STATUS_${res.status}`);
        }

        try {
            return JSON.parse(cleanText);
        } catch {
            throw new Error("BAD_RESPONSE_FORMAT");
        }

    } catch (e) {
        console.error("❌ [Network Plane] FETCH CRASH:", e);
        throw e;
    }
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
        console.log("🔍 [Kernel] BOOT 02 identity cookie exists:", !!cfTokenAssertion);

        if (!cfTokenAssertion) {
            console.error("🔒 [Gatekeeper] CF_Authorization kolačić ne postoji u memoriji.");
            PrikaziRucniLoginUI();
            return null;
        }

        console.log("🔍 [Kernel] BOOT 03 before verification");
        const profile = await safeFetch(`${API_BASE}/api/me`, cfTokenAssertion);

        if (!profile || profile.success === false || !profile.identity) {
            throw new Error("API_STATUS_UNAUTHORIZED");
        }

        console.log("🟢 [Kernel] GATEKEEPER APPROVED - Admin uspešno autorizovan.");
        const finalIdentity = profile.identity;

        // 🧠 MEMORIJSKI LATCH: Zakucavamo stanje u globalni prozor PRE ispaljivanja signala!
        window.__CF_BOOTSTRAP_STATE__ = finalIdentity;
        window.CF_SOURCE_TOKEN = cfTokenAssertion;

        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        // Emitujemo event kao sekundarnu mrežnu notifikaciju za asinhroni lanac
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        console.log("[BOOT DONE] State latched successfully.");
        return finalIdentity;

    } catch (err) {
        console.error("🚨 [Kernel] BOOTSTRAP EXCEPTION:", err.message);
        root.setAttribute("data-status", AUTH_STATE.ERROR);

        PrikaziRucniLoginUI();

        const tbody = document.getElementById('users-table-body');
        if (tbody && err.message !== "API_STATUS_UNAUTHORIZED") {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
        }
        return null;
    }
}

function PrikaziRucniLoginUI() {
    const root = document.getElementById("selection-admin-root");
    if (root) {
        root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
    }

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

// Pokretanje procesa inicijalizacije
bootstrapAdmin();