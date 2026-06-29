// admin/bootstrap.js (V26.0.5 - Hardened State Latch Architecture)
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
    try {
        console.log("[FETCH START]", url);
        const res = await fetch(url, {
            method: "GET",
            credentials: "include", // Kolačići lete kroz cross-origin
            headers: {
                "Content-Type": "application/json",
                "x-source-token": token || ""
            }
        });

        console.log("[FETCH STATUS]", res.status);
        const text = await res.text();
        return { ok: res.ok, status: res.status, body: text };
    } catch (e) {
        console.error("[FETCH CRASH]", e);
        throw e;
    }
}

async function verifyIdentityAndGetProfile(token) {
    const profileResult = await safeFetch(`${API_BASE}/api/me`, token);
    if (!profileResult || !profileResult.ok) {
        throw new Error(`API_STATUS_UNAUTHORIZED_OR_FAILED_${profileResult?.status}`);
    }
    try {
        return JSON.parse(profileResult.body);
    } catch (parseErr) {
        throw new Error(`BAD_JSON_FORMAT_FROM_SERVER: ${profileResult.body}`);
    }
}

function PrikaziRucniLoginUI() {
    const root = document.getElementById("selection-admin-root");
    if (root) root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);
    document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));
}

export async function bootstrapAdmin() {
    try {
        console.log("[BOOT 01] start");
        const root = document.getElementById("selection-admin-root");
        if (root) root.setAttribute("data-status", AUTH_STATE.LOADING);

        const token = getCookie("CF_Authorization");
        console.log("[BOOT 02] identity cookie exists:", !!token);

        if (!token) {
            console.log("[BOOT STOP] no token cookie found");
            PrikaziRucniLoginUI();
            return null;
        }

        console.log("[BOOT 03] before me");
        const profile = await verifyIdentityAndGetProfile(token);

        if (!profile || profile.success === false || !profile.identity) {
            throw new Error("API_STATUS_UNAUTHORIZED");
        }

        console.log("🟢 [Kernel] GATEKEEPER APPROVED - Admin autorizovan.");
        const finalIdentity = profile.identity;

        // 🧠 MEMORIJSKI LATCH: Zakucavamo stanje u globalni prozor PRE ispaljivanja signala!
        window.__CF_BOOTSTRAP_STATE__ = finalIdentity;
        window.CF_SOURCE_TOKEN = token;

        if (root) root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);
        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        // Emitujemo event kao sekundarnu mrežnu notifikaciju
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        console.log("[BOOT DONE] State latched successfully.");
        return finalIdentity;

    } catch (e) {
        const root = document.getElementById("selection-admin-root");
        if (root) root.setAttribute("data-status", AUTH_STATE.ERROR);
        PrikaziRucniLoginUI();
        console.error("[BOOT FATAL]", e, e?.stack);
        debugger;
        return null;
    }
}

bootstrapAdmin();