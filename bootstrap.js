// admin.selection.rs/bootstrap.js (V20.0.0 - State Machine & Fault-Tolerant Edge Bootstrap)
const API_BASE = "https://api.selection.rs";

// 🪐 SSOT AUTH STATE MACHINE
export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

/**
 * ⚡ ATOMSKI RETRY MEHANIZAM: Amortizuje propagaciju i kašnjenje sesije na Cloudflare Edge čvorovima.
 * Ako mreža pukne ili Access privremeno ne prepozna kolačić, sistem vrši re-try pre proglašenja kapitulacije.
 */
async function retryFetch(url, attempts = 3, delayMs = 600) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Obavezno slanje kolačića unutar CORS-a
                headers: {
                    "Content-Type": "application/json"
                }
            });

            // Ako je Cloudflare Access pustio zahtev i ruter vratio uspeh, vraćamo odgovor odmah
            if (res.ok) return res;

            // Ako dobijemo eksplicitan 401/403 sa mreže, nema potrebe da čekamo retry, sesija je definitivno mrtva
            if (res.status === 401 || res.status === 403) {
                throw new Error("EXPLICIT_UNAUTHORIZED");
            }

        } catch (e) {
            // Ako je došlo do mrežnog kraha (Access 302 blokada) ili privremenog timeout-a, nastavljamo petlju
            if (e.message === "EXPLICIT_UNAUTHORIZED") throw e;
            console.warn(`⏳ [Retry Engine] Pokušaj ${i + 1}/${attempts} neuspešan. Rekonstrukcija veze za ${delayMs}ms...`);
        }

        // Čekanje pre sledećeg pokušaja
        await new Promise(r => setTimeout(r, delayMs));
    }

    throw new Error("AUTH_TIMEOUT");
}

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;

    // Postavljanje inicijalnog stanja mašine
    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Aktiviram fault-tolerant ruter skeniranje.");

        // 🛡️ Pokrećemo elastični fetch umesto direktnog poziva
        const res = await retryFetch(`${API_BASE}/api/me`);

        console.log(`📡 [2/4] Centralni API Gateway uspešno odgovorio sa HTTP statusom: ${res.status}`);

        const profile = await res.json();
        const finalIdentity = profile.identity || profile;

        if (!finalIdentity || !finalIdentity.email) {
            throw new Error("BAD_PROFILE_STRUCTURE");
        }

        console.log("🔑 [3/4] Identitet uspešno verifikovan i potvrđen od strane D1 jezgra.");

        // Tranzicija mašine u AUTHENTICATED
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

        if (err.message === "EXPLICIT_UNAUTHORIZED" || err.message === "AUTH_TIMEOUT") {
            // ❌ NEMA ČEKANJA: Mašina momentalno prelazi u UNAUTHENTICATED
            root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);

            document.dispatchEvent(new CustomEvent('ShellAuthLost', {
                detail: { reason: "Cloudflare Access session missing or expired." }
            }));

            // 🧱 RENDERUJEMO LOGIN CTA / RECONNECT DUGME DIREKTNO U UI KOSTUR
            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 60px 20px;">
                            <div style="margin-bottom: 20px; font-weight: 600; color: var(--text-muted);">
                                🔒 Vaša sesija je istekla ili nije sinhronizovana na API ivici.
                            </div>
                            <a href="${API_BASE}/cdn-cgi/access/login?redirect_url=${encodeURIComponent(window.location.href)}" 
                               class="btn-reconnect" 
                               style="display: inline-block; padding: 10px 20px; background: var(--accent-color, #0070f3); color: #fff; border-radius: 6px; text-decoration: none; font-weight: 500; box-shadow: 0 4px 14px rgba(0,112,243,0.3);">
                                Ponovo poveži nalog (Reconnect)
                            </a>
                        </td>
                    </tr>
                `;
            }
        } else {
            // Kritične sistemske greške (npr. D1 baza nedostupna, loš JSON format)
            root.setAttribute("data-status", AUTH_STATE.ERROR);
            console.error("💥 KRITIČNI KRAH SISTEMA:", err.message);

            const tbody = document.getElementById('users-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Fatalna greška jezgra: ${err.message}</td></tr>`;
            }
        }

        return null;
    }
}