// admin.selection.rs/bootstrap.js (V19.0.1 - Advanced Forensic Diagnostic - Root Aligned)
const API_BASE = "https://api.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;
    root.setAttribute("data-status", "loading");

    try {
        console.log("🕵️‍♂️ [1/4] Pokrećem bootstrap... Gađam lokalni session server na: /api/issue_session");

        // Poziv ka Pages funkciji u functions/api/issue_session.js
        const sessionRes = await fetch("/api/issue_session", { method: "GET" });

        console.log(`📡 [2/4] Lokalni server odgovorio sa HTTP statusom: ${sessionRes.status}`);

        // Čitamo sirovi odgovor pre pretvaranja u JSON da vidimo šta se tačno dešava
        const rawText = await sessionRes.text();
        console.log("📄 [Sirovi tekst sa lokala]:", rawText);

        let sessionData;
        try {
            sessionData = JSON.parse(rawText);
        } catch (e) {
            throw new Error(`Lokalni endpoint nije vratio JSON, već sirovi tekst/HTML! Proveri functions logove.`);
        }

        if (sessionData.error) {
            throw new Error(`Lokalni proksi vratio grešku: ${sessionData.error}`);
        }

        if (!sessionData.token) {
            throw new Error("Funkcija issue_session.js uspešno izvršena, ali nije isporučila token.");
        }

        // Deponovanje iskovanog tokena u skladište brauzera
        localStorage.setItem("selection_session_token", sessionData.token);
        console.log("🔑 [3/4] Token uspešno zaključan u localStorage.");

        // Odlazak na centralni API Gateway sa potpisanim Bearer tokenom
        console.log("🛡️ [4/4] Šaljem potpisani Bearer token na centralni API Gateway...");
        const res = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${sessionData.token}`
            }
        });

        if (!res.ok) {
            const apiErrorText = await res.text();
            console.error(`🚨 Centralni API vratio grešku [${res.status}]:`, apiErrorText);
            throw new Error(`API_GATEWAY_FAIL_${res.status}`);
        }

        const profile = await res.json();
        root.setAttribute("data-status", "ready");

        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge && profile.identity) {
            identityBadge.textContent = profile.identity.email;
        }

        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: profile.identity }));
        return profile.identity;

    } catch (err) {
        console.error("❌ CRITIČNI PREKID BOOTSTRAP-A:", err.message);
        root.setAttribute("data-status", "error");

        // Ispisujemo grešku direktno unutar same tabele na ekranu za brzu vizuelnu proveru
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--red-alert); padding:40px;">💥 Inicijalizacija prekinuta: ${err.message}</td></tr>`;
        }
        return null;
    }
}