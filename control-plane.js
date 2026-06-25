// admin.selection.rs/src/control-plane.js (V20.0.0 - D1 Alignment Layer)
import { bootstrapAdmin } from './bootstrap.js';

const API_BASE = "https://api.selection.rs";

// Inicijalizacija i blokiranje UI-ja do potvrde identiteta na Edge kapiji
const user = await bootstrapAdmin();

if (user) {
    initControlPlane();
}

function initControlPlane() {
    console.log("🚀 [Control Plane] Komandna stanica podignuta na D1 šini.");

    const identityBadge = document.getElementById('admin-identity');
    if (identityBadge && user) {
        identityBadge.textContent = user.email;
    }

    osveziMasterTabeluKorisnika();
    setupEventListeners();
}

function setupEventListeners() {
    const form = document.getElementById('provision-form');
    if (form) {
        form.removeEventListener('submit', handleFormSubmit); // Prevent dupliranja
        form.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    await masterKreirajNovogKorisnika();
}

function uzmiUstavniToken() {
    return localStorage.getItem('selection_session_token') || "";
}

function generisiBffHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${uzmiUstavniToken()}`
    };
}

/**
 * SKENIRANJE ČEKAONICE: Vuče sirove `tenant_requests` zahteve iz D1 baze podataka
 */
async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    // Loading Držanje
    const loadingTr = document.createElement('tr');
    const loadingTd = document.createElement('td');
    loadingTd.colSpan = 6;
    loadingTd.className = "text-center";
    loadingTd.style.cssText = "color: var(--gold); padding: 40px; font-weight:500;";
    loadingTd.textContent = "⚡ Povezujem se na D1 relej, povlačim stanje iz čekaonice...";
    loadingTr.appendChild(loadingTd);
    tbody.replaceChildren(loadingTr);

    try {
        // NAPOMENA: Ovde u praksi možeš gađati i svoj novi /api/master/users, 
        // ali pošto sada pratimo pipeline čekaonice, povlačimo zahteve iz tabele tenant_requests
        const res = await fetch(`${API_BASE}/api/master/users`, {
            method: 'GET',
            headers: generisiBffHeaders()
        });

        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();

        // D1 vraća niz u data.users (promenili smo backend da vraća clients redove)
        if (!data.success || !data.users || data.users.length === 0) {
            PrikaziPraznuTabelu(tbody, "U D1 bazi trenutno nema registrovanih klijenata.");
            return;
        }

        const noviRedovi = [];

        data.users.forEach(klijent => {
            const tr = document.createElement('tr');

            // 1. Email klijenta
            const tdEmail = document.createElement('td');
            tdEmail.style.cssText = "font-weight: 600; color: #fff;";
            tdEmail.textContent = klijent.email;
            tr.appendChild(tdEmail);

            // 2. Alocirani / Rezervisani prostor (Tenant ID)
            const tdTenant = document.createElement('td');
            const tenantInput = document.createElement('input');
            tenantInput.type = "text";
            tenantInput.value = klijent.tenant_id || klijent.requested_subdomain || 'Nije alociran';
            tenantInput.className = "shell-input";
            tenantInput.style.cssText = "width: 180px; padding: 5px 10px;";
            tenantInput.disabled = true; // Zabrana direktne mutacije bez pipeline-a
            tdTenant.appendChild(tenantInput);
            tr.appendChild(tdTenant);

            // 3. Uloga (Sistemski nivo)
            const tdRole = document.createElement('td');
            tdRole.style.cssText = "text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;";
            tdRole.textContent = klijent.role || 'client';
            tr.appendChild(tdRole);

            // 4. Status Vize
            const tdStatus = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = "badge";

            if (klijent.status === 'active' || klijent.status === 'approved') {
                statusBadge.classList.add('badge-approved');
                statusBadge.textContent = "✔️ Aktivan / Odobren";
            } else if (klijent.status === 'blocked' || klijent.status === 'rejected') {
                statusBadge.classList.add('badge-revoked');
                statusBadge.textContent = "⛔ Blokiran / Odbijen";
            } else {
                statusBadge.classList.add('badge-pending');
                statusBadge.textContent = "⏳ Čekaonica";
            }
            tdStatus.appendChild(statusBadge);
            tr.appendChild(tdStatus);

            // 5. Datum kreiranja matrice (D1 Timestamp umesto KV verzije)
            const tdDate = document.createElement('td');
            const dateBadge = document.createElement('span');
            dateBadge.className = "badge badge-version";
            dateBadge.textContent = klijent.created_at ? klijent.created_at.split(' ')[0] : 'Uživo';
            tdDate.appendChild(dateBadge);
            tr.appendChild(tdDate);

            // 6. Akcije / Komandni dugmići
            const tdActions = document.createElement('td');
            tdActions.style.textAlign = "right";

            if (klijent.email === "selectionrooms@gmail.com") {
                const centralCoreSpan = document.createElement('span');
                centralCoreSpan.style.cssText = "color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;";
                centralCoreSpan.textContent = "Centralno Jezgro";
                tdActions.appendChild(centralCoreSpan);
            } else {
                // Ako klijent još nije odobren, daj opciju za brzu aktivaciju
                if (klijent.status === 'pending') {
                    const btnApprove = document.createElement('button');
                    btnApprove.className = "btn btn-sm btn-approve";
                    btnApprove.textContent = "Odobri Vizu";
                    // Prosleđujemo id zahteva (D1 Primary Key) za izvršenje dvofaznog ugovora
                    btnApprove.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'approved'));
                    tdActions.appendChild(btnApprove);
                } else if (klijent.status === 'active' || klijent.status === 'approved') {
                    const btnBlock = document.createElement('button');
                    btnBlock.className = "btn btn-sm btn-revoke";
                    btnBlock.textContent = "Oduzmi Vizu";
                    btnBlock.addEventListener('click', () => promeniStatusKlijentaMaster(klijent.id, 'blocked'));
                    tdActions.appendChild(btnBlock);
                }
            }
            tr.appendChild(tdActions);
            noviRedovi.push(tr);
        });

        tbody.replaceChildren(...noviRedovi);

    } catch (err) {
        const errorTr = document.createElement('tr');
        const errorTd = document.createElement('td');
        errorTd.colSpan = 6;
        errorTd.className = "text-center";
        errorTd.style.cssText = "color: var(--red-alert); padding: 40px; font-weight: 500;";
        errorTd.textContent = `❌ Greška prilikom komunikacije sa D1 šinom: ${err.message}`;
        errorTr.appendChild(errorTd);
        tbody.replaceChildren(errorTr);
    }
}

function PrikaziPraznuTabelu(tbody, tekst) {
    const emptyTr = document.createElement('tr');
    const emptyTd = document.createElement('td');
    emptyTd.colSpan = 6;
    emptyTd.className = "text-center";
    emptyTd.style.cssText = "color: var(--text-secondary); padding: 40px;";
    emptyTd.textContent = tekst;
    emptyTr.appendChild(emptyTd);
    tbody.replaceChildren(emptyTr);
}

/**
 * RUČNA ALOKACIJA: Kada ti iz admina želiš direktno da gurneš nekoga u čekaonicu
 */
async function masterKreirajNovogKorisnika() {
    const emailInput = document.getElementById('client-email');
    const subInput = document.getElementById('client-subdomain');
    const companyInput = document.getElementById('client-company') || { value: "Ručni unos" };

    if (!emailInput || !subInput) return;
    const email = emailInput.value.trim();
    const subdomain = subInput.value.trim().toLowerCase();

    if (!email || !subdomain) return;

    try {
        const response = await fetch(`${API_BASE}/api/onboarding/request`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" }, // Otvorena javna ruta
            body: JSON.stringify({
                company_name: companyInput.value || "Selection Klijent",
                email: email,
                phone: "+381",
                requested_subdomain: subdomain,
                message: "Kreirano sa Master Admin Panela"
            })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Zahtev alociran pod ID oznakom: ${rez.correlationId}`);
            emailInput.value = '';
            subInput.value = '';
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || "Odbijeno sa servera."}`);
        }
    } catch (error) {
        alert("❌ Prekid veze sa centralnim D1 ruterom.");
    }
}

/**
 * MUTACIJA STATUSU: Odobravanje vize kroz novu D1 /api/master/approve-user rutu
 */
async function promeniStatusKlijentaMaster(requestId, status) {
    if (!confirm(status === 'approved' ? `Odobriti aktivaciju i pokrenuti automatski provisioning?` : `Suspendovati klijenta?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/approve-user`, {
            method: 'POST',
            headers: generisiBffHeaders(),
            body: JSON.stringify({ requestId, noviStatus: status })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`🔒 Bezbednosna kapija odbila promenu prava: ${rez.error || ''}`);
        }
    } catch (e) {
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}