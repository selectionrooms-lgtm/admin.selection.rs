// admin/bootstrap.js (V25.5.6 - Hardened Explicit Recovery Engine)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

// Komentar: Pomoćna funkcija za asinhronu pauzu (daje browseru vreme da zapiše kolačić)
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function safeFetch(url) {
    console.log("📡 [Network] START FETCH:", url);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include", // Automatski prenosi __Secure-selection_session kolačić
        headers: { "Content-Type": "application/json" }
    });

    console.log("📡 [Network] FETCH RESPONSE STATUS:", res.status);

    const text = await res.text();
    const cleanText = text.trim();
    const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html");

    if (looksLikeHtml) {
        throw new Error("HTML_FALLBACK_DETECTED");
    }

    // Komentar: Ako je 401, proveri da li je odgovor zapravo JSON sa AUTH_REQUIRED strukturom
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
    console.count("🔍 [Kernel] BOOTSTRAP_EXECUTION_COUNT");

    const root = document.getElementById("selection-admin-root");
    if (!root) {
        console.error("⛔ [Kernel] Root element fali u DOM-u.");
        return null;
    }

    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        const profile = await safeFetch(`${API_BASE}/api/me`);

        // Komentar: Provera unutrašnje strukture odgovora
        if (!profile || profile.success === false) {
            throw new Error("API_STATUS_401");
        }

        console.log("🟢 [Kernel] FETCH DONE - Uspešna autorizacija.");

        const finalIdentity = profile.identity || profile;
        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) identityBadge.textContent = finalIdentity.email;

        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        console.error("🚨 [Kernel] AUTH DEBUG CATCH:", err.message);

        if (err.message === "API_STATUS_401" || err.message === "HTML_FALLBACK_DETECTED") {
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);

            // 1. Čitamo Cloudflare Access token koji je urezan na nivou .selection.rs domena
            const cfTokenAssertion = document.cookie.match(/CF_Authorization=([^;]+)/)?.[1];

            if (!cfTokenAssertion) {
                console.error("🔒 [Recovery Path] CF_Authorization kolačić ne postoji unutar browser memorije.");
                PrikaziRucniLoginUI();
                return null;
            }

            console.log("🚀 [Recovery Path] Token pronađen. Šaljem eksplicitno na /api/auth/exchange...");

            try {
                const exchangeRes = await fetch(`${API_BASE}/api/auth/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include", // Ključno: Omogućava primanje Set-Cookie sa API-ja
                    body: JSON.stringify({ cfToken: cfTokenAssertion })
                });

                if (exchangeRes.ok) {
                    console.log("🟢 [Recovery Success] Sesija uspešno iskovana preko razmnoživača! Čekam stabilizaciju...");

                    // Komentar: Dajemo browseru tačno 150ms predaha da bezbedno upiše kolačić u skladište poddomena
                    await sleep(150);

                    // Ponovo pokrećemo bootstrap, sada imamo spreman i urezan kolačić
                    return await bootstrapAdmin();
                } else {
                    console.error("❌ API kapija je odbila eksplicitnu razmenu tokena.");
                    PrikaziRucniLoginUI();
                }
            } catch (exErr) {
                console.error("❌ Mrežni krah tokom exchange oporavka:", exErr.message);
                PrikaziRucniLoginUI();
            }
            return null;
        }

        root.setAttribute("data-status", AUTH_STATE.ERROR);
        const tbody = document.getElementById('users-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
        return null;
    }
}

function PrikaziRucniLoginUI() {
    document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "No active session." } }));
    const tbody = document.getElementById('users-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 60px 20px;">
                    <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">🔒 Vaša sesija je istekla ili niste autorizovani.</div>
                    <button onclick="window.location.href='https://api.selection.rs/api/me?returnTo=${encodeURIComponent(window.location.href)}'" class="btn-reconnect" style="display: inline-block; padding: 10px 20px; background: #d4b483; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Poveži nalog preko Cloudflare Access-a</button>
                </td>
            </tr>`;
    }
}

// Jedini korenski okidač pri učitavanju fajla
bootstrapAdmin();