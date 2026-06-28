// SELECTION CONTROL PLANE — control-plane.js (V5.0.0 - Hardened Unified Engine)
import { bootstrapAdmin } from './bootstrap.js';

const API_BASE = "https://api.selection.rs";

let trenutnoUlogovaniKorisnik = null;
let sviKorisniciKes = [];

export async function studioFetch(url, options = {}) {
    options.headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    options.credentials = 'include'; // Ovo osigurava prenos kolačića!

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

document.addEventListener('ShellProvisionalReady', async (event) => {
    trenutnoUlogovaniKorisnik = event.detail;
    console.log("🚀 [Control Plane] Signal primljen! Identitet verifikovan:", trenutnoUlogovaniKorisnik.email);
    initControlPlane();
});

function initControlPlane() {
    console.log("🎮 [Control Plane] Komandna stanica aktivirana.");
    const identityBadge = document.getElementById('admin-identity');
    if (identityBadge && trenutnoUlogovaniKorisnik) {
        identityBadge.textContent = trenutnoUlogovaniKorisnik.email;
    }
    osveziMasterTabeluKorisnika();
    setupEventListeners();
}

function setupEventListeners() {
    const form = document.getElementById('provision-form');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }

    const searchInput = document.getElementById('master-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const pojam = e.target.value.toLowerCase().trim();
            const filtriraniKorisnici = sviKorisniciKes.filter(k => {
                const emailMec = k.email ? k.email.toLowerCase().includes(pojam) : false;
                const phoneMec = k.phone ? k.phone.toLowerCase().includes(pojam) : false;
                const subMec = k.subdomain ? k.subdomain.toLowerCase().includes(pojam) : false;
                return emailMec || phoneMec || subMec;
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
                ⚡ Povezujem se na D1 relej, povlačim stanje iz unifikovane matrice...
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

        sviKorisniciKes = data.users;
        renderujTabelu(sviKorisniciKes);
    } catch (err) {
        if (err.message === "Unauthorized_Bypass_Blocked") return;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--red-alert); padding: 40px; font-weight: 500;">❌ Greška sa D1 šinom: ${err.message}</td></tr>`;
    }
}

function renderujTabelu(korisnici) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = "";

    korisnici.forEach(klijent => {
        const tr = document.createElement('tr');
        const cistiSubdomain = klijent.subdomain || '';

        const tdEmail = document.createElement('td');
        tdEmail.style.cssText = "font-weight: 600; color: #fff;";
        tdEmail.textContent = klijent.email;
        tr.appendChild(tdEmail);

        const tdPhone = document.createElement('td');
        tdPhone.style.cssText = "color: var(--text-secondary); font-size: 13px; font-family: monospace;";
        tdPhone.textContent = klijent.phone || "—";
        tr.appendChild(tdPhone);

        const tdTenant = document.createElement('td');
        tdTenant.innerHTML = `<input type="text" value="${cistiSubdomain || 'Nije alociran'}" class="shell-input" style="width: 150px; padding: 5px 10px;" disabled>`;
        tr.appendChild(tdTenant);

        const tdRole = document.createElement('td');
        tdRole.style.cssText = "text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;";
        tdRole.textContent = klijent.role || 'client';
        tr.appendChild(tdRole);

        const tdStatus = document.createElement('td');
        if (klijent.status === 'active') {
            tdStatus.innerHTML = `<span class="badge badge-approved">✔️ Aktivan</span>`;
        } else if (klijent.status === 'blocked') {
            tdStatus.innerHTML = `<span class="badge badge-revoked">⛔ Blokiran</span>`;
        } else if (klijent.status === 'grace_period') {
            tdStatus.innerHTML = `<span class="badge badge-revoked">🗑️ Grace Period</span>`;
        } else {
            tdStatus.innerHTML = `<span class="badge badge-pending">⏳ Čekaonica</span>`;
        }
        tr.appendChild(tdStatus);

        const tdDate = document.createElement('td');
        tdDate.innerHTML = `<span class="badge badge-version">${klijent.created_at ? klijent.created_at.split(' ')[0] : 'Uživo'}</span>`;
        tr.appendChild(tdDate);

        const tdActions = document.createElement('td');
        tdActions.style.cssText = "text-align: right; display: flex; gap: 8px; justify-content: flex-end; align-items: center;";

        if (klijent.role === "master") {
            tdActions.innerHTML = `<span style="color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;">Centralno Jezgro</span>`;
        } else {
            if (klijent.status === 'active' && cistiSubdomain) {
                const btnStudio = document.createElement('a');
                btnStudio.href = `https://composer.selection.rs?mode=admin&tenant=${klijent.tenant_id}`;
                btnStudio.target = "_blank";
                btnStudio.className = "btn btn-sm";
                btnStudio.style.cssText = "background: var(--gold); color: #000; border: none; font-weight: 600; text-decoration: none; padding: 5px 12px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;";
                btnStudio.innerHTML = `👁️ Otvori Studio`;
                tdActions.appendChild(btnStudio);
            }

            // 🎛️ KONTROLNA SKRETNICA ZA AKCIJE VIZE (Uvezan Rollback za blocked i grace_period)
            if (klijent.status === 'pending') {
                const btnApprove = document.createElement('button');
                btnApprove.className = "btn btn-sm btn-approve";
                btnApprove.textContent = "Odobri Vizu";
                btnApprove.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'approve'));
                tdActions.appendChild(btnApprove);
            } else if (klijent.status === 'active') {
                const btnBlock = document.createElement('button');
                btnBlock.className = "btn btn-sm btn-revoke";
                btnBlock.textContent = "Oduzmi Vizu";
                btnBlock.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'revoke'));
                tdActions.appendChild(btnBlock);
            } else if (klijent.status === 'blocked' || klijent.status === 'grace_period') {
                // Zeleno dugme sa restrikcionim borderom za vraćanje sistema iz mrtvih
                const btnRestore = document.createElement('button');
                btnRestore.className = "btn btn-sm btn-approve";
                btnRestore.style.cssText = "background: rgba(50,220,50,0.15); border: 1px solid rgba(50,220,50,0.4); color: #70f070;";
                btnRestore.textContent = "🔄 Vrati Vizu";
                btnRestore.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'restore'));
                tdActions.appendChild(btnRestore);
            }

            // 🗑️ CRVENA ZONA UNIŠTENJA: Nudi se samo ako prostor već nije u procesu brisanja
            if (klijent.status !== 'grace_period') {
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
    const phoneInput = document.getElementById('client-phone');
    const subInput = document.getElementById('client-subdomain');
    const companyInput = document.getElementById('client-company');

    if (!emailInput || !subInput || !phoneInput) return;
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim().replace(/\s+/g, '');
    const subdomain = subInput.value.trim().toLowerCase();
    const companyName = companyInput?.value.trim() || "Selection Klijent";

    if (!email || !subdomain || !phone) return;

    if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
        alert("❌ Telefon mora biti u E.164 formatu (npr. +38160123456)");
        return;
    }

    try {
        const response = await studioFetch(`${API_BASE}/api/onboarding/request`, {
            method: 'POST',
            body: JSON.stringify({
                company_name: companyName,
                email: email,
                phone: phone,
                requested_subdomain: subdomain
            })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Zahtev alociran!`);
            emailInput.value = '';
            phoneInput.value = '';
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

// SELECTION CONTROL PLANE — Popravljena i gvozdeno usklađena funkcija restrikcija
async function promeniStatusKlijentaMaster(requestId, akcija) {
    let potvrdnaPoruka = "";
    let ruta = "";

    // 🏎️ Striktno mapiranje rute i teksta na osnovu prosleđene akcije sa tabele
    if (akcija === 'approve') {
        potvrdnaPoruka = "Odobriti aktivaciju i izdati vizu klijentu?";
        ruta = '/api/master/approve-user';
    } else if (akcija === 'revoke') {
        potvrdnaPoruka = "Suspendovati klijenta i privremeno ukinuti vizu?";
        ruta = '/api/master/revoke-user';
    } else if (akcija === 'restore') {
        // 🔄 ROLLBACK: Vraćanje iz blocked ili grace_period stanja ide na approve rutu
        potvrdnaPoruka = "Poništiti sve restrikcije, prekinuti brisanje i vratiti vizu klijentu?";
        ruta = '/api/master/approve-user';
    }

    // Sigurnosni guard u slučaju da akcija proleti nemapirana
    if (!ruta) {
        console.error("❌ Kritična greška: Nepoznata administrativna akcija:", akcija);
        return;
    }

    if (!confirm(potvrdnaPoruka)) return;

    try {
        const response = await studioFetch(`${API_BASE}${ruta}`, {
            method: 'POST',
            body: JSON.stringify({ requestId })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            // Ponovo skeniramo D1 i osvežavamo tabelu uživo na ekranu
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
    if (!confirm(`🗑️ Pokrenuti Grace Period za klijenta: ${email}?`)) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/master/delete-request`, {
            method: 'POST',
            body: JSON.stringify({ requestId })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`✅ Grace period uspešno inicijalizovan.`);
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || ''}`);
        }
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}

bootstrapAdmin();