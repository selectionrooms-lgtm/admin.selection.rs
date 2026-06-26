// SELECTION CONTROL PLANE — admin-core.js (V4.6.0 - Anti-Race Condition Grounded)
import { bootstrapAdmin } from './bootstrap.js';

const API_BASE = "https://api.selection.rs";

// 🧠 Globalni kontekst aplikacije (RAM keš i identitet)
let trenutnoUlogovaniKorisnik = null;
let sviKorisniciKes = [];

/**
 * 🪐 USTAVNI TRANSPORT: Potpuno izbačen stari Bearer/JWT šum.
 * Oslanjamo se isključivo na credentials: 'include' jer browser sam lepi Selection kolačiće.
 */
export async function studioFetch(url, options = {}) {
    options.headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    // Gvozdeni uslov za prenos autentifikacionih kolačića na api.selection.rs domenu
    options.credentials = 'include';

    try {
        const response = await fetch(url, options);

        if (response.status === 401 || response.status === 403) {
            console.warn("🚨 [Security Shield] Saas kapija prekinula sesiju (401/403). Redirekcija...");
            alert("🔒 Vaša administrativna sesija je istekla ili nemate Master privilegije.");
            window.location.href = "https://selection.rs";
            throw new Error("Unauthorized_Bypass_Blocked");
        }

        return response;
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") throw e;
        console.error("❌ [Network Crash]:", e.message);
        throw e;
    }
}

/**
 * 🛡️ ZAUSTAVLJANJE RACE CONDITION-A
 * Aplikacija ne sme da puca u prazno. Slušamo proglas iz bootstrap-a 
 * i tek po uspešnoj verifikaciji identiteta otvaramo komandnu stanicu.
 */
document.addEventListener('ShellProvisionalReady', async (event) => {
    trenutnoUlogovaniKorisnik = event.detail;
    console.log("🚀 [Control Plane] Signal primljen! Identitet verifikovan na ivici mreže:", trenutnoUlogovaniKorisnik.email);

    initControlPlane();
});

function initControlPlane() {
    console.log("🎮 [Control Plane] Komandna stanica aktivirana u punom kapacitetu.");

    const identityBadge = document.getElementById('admin-identity');
    if (identityBadge && trenutnoUlogovaniKorisnik) {
        identityBadge.textContent = trenutnoUlogovaniKorisnik.email;
    }

    // Pokrećemo punjenje tabela i vezivanje osluškivača tek kada imamo gvozdenu sesiju
    osveziMasterTabeluKorisnika();
    setupEventListeners();
}

function setupEventListeners() {
    const form = document.getElementById('provision-form');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }

    // 🔍 Osluškivač za brzu pretragu unutar input polja (Čita direktno iz RAM keša)
    const searchInput = document.getElementById('master-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const pojam = e.target.value.toLowerCase().trim();

            const filtriraniKorisnici = sviKorisniciKes.filter(k => {
                const emailMec = k.email ? k.email.toLowerCase().includes(pojam) : false;
                const phoneMec = k.phone ? k.phone.toLowerCase().includes(pojam) : false;
                return emailMec || phoneMec;
            });

            renderujTabelu(filtriraniKorisnici);
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    await masterKreirajNovogKorisnika();
}

async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center" style="color: var(--gold); padding: 40px; font-weight:500;">
                ⚡ Povezujem se na D1 relej, povlačim stanje iz čekaonice...
            </td>
        </tr>
    `;

    try {
        const res = await studioFetch(`${API_BASE}/api/master/users`, { method: 'GET' });
        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();

        if (!data.success || !data.users || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--text-secondary); padding: 40px;">U D1 bazi trenutno nema registrovanih klijenata.</td></tr>`;
            return;
        }

        sviKorisniciKes = data.users;    // Sipamo sveže podatke u RAM keš
        renderujTabelu(sviKorisniciKes); // Pokrećemo crtanje prve iteracije

    } catch (err) {
        if (err.message === "Unauthorized_Bypass_Blocked") return;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--red-alert); padding: 40px; font-weight: 500;">❌ Greška sa D1 šinom: ${err.message}</td></tr>`;
    }
}

// 🪐 UNIFIKOVANI GRAFIČKI RENDERER TABELE
function renderujTabelu(korisnici) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = ""; // Čistimo staro stanje pre crtanja

    korisnici.forEach(klijent => {
        const tr = document.createElement('tr');
        const cistiTenantId = klijent.tenant_id || klijent.requested_subdomain || '';

        // 1. Email
        const tdEmail = document.createElement('td');
        tdEmail.style.cssText = "font-weight: 600; color: #fff;";
        tdEmail.textContent = klijent.email;
        tr.appendChild(tdEmail);

        // 2. Kontakt Telefon
        const tdPhone = document.createElement('td');
        tdPhone.style.cssText = "color: var(--text-secondary); font-size: 13px; font-family: monospace;";
        tdPhone.textContent = klijent.phone || "—";
        tr.appendChild(tdPhone);

        // 3. Tenant ID
        const tdTenant = document.createElement('td');
        tdTenant.innerHTML = `<input type="text" value="${cistiTenantId || 'Nije alociran'}" class="shell-input" style="width: 150px; padding: 5px 10px;" disabled>`;
        tr.appendChild(tdTenant);

        // 4. Uloga
        const tdRole = document.createElement('td');
        tdRole.style.cssText = "text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;";
        tdRole.textContent = klijent.role || 'client';
        tr.appendChild(tdRole);

        // 5. Status Vize
        const tdStatus = document.createElement('td');
        if (klijent.status === 'active' || klijent.status === 'approved') {
            tdStatus.innerHTML = `<span class="badge badge-approved">✔️ Aktivan</span>`;
        } else if (klijent.status === 'blocked' || klijent.status === 'rejected' || klijent.status === 'deleted') {
            tdStatus.innerHTML = `<span class="badge badge-revoked">${klijent.status === 'deleted' ? '🗑️ Grace' : '⛔ Blokiran'}</span>`;
        } else {
            tdStatus.innerHTML = `<span class="badge badge-pending">⏳ Čekaonica</span>`;
        }
        tr.appendChild(tdStatus);

        // 6. Datum
        const tdDate = document.createElement('td');
        tdDate.innerHTML = `<span class="badge badge-version">${klijent.created_at ? klijent.created_at.split(' ')[0] : 'Uživo'}</span>`;
        tr.appendChild(tdDate);

        // 7. Akcije (Okice 👁️)
        const tdActions = document.createElement('td');
        tdActions.style.cssText = "text-align: right; display: flex; gap: 8px; justify-content: flex-end; align-items: center;";

        if (klijent.email === "selectionrooms@gmail.com") {
            tdActions.innerHTML = `<span style="color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;">Centralno Jezgro</span>`;
        } else {
            // Prvo dodajemo "Otvori Studio" link ako ispunjava uslove
            if ((klijent.status === 'active' || klijent.status === 'approved') && cistiTenantId) {
                const btnStudio = document.createElement('a');
                btnStudio.href = `https://composer.selection.rs?mode=admin&tenant=${cistiTenantId}`;
                btnStudio.target = "_blank";
                btnStudio.className = "btn btn-sm";
                btnStudio.style.cssText = "background: var(--gold); color: #000; border: none; font-weight: 600; text-decoration: none; padding: 5px 12px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;";
                btnStudio.innerHTML = `👁️ Otvori Studio`;
                tdActions.appendChild(btnStudio);
            }

            // Statusne akcije
            if (klijent.status === 'pending') {
                const btnApprove = document.createElement('button');
                btnApprove.className = "btn btn-sm btn-approve";
                btnApprove.textContent = "Odobri Vizu";
                btnApprove.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'approved'));
                tdActions.appendChild(btnApprove);
            } else if (klijent.status === 'active' || klijent.status === 'approved') {
                const btnBlock = document.createElement('button');
                btnBlock.className = "btn btn-sm btn-revoke";
                btnBlock.textContent = "Oduzmi Vizu";
                btnBlock.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'blocked'));
                tdActions.appendChild(btnBlock);
            }

            // Brisanje klijenta
            if (klijent.status !== 'deleted') {
                const btnDelete = document.createElement('button');
                btnDelete.className = "btn btn-sm btn-delete";
                btnDelete.textContent = "🗑 Obriši";
                btnDelete.style.cssText = "background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.4); color: #f07070;";
                btnDelete.addEventListener('click', () => obrisiKlijentaMaster(klijent.id, klijent.email));
                tdActions.appendChild(btnDelete);
            }
        }

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
}

async function masterKreirajNovogKorisnika() {
    const emailInput = document.getElementById('client-email');
    const subInput = document.getElementById('client-subdomain');
    const companyInput = document.getElementById('client-company');

    if (!emailInput || !subInput) return;
    const email = emailInput.value.trim();
    const subdomain = subInput.value.trim().toLowerCase();
    const companyName = (companyInput && companyInput.value.trim()) ? companyInput.value.trim() : "Selection Klijent";

    if (!email || !subdomain) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/onboarding/request`, {
            method: 'POST',
            body: JSON.stringify({
                company_name: companyName,
                email: email,
                phone: "+38160000000", // 🛡️ FIX: Prosleđujemo validan E.164 placeholder umesto sirovog prefiksa da prođe backend regex kapiju
                requested_subdomain: subdomain,
                expected_launch: new Date().toISOString().split('T')[0], // Automatsko popunjavanje ustavnog polja baze
                source_channel: "selection_gateway"
            })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Zahtev alociran!`);
            emailInput.value = '';
            subInput.value = '';
            if (companyInput) companyInput.value = '';
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || "Odbijeno sa servera."}`);
        }
    } catch (error) {
        if (error.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Prekid veze sa centralnim D1 ruterom.");
    }
}

async function promeniStatusKlijentaMaster(requestId, status) {
    if (!confirm(status === 'approved' ? `Odobriti aktivaciju?` : `Suspendovati klijenta?`)) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/master/approve-user`, {
            method: 'POST',
            body: JSON.stringify({ requestId, noviStatus: status })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`🔒 Kapija odbila promenu: ${rez.error || ''}`);
        }
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}

async function obrisiKlijentaMaster(requestId, email) {
    if (!confirm(`🗑️ Obriši klijenta: ${email}?`)) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/master/delete-request`, {
            method: 'POST',
            body: JSON.stringify({ requestId })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`✅ Klijent uspesno obrisan.`);
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || ''}`);
        }
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}

// 🪐 INICIJALIZACIJA NA STARTU: Pokrećemo državnu mašinu iz bootstrap-a
bootstrapAdmin();