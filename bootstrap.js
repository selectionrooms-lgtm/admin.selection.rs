// admin.selection.rs/bootstrap.js (V19.2.0 - Decoupled Access Native Bootstrap)
const API_BASE = "https://api.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;
    root.setAttribute("data-status", "loading");

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Proveravam potpisani Cloudflare Access identitet.");

        // 🛡️ Gađamo direktno centralni API mozak — browser sam šalje CF_Authorization kolačiće
        const res = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            credentials: 'include', // KLJUČNO: Omogućava prenos Access viza između poddomena
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(`📡 [2/4] Centralni API Gateway odgovorio sa HTTP statusom: ${res.status}`);

        if (!res.ok) {
            const apiErrorText = await res.text();
            console.error(`🚨 Centralni API vratio grešku [${res.status}]:`, apiErrorText);
            throw new Error(`API_GATEWAY_FAIL_${res.status}`);
        }

        const profile = await res.json();

        // Izvlačimo identity bezbedno na osnovu novog ravnog formata sa API-ja
        const finalIdentity = profile.identity || profile;

        if (!finalIdentity || !finalIdentity.email) {
            throw new Error("Sistem je overio token, ali profil ne sadrži validne podatke o identitetu.");
        }

        // ❌ UKLONJENO: "if (finalIdentity.role !== 'master')" -> Frontend više ne donosi security odluke.
        // API (baza/ruter) je jedina vrhovna istina i on je već morao da odbije zahtev ako uloga ne valja.

        console.log("🔑 [3/4] Identitet uspešno verifikovan i potvrđen od strane D1 jezgra.");
        root.setAttribute("data-status", "ready");

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) {
            identityBadge.textContent = finalIdentity.email;
        }

        console.log(`🛡️ [4/4] Inicijalizacija uspešna. Dobrodošao nazad, ${finalIdentity.email}`);
        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: finalIdentity }));
        return finalIdentity;

    } catch (err) {
        // 🔥 CATCH KAO SOURCE OF TRUTH (Amortizuje mrežne prekide i Cloudflare Access 302 skokove)
        const isLikelyAuth = true;

        console.warn("SESSION STATE UNKNOWN:", err);

        root.setAttribute("data-status", "unauthenticated");

        document.dispatchEvent(new CustomEvent('ShellAuthLost', {
            detail: { reason: err.message }
        }));

        // Punjenje tabele se vrši tiho kao vizuelni fallback
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:40px; font-weight:600;">🔒 Sesija nije prepoznata. Čekam autorizaciju na API sloju...</td></tr>`;
        }

        return null;
    }
}