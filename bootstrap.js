// admin.selection.rs/bootstrap.js (V22.0.0 - Production Ready / HTML-Safe Inspected Engine)
const API_BASE = "https://api.selection.rs";

// 🪐 SSOT AUTH STATE MACHINE
export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

/**
 * 🛡️ SAFE FETCH GVOZDENI PRESRETAČ (HTML & STRING PROVERA):
 * Čita sirovi tekst i detektuje Cloudflare Access HTML login blokade na samom ulazu.
 * Osigurava stoprocentnu stabilnost pre nego što se pokrene JSON parser.
 */
async function safeFetch(url) {
    const res = await fetch(url, {
        method: "GET",
        credentials: "include", // Ključno za prenos kolačića unutar CORS-a
        headers: {
            "Content-Type": "application/json"
        }
    });

    // Izvlačimo sirovi tekst zahteva za inspekciju tela
    const text = await res.text();

    // ❌ Detekcija strukture: Ako Cloudflare Access baci HTML login stranu umesto JSON-a
    const looksLikeHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");
    if (looksLikeHtml) {
        throw new Error("NO_AUTH_SESSION");
    }

    // Eksplicitne HTTP zabrane sa mreže ili rutera
    if (res.status === 401 || res.status === 403) {
        throw new Error("NO_AUTH_SESSION");
    }

    // Pokušaj JSON parsovanja tek nakon što su sve kontrole prošle
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error("BAD_RESPONSE_FORMAT");
    }

    return data;
}

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;

    // Inicijalno stanje mašine: Loading
    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Provera identiteta kroz HTML-safe prozor.");

        // 🚨 KLJUČNI POZIV — safeFetch sam kontroliše strukturu i vraća parsovan JSON
        const profile = await safeFetch(`${API_BASE}/api/me`);

        console.log(`📡 [2/4] Centralni API Gateway uspešno odgovorio sa ispravnim JSON formatom.`);

        const finalIdentity = profile.identity || profile;

        if (!finalIdentity || !finalIdentity.email) {
            throw new Error("BAD_PROFILE_STRUCTURE");
        }

        console.log("🔑 [3/4] Identitet uspešno verifikovan i potvrđen od strane D1 jezgra.");

        // Uspešna tranzicija mašine u AUTHENTICATED
        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) {
            identityBadge.textContent = finalIdentity.email;
        }

        console.log(`🛡️ [4/4] Inicijalizacija uspešna. Dobrodošao nazad, ${finalIdentity.email}`);
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        console.warn("⚠️ [State Machine Transition] Prekid inicijalizacije.");

        // 🚨 DVA SVETA U CATCH BLOKU — SVEDENO NA MAKSIMALNU DISCIPLINU
        if (err.message === "NO_AUTH_SESSION") {

            // STANJE 1: Čist Unauthenticated, bez rušenja UI-ja sa crvenim greškama
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);

            document.dispatchEvent(new CustomEvent('ShellAuthLost', {
                detail: { reason: "Cloudflare Access session missing, expired or returned HTML." }
            }));

            // Tihi vizuelni render dugmeta za ručni reconnect na frontend entry point
            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 60px 20px;">
                            <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">
                                🔒 Vaša sesija je istekla ili nije sinhronizovana na API ivici.
                            </div>
                            <button onclick="window.location.href = window.location.origin" 
                                    class="btn-reconnect" 
                                    style="display: inline-block; padding: 10px 20px; background: var(--accent-color, #0070f3); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 4px 14px rgba(0,112,243,0.3);">
                                 Ponovo poveži nalog (Reconnect)
                            </button>
                        </td>
                    </tr>
                `;
            }
            return null;
        }

        // STANJE 2: Pravi sistemski krah (Baza down, loš kôd, prekinut strim, ili BAD_RESPONSE_FORMAT)
        root.setAttribute("data-status", AUTH_STATE.ERROR);
        console.error("💥 SYSTEM FATAL ERROR:", err.message);

        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
        }

        return null;
    }
}