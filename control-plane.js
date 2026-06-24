// admin.selection.rs/src/control-plane.js (V5.4.0 - Dynamic DOM References)
import { bootstrapAdmin } from './bootstrap.js';

const API_BASE = "https://shell.selection.rs";

// Inicijalizacija i blokiranje UI-ja do potvrde identiteta
const user = await bootstrapAdmin();

if (user) {
    initControlPlane();
}

function initControlPlane() {
    console.log("🚀 [Control Plane] Komandna stanica podignuta preko mrežnog Access autoriteta.");
    osveziMasterTabeluKorisnika();
    setupEventListeners();
}

function setupEventListeners() {
    const form = document.getElementById('provision-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await masterKreirajNovogKorisnika();
        });
    }
}

const fetchOptions = {
    credentials: 'include'
};

async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const loadingTr = document.createElement('tr');
    const loadingTd = document.createElement('td');
    loadingTd.colSpan = 6;
    loadingTd.className = "text-center";
    loadingTd.style.cssText = "color: var(--gold); padding: 40px; font-weight:500;";
    loadingTd.textContent = "⚡ Autorizujem viza kanal, skeniram Edge KV magistralu...";
    loadingTr.appendChild(loadingTd);
    tbody.replaceChildren(loadingTr);

    try {
        const res = await fetch(`${API_BASE}/api/master/users`, {
            method: 'GET',
            ...fetchOptions
        });

        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();
        if (!data.success || !data.users || data.users.length === 0) {
            const emptyTr = document.createElement('tr');
            const emptyTd = document.createElement('td');
            emptyTd.colSpan = 6;
            emptyTd.className = "text-center";
            emptyTd.style.cssText = "color: var(--text-secondary); padding: 40px;";
            emptyTd.textContent = "U bazi trenutno nema registrovanih klijentskih matrica.";
            emptyTr.appendChild(emptyTd);
            tbody.replaceChildren(emptyTr);
            return;
        }

        const noviRedovi = [];

        data.users.forEach(user => {
            const tr = document.createElement('tr');

            // 1. Ćelija za Email
            const tdEmail = document.createElement('td');
            tdEmail.style.cssText = "font-weight: 600; color: #fff;";
            tdEmail.textContent = user.email;
            tr.appendChild(tdEmail);

            // 2. Ćelija za Tenant Input (Uklonjen krhki ID baziran na email-u)
            const tdTenant = document.createElement('td');
            const tenantInput = document.createElement('input');
            tenantInput.type = "text";
            tenantInput.value = user.tenant || user.subdomain || '';
            tenantInput.className = "shell-input";
            tenantInput.style.cssText = "width: 180px; padding: 5px 10px;";
            tdTenant.appendChild(tenantInput);
            tr.appendChild(tdTenant);

            // 3. Ćelija za Ulogu
            const tdRole = document.createElement('td');
            tdRole.style.cssText = "text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;";
            tdRole.textContent = user.role || 'client';
            tr.appendChild(tdRole);

            // 4. Ćelija za Status Bedž
            const tdStatus = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = "badge";
            if (user.status === 'approved') {
                statusBadge.classList.add('badge-approved');
                statusBadge.textContent = "✔️ Odobren";
            } else if (user.status === 'blocked' || user.status === 'revoked') {
                statusBadge.classList.add('badge-revoked');
                statusBadge.textContent = "⛔ Blokiran";
            } else {
                statusBadge.classList.add('badge-pending');
                statusBadge.textContent = "⏳ Na čekanju";
            }
            tdStatus.appendChild(statusBadge);
            tr.appendChild(tdStatus);

            // 5. Ćelija za Verziju Pečata
            const tdVersion = document.createElement('td');
            const versionBadge = document.createElement('span');
            versionBadge.className = "badge badge-version";
            versionBadge.textContent = user.version || 'v2-edge';
            tdVersion.appendChild(versionBadge);
            tr.appendChild(tdVersion);

            // 6. Ćelija za Akcije
            const tdActions = document.createElement('td');
            tdActions.style.textAlign = "right";

            if (user.email === "selectionrooms@gmail.com") {
                const centralCoreSpan = document.createElement('span');
                centralCoreSpan.style.cssText = "color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;";
                centralCoreSpan.textContent = "Centralno Jezgro";
                tdActions.appendChild(centralCoreSpan);
            } else {
                // 🛠️ AMANDMAN 1 & 2: Čitamo input direktno iz reference u trenutku klika, bez oslanjanja na closure zamrzavanje ili DOM ID-jeve
                if (user.status === 'approved') {
                    const btnRevoke = document.createElement('button');
                    btnRevoke.className = "btn btn-sm btn-revoke";
                    btnRevoke.textContent = "Oduzmi Vizu";
                    btnRevoke.addEventListener('click', () => promeniStatusKlijentaMaster(user.email, 'blocked', tenantInput));
                    tdActions.appendChild(btnRevoke);
                } else {
                    const btnApprove = document.createElement('button');
                    btnApprove.className = "btn btn-sm btn-approve";
                    btnApprove.textContent = "Odobri";
                    btnApprove.addEventListener('click', () => promeniStatusKlijentaMaster(user.email, 'approved', tenantInput));

                    const btnBlock = document.createElement('button');
                    btnBlock.className = "btn btn-sm btn-revoke";
                    btnBlock.textContent = "Blokiraj";
                    btnBlock.addEventListener('click', () => promeniStatusKlijentaMaster(user.email, 'blocked', tenantInput));

                    tdActions.appendChild(btnApprove);
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
        errorTd.textContent = `❌ Greška prilikom komunikacije sa magistralom: ${err.message}`;
        errorTr.appendChild(errorTd);
        tbody.replaceChildren(errorTr);
    }
}

async function masterKreirajNovogKorisnika() {
    const emailInput = document.getElementById('client-email');
    const subInput = document.getElementById('client-subdomain');

    if (!emailInput || !subInput) return;
    const email = emailInput.value.trim();
    const subdomain = subInput.value.trim().toLowerCase();

    if (!email || !subdomain) return;

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        alert("❌ Format greška: Poddomen sme da sadrži samo mala slova, brojeve i crtice.");
        return;
    }

    if (!confirm(`Alocirati prostor u čekaonici za: ${email} na adresi https://${subdomain}.selection.rs?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/provision-user`, {
            method: 'POST',
            ...fetchOptions,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tenant: subdomain })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Korisnik ${email} upisan u sistemsku čekaonicu.`);
            emailInput.value = '';
            subInput.value = '';
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Greška: ${rez.error || "Odbijeno sa servera."}`);
        }
    } catch (error) {
        alert("❌ Prekid veze sa centralnim Shell ruterom.");
    }
}

// 🛠️ Primamo direktnu referencu na HTMLInputElement i čitamo živu vrednost sa ekrana
async function promeniStatusKlijentaMaster(email, status, inputElement) {
    if (!inputElement) return;
    const targetSubdomain = inputElement.value.trim().toLowerCase();

    if (!targetSubdomain) {
        alert("❌ Greška: Poddomen mora biti popunjen.");
        return;
    }

    if (!confirm(status === 'approved' ? `Odobriti aktivaciju za nalog ${email}?` : `Blokirati pristup za ${email}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/approve-user`, {
            method: 'POST',
            ...fetchOptions,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ klijentEmail: email, noviStatus: status, noviTenant: targetSubdomain })
        });

        if (response.ok) {
            await osveziMasterTabeluKorisnika();
        } else {
            alert("🔒 Bezbednosna kapija odbila promenu prava.");
        }
    } catch (e) {
        alert("❌ Veza sa Control Plane panelom je prekinuta.");
    }
}