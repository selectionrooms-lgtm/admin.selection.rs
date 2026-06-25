// admin.selection.rs/src/control-plane.js (V20.0.0 - D1 Alignment Layer - Hardened)
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
 * 🛡️ GLOBALNI API INTERCEPTOR (Omotač oko Fetch-a)
 * Automatski lepi autorizaciju i čisti sesiju ako je nalog blokiran ili obrisan.
 */
export async function studioFetch(url, options = {}) {
    options.headers = {
        ...generisiBffHeaders(),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(url, options);

        // PRESRETANJE: Ako je klijent blokiran ili mu je istekla sesija (401 / 403)
        if (response.status === 401 || response.status === 403) {
            console.warn("🚨 [Security Shield] Sesija prekinuta ili nalog suspendovan (401/403). Čišćenje...");

            localStorage.removeItem("selection_session_token"); // Hirurški precizno brisanje

            alert("🔒 Vaša sesija je istekla ili je nalog suspendovan. Bićete preusmereni na početni ekran.");
            window.location.href = "/";

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
 * SKENIRANJE ČEKAONICE: Vuče sirove `tenant_requests` zahteve iz D1 baze podataka preko studioFetch-a
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
        const res = await studioFetch(`${API_BASE}/api/master/users`, {
            method: 'GET'
        });

        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();

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
            tenantInput.disabled = true;
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
            } else if (klijent.status === 'blocked' || klijent.status === 'rejected' || klijent.status === 'deleted') {
                statusBadge.classList.add('badge-revoked');
                statusBadge.textContent = klijent.status === 'deleted' ? "🗑️ U Grace Periodu" : "⛔ Blokiran / Odbijen";
            } else {
                statusBadge.classList.add('badge-pending');
                statusBadge.textContent = "⏳ Čekaonica";
            }
            tdStatus.appendChild(statusBadge);
            tr.appendChild(tdStatus);

            // 5. Datum kreiranja matrice
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

                // Sakrij dugme za brisanje ako je već u stanju brisanja (soft-deleted)
                if (klijent.status !== 'deleted') {
                    const btnDelete = document.createElement('button');
                    btnDelete.className = "btn btn-sm btn-delete";
                    btnDelete.textContent = "🗑 Obriši";
                    btnDelete.style.cssText = "margin-left: 8px; background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.4); color: #f07070;";
                    btnDelete.addEventListener('click', () => obrisiKlijentaMaster(klijent.id, klijent.email));
                    tdActions.appendChild(btnDelete);
                }
            }
            tr.appendChild(tdActions);
            noviRedovi.push(tr);
        });

        tbody.replaceChildren(...noviRedovi);

    } catch (err) {
        if (err.message === "Unauthorized_Bypass_Blocked") return;
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
 * RUČNA ALOKACIJA: Generiše i šalje payload preko studioFetch-a na javnu onboarding rutu
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
        const response = await studioFetch(`${API_BASE}/api/onboarding/request`, {
            method: 'POST',
            body: JSON.stringify({
                company_name: companyInput.value || "Selection Klijent",
                email: email,
                phone: "+381", // Pozadinski format za D1 E.164 validaciju rute
                requested_subdomain: subdomain,
                message: "Kreirano sa Master Admin Panela"
            })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Zahtev alociran pod ID oznakom: ${rez.correlationId || rez.requestId}`);
            emailInput.value = '';
            subInput.value = '';
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || "Odbijeno sa servera."}`);
        }
    } catch (error) {
        if (error.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Prekid veze sa centralnim D1 ruterom.");
    }
}

/**
 * MUTACIJA STATUSU: Odobravanje vize ili blokiranje kroz studioFetch
 */
async function promeniStatusKlijentaMaster(requestId, status) {
    if (!confirm(status === 'approved' ? `Odobriti aktivaciju i pokrenuti automatski provisioning?` : `Suspendovati klijenta?`)) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/master/approve-user`, {
            method: 'POST',
            body: JSON.stringify({ requestId, noviStatus: status })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`🔒 Bezbednosna kapija odbila promenu prava: ${rez.error || ''}`);
        }
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}

/**
 * SUSPENZIJA KLIJENTA (Soft Delete): Prebacuje klijenta u Grace period pre trajnog čišćenja
 */
async function obrisiKlijentaMaster(requestId, email) {
    if (!confirm(`🗑️ BRISANJE (Grace Period)\n\nOvo će suspendovati klijenta i obeležiti ga za trajno brisanje:\n${email}\n\nKlijent odmah gubi pristup sistemu. Nastaviti?`)) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/master/delete-request`, {
            method: 'POST',
            body: JSON.stringify({ requestId })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`✅ Klijent ${email} je uspešno suspendovan i zakazan za brisanje.`);
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška pri brisanju: ${rez.error || 'Nepoznata greška'}`);
        }
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") return;
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}