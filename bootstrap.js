// SELECTION MASTER CONTROL PLANE — Bootstrap Engine (V3.1.1 - Loop Breaker)
const API_BASE = "https://shell.selection.rs";

export async function bootstrapAdmin() {
    const root = document.getElementById("selection-admin-root") || document.body;
    const identityBadge = document.getElementById('admin-identity');

    root.setAttribute("data-status", "loading");

    try {
        console.log("🛡️ [Master Bootstrap] Proveravam mrežne kapacitete na Edge-u...");

        const response = await fetch(`${API_BASE}/api/me`, {
            method: 'GET',
            credentials: "include" // Ključno za CORS kolačiće sa shell.selection.rs
        });

        if (response.status === 403) {
            root.setAttribute("data-status", "forbidden");
            prikažiEkranZabrane();
            throw new Error("MASTER_ROLE_REQUIRED");
        }

        // 🛠️ PREKID LOOP-A: Ako je 401, ne radimo reload odmah, nego ispisujemo poruku da se vidi status
        if (response.status === 401) {
            root.setAttribute("data-status", "unauthorized");
            console.warn("⚠️ Sesija nevažeća na centralnom ruteru.");
            prikažiEkranPrijave();
            return null;
        }

        if (!response.ok) {
            root.setAttribute("data-status", "error");
            prikažiEkranKvara(response.status);
            throw new Error(`BOOTSTRAP_FAILED_HTTP_${response.status}`);
        }

        const profile = await response.json();

        if (profile.role !== "master") {
            root.setAttribute("data-status", "forbidden");
            prikažiEkranZabrane();
            throw new Error("INVALID_ROLE_REJECTION");
        }

        root.setAttribute("data-status", "ready");

        if (identityBadge) {
            identityBadge.innerHTML = `👑 <span style="color: #fff; font-weight: 600;">${profile.email}</span>`;
            identityBadge.style.opacity = "1";
        }

        return Object.freeze(profile);

    } catch (err) {
        console.error("❌ Admin bootstrap hard fail:", err.message);
        return null;
    }
}

// Nova pomoćna funkcija koja lomi beskonačni reload
function prikažiEkranPrijave() {
    document.body.innerHTML = `
        <div style="min-height: 100vh; background-color: #0b0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 20px;">🔑</div>
            <h1 style="color: #d4b483; font-size: 20px; margin-bottom: 10px; font-weight: 500;">Cloudflare Access Sesija Istekla</h1>
            <p style="color: #7e8e9f; max-width: 450px; font-size: 13px; margin-bottom: 20px; line-height: 1.6;">
                Centralni ruter zahteva ponovnu verifikaciju vašeg administrativnog identiteta.
            </p>
            <button onclick="window.location.reload()" style="background-color: #d4b483; color: #0b0f14; border: none; padding: 10px 24px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 13px;">Autorizuj se</button>
        </div>
    `;
}



function prikažiEkranZabrane() {
    document.body.innerHTML = `
        <div style="min-height: 100vh; background-color: #0b0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; text-align: center; padding: 20px;">
            <div style="font-size: 50px; margin-bottom: 20px;">🚫</div>
            <h1 style="color: #ff453a; font-size: 22px; margin-bottom: 10px; letter-spacing: -0.5px; font-weight: 500;">Pristup Odbijen (403)</h1>
            <p style="color: #7e8e9f; max-width: 500px; font-size: 13px; line-height: 1.6;">
                Vaš nivo ovlašćenja ne dozvoljava pristup Master Control Plane sistemu.
            </p>
        </div>
    `;
}

function prikažiEkranKvara(status) {
    document.body.innerHTML = `
        <div style="min-height: 100vh; background-color: #0b0f14; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 20px;">🔒</div>
            <h1 style="color: #d4b483; font-size: 20px; margin-bottom: 10px; font-weight: 500;">Sistemsko održavanje u toku</h1>
            <p style="color: #7e8e9f; max-width: 450px; font-size: 13px; margin-bottom: 20px; line-height: 1.6;">
                Došlo je do prekida veze sa centralnim ruterom (Greška: ${status}). Pokušajte ponovo za nekoliko trenutaka.
            </p>
            <button onclick="window.location.reload()" style="background-color: #d4b483; color: #0b0f14; border: none; padding: 10px 24px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 13px;">Osveži</button>
        </div>
    `;
}