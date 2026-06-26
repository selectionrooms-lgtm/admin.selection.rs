// admin.selection.rs/bootstrap.js (V19.1.0 - Pure Cloudflare Access Native Bootstrap)
const API_BASE = "https://api.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;
    root.setAttribute("data-status", "loading");

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Proveravam potpisani Cloudflare Access identitet.");

        // 🛡️ Korak 2: Gađamo direktno centralni API mozak — browser sam šalje CF_Authorization kolačiće
        const res = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            credentials: 'include', // KLJUČNO: Omogućava prenos Access viza između poddomena
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(`📡 [2/4] Centralni API Gateway odgovorio sa HTTP statusom: ${res.status}`);

        // Ako nas je sačekao Cloudflare login izazov ili nemamo dozvolu
        if (res.status === 401 || res.status === 403) {
            throw new Error(`🔒 Nemate pravo pristupa Control Plane sloju (Status: ${res.status}).`);
        }

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

        // Gvozdena provera uloge na samom ulazu u klijentski panel
        if (finalIdentity.role !== "master") {
            throw new Error("Pristup odbijen: Vaš nalog nema Master administrativne privilegije.");
        }

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
        console.error("❌ CRITIČNI PREKID BOOTSTRAP-A:", err.message);
        root.setAttribute("data-status", "error");

        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--red-alert); padding:40px; font-weight:600;">💥 Inicijalizacija prekinuta: ${err.message}</td></tr>`;
        }
        return null;
    }
}