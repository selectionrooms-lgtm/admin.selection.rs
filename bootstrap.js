// admin.selection.rs/src/bootstrap.js (V19.0.0 - Token Acquisition Engine)
const API_BASE = "https://api.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root");
    if (!root) return null;
    root.setAttribute("data-status", "loading");

    try {
        console.log("🕵️‍♂️ [Bootstrap] Uzimam potpisani token sa klijentskog session servera...");

        // 1. Gađamo lokalnu Pages funkciju koja je pod Access štitom i koja nam vraća token
        const sessionRes = await fetch("/api/issue_session", { method: "GET" });

        if (!sessionRes.ok) {
            throw new Error(`Sistemska autorizacija neuspešna (Status: ${sessionRes.status})`);
        }

        const sessionData = await sessionRes.json();

        if (!sessionData.token) {
            throw new Error("Funkcija issue_session.js nije isporučila kriptografski token.");
        }

        // 🔥 KLJUČNI AMANDMAN: Skladištimo token u memoriju brauzera za control-plane!
        localStorage.setItem("selection_session_token", sessionData.token);
        console.log("🔑 [Bootstrap] Token uspešno deponovan u localStorage.");

        // 2. Sada sa tim tokenom u ruci idemo na centralni API Gateway
        console.log("🛡️ [Bootstrap] Verifikujem deponovanu vizu na centralnom API-ju...");
        const res = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${sessionData.token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            root.setAttribute("data-status", "forbidden");
            return null;
        }

        if (!res.ok) throw new Error(`API Gateway vratio status: ${res.status}`);

        const profile = await res.json();
        root.setAttribute("data-status", "ready");

        // Palimo gornji desni zlatni bedž
        const identityBadge = document.getElementById('admin-identity');
        if (identityBadge) {
            identityBadge.textContent = profile.email;
        }

        document.dispatchEvent(new CustomEvent('ShellProvisionalReady', { detail: profile }));
        return profile;

    } catch (err) {
        console.error("❌ Bootstrap prekid:", err);
        root.setAttribute("data-status", "error");
        return null;
    }
}