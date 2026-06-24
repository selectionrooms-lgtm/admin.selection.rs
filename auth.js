// SELECTION MASTER CONTROL PLANE — Auth Engine (V2.0.0)
const API_BASE = "https://shell.selection.rs";

export async function verifyIdentityAndGetProfile() {
    const identityBadge = document.getElementById('admin-identity');

    try {
        console.log("🛡️ [Master Auth] Ispitujem mrežni identitet preko centralnog Shell-a...");

        // Gađamo direktno naš novi, armirani /get_user endpoint.
        // Pošto smo podesili CORS credentials i Access, brauzer sam šalje Cf-Access-Jwt-Assertion.
        const res = await fetch(`${API_BASE}/get_user`, {
            method: 'GET'
        });

        if (!res.ok) {
            throw new Error(`Mrežna kapija vratila status: ${res.status}`);
        }

        const userData = await res.json();
        if (!userData.ok || !userData.user) {
            throw new Error(userData.error || "Nevalidan odgovor Identity Kernela.");
        }

        const identity = userData.user;

        // 🛑 GVOZDENA KONTROLA ZA MASTER PANEL: Samo "master" uloga ovde sme da upravlja
        if (identity.role !== "master") {
            console.error("🚨 Sigurnosni proboj: Pokušaj pristupa Master panelu sa neadekvatnom ulogom!");
            document.body.innerHTML = `
                <div style="min-height: 100vh; background-color: #0a0a0a; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; color: #fff; text-align: center; padding: 20px;">
                    <div style="font-size: 60px; margin-bottom: 20px;">🚫</div>
                    <h1 style="color: #ff453a; font-size: 24px; margin-bottom: 10px; letter-spacing: -0.5px;">Pristup Odbijen (403)</h1>
                    <p style="color: #8e8e93; max-width: 500px; font-size: 14px; line-height: 1.6;">
                        Identitet <strong>${identity.email}</strong> uspešno proveren na Edge čvoru, ali vaš nivo ovlašćenja (${identity.role}) ne dozvoljava pristup Master Control Plane sistemu.
                    </p>
                </div>
            `;
            return null;
        }

        // 👑 USPEŠAN PROLAZ: Ti si master i sve je čisto
        console.log(`👑 Dobrodošao nazad, Master! [Epoch: ${identity.epoch}]`);

        if (identityBadge) {
            identityBadge.innerHTML = `👑 <span style="color: var(--gold); font-weight: 600;">${identity.email}</span>`;
            identityBadge.style.visibility = "visible";
            identityBadge.style.opacity = "1";
        }

        // Keširamo u lokalni storage radi brzog vizuelnog učitavanja kod osvežavanja
        localStorage.setItem('master_email', identity.email);
        return identity;

    } catch (err) {
        console.error("❌ Kvar na Identity Gateway-u Master Panela:", err.message);

        if (identityBadge) {
            identityBadge.innerHTML = `<span style="color: var(--red-alert);">🚨 Greška Autentifikacije</span>`;
        }

        // Prikazujemo elegantan lock-screen ako mreža skroz pukne ili istekne Cloudflare sesija
        document.body.innerHTML = `
            <div style="min-height: 100vh; background-color: #0a0a0a; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; color: #fff; text-align: center; padding: 20px;">
                <div style="font-size: 50px; margin-bottom: 20px;">🔒</div>
                <h1 style="color: var(--gold); font-size: 22px; margin-bottom: 10px; font-weight: 500;">Sesija Prekinuta</h1>
                <p style="color: #8e8e93; max-width: 450px; font-size: 14px; margin-bottom: 20px;">
                    Nije moguće verifikovati vaš mrežni potpis. Osvežite stranicu ili proverite Cloudflare Access sesiju.
                </p>
                <button onclick="window.location.reload()" style="background-color: var(--gold); color: #000; border: none; padding: 10px 20px; font-weight: 500; border-radius: 6px; cursor: pointer;">Osveži Vezu</button>
            </div>
        `;
        return null;
    }
}