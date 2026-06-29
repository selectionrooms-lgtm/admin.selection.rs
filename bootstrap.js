// admin/bootstrap.js (V26.0.3 - Cookie Transport & Zero-Preflight Architecture)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// 📡 Izolovani mrežni izvršilac sa Cookie podrškom
async function safeFetch(url) {
    try {
        console.log("[FETCH START]", url);
        console.log("[COOKIE PRESENT]", document.cookie.includes("CF_Authorization"));

        const res = await fetch(url, {
            method: "GET",
            // ⚡ KLJUČNA PROMENA: Dozvoljavamo prenos kolačića kroz cross-origin
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
                // NEMA x-source-token zaglavlja! CORS preflight eliminisan!
            }
        });

        console.log("[FETCH STATUS]", res.status);

        const text = await res.text();
        console.log("[FETCH BODY]", text);

        return {
            ok: res.ok,
            status: res.status,
            body: text
        };

    } catch (e) {
        console.error("[FETCH CRASH]", e);
        throw e;
    }
}

function getIdentity() {
    return getCookie("CF_Authorization");
}

async function verifyIdentityAndGetProfile() {
    const profileResult = await safeFetch(`${API_BASE}/api/me`);

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

export async function bootstrapAdmin() {
    try {
        console.log("[BOOT 01] start");

        const root = document.getElementById("selection-admin-root");
        if (root) root.setAttribute("data-status", AUTH_STATE.LOADING);

        const token = await getIdentity();
        console.log("[BOOT 02] identity cookie exists:", !!token);

        if (!token) {
            console.log("[BOOT STOP] no token cookie found");
            PrikaziRucniLoginUI();
            return;
        }

        console.log("[BOOT 03] before me");

        const me = await verifyIdentityAndGetProfile();

        console.log("[BOOT 04] me", me);

        if (me && (me.success || me.reached)) {
            if (root) root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);
            const identityBadge = document.getElementById('admin-identity');
            if (identityBadge) identityBadge.textContent = "Test Reached Mode";

            window.CF_SOURCE_TOKEN = token;
            document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: { email: "test@selection.rs" } }));
        }

        console.log("[BOOT DONE]");

    } catch (e) {
        const root = document.getElementById("selection-admin-root");
        if (root) root.setAttribute("data-status", AUTH_STATE.ERROR);

        PrikaziRucniLoginUI();
        console.error("[BOOT FATAL]", e, e?.stack);
        debugger;
    }
}

bootstrapAdmin();