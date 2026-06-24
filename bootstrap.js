// SELECTION MASTER CONTROL PLANE — Bootstrap Engine (V3.1.0)
const API_BASE = "https://shell.selection.rs";

export async function bootstrapAdmin() {
    // Presrećemo root štit pre bilo kakvog vizuelnog trzanja ekrana
    const root = document.getElementById("selection-admin-root") || document.body;
    const identityBadge = document.getElementById('admin-identity');

    root.setAttribute("data-status", "loading");

    try {
        console.log("🛡️ [Master Bootstrap] Proveravam mrežne kapacitete na Edge-u...");

        const response = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            credentials: "include" // Osigurava da kolačići lete kroz CORS tunel
        });

        // 403: Cloudflare Access te pustio, ali Shell kaže da nisi Master
        if (response.status === 403) {
            root.setAttribute("data-status", "forbidden");
            prikažiEkranZabrane();
            throw new Error("MASTER_ROLE_REQUIRED");
        }

        // 401: Cloudflare Access sesija je nevažeća ili je istekla
        if (response.status === 401) {
            root.setAttribute("data-status", "unauthorized");
            console.warn("⚠️ Sesija prekinuta. Preusmeravam na Cloudflare Access kapiju...");
            window.location.reload(); // Access sam presreće osvežavanje i traži PIN
            return null;
        }

        // 500 ili bilo koji drugi sistemski kvar na mreži
        if (!response.ok) {
            root.setAttribute("data-status", "error");
            prikažiEkranKvara(response.status);
            throw new Error(`BOOTSTRAP_FAILED_HTTP_${response.status}`);
        }

        const profile = await response.json();

        // Dvostruki bezbednosni štit za ulogu
        if (profile.role !== "master") {
            root.setAttribute("data-status", "forbidden");
            prikažiEkranZabrane();
            throw new Error("INVALID_ROLE_REJECTION");
        }

        // 🔓 SVE JE ČISTO: Otključavamo panel
        root.setAttribute("data-status", "ready");

        if (identityBadge) {
            identityBadge.innerHTML = `👑 <span style="color: #fff; font-weight: 600;">${profile.email}</span>`;
            identityBadge.style.opacity = "1";
        }

        // Vraćamo zamrznuti, nepromenljivi profil (Imutabilni DTO)
        return Object.freeze(profile);

    } catch (err) {
        console.error("❌ Admin bootstrap hard fail:", err.message);
        return null;
    }
}

// Minimalni vizuelni generatori u slučaju blokade
function prikažiEkranZabrane() {
    document.body.innerHTML = `
        <div style="min-height: 100vh; background-color: #0b0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; color: #fff; text-align: center; padding: 20px;">
            <div style="font-size: 60px; margin-bottom: 20px;">🚫</div>
            <h1 style="color: #ff453a; font-size: 24px; margin-bottom: 10px; letter-spacing: -0.5px;">Pristup Odbijen (403)</h1>
            <p style="color: #7e8e9f; max-width: 500px; font-size: 14px; line-height: 1.6;">
                Vaš nivo ovlašćenja ne dozvoljava pristup Master Control Plane sistemu.
            </p>
        </div>
    `;
}

function prikažiEkranKvara(status) {
    document.body.innerHTML = `
        <div style="min-height: 100vh; background-color: #0b0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; color: #fff; text-align: center; padding: 20px;">
            <div style="font-size: 50px; margin-bottom: 20px;">🔒</div>
            <h1 style="color: #d4b483; font-size: 22px; margin-bottom: 10px;">Sistemsko održavanje u toku</h1>
            <p style="color: #7e8e9f; max-width: 450px; font-size: 14px; margin-bottom: 20px;">
                Došlo je do prekida veze sa centralnim ruterom (Kod greške: ${status}). Pokušajte ponovo za nekoliko trenutaka.
            </p>
            <button onclick="window.location.reload()" style="background-color: #d4b483; color: #0b0f14; border: none; padding: 10px 24px; font-weight: 600; border-radius: 6px; cursor: pointer;">Osveži</button>
        </div>
    `;
}