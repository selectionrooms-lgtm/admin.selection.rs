// SELECTION MASTER CONTROL PLANE — Control Plane Engine (V3.1.0)
import { bootstrapAdmin } from './bootstrap.js';

const API_BASE = "https://shell.selection.rs";

// Pokrećemo asinhroni bootstrap u vrhu
const me = await bootstrapAdmin();

// Ako bootstrap vrati null, prekidamo izvršavanje — bootstrap.js je već preuzeo ekran
if (me) {
    initControlPlane();
}

function initControlPlane() {
    console.log("🚀 [Control Plane] Inicijalizujem komandni interfejs za Mastera...");

    // Odmah punimo tabelu i vezujemo slušaoce na formu u vrhu ekrana
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

async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--gold); padding: 40px; font-weight:500;">⚡ Skeniram Edge KV magistralu, sakupljam žurnale korisnika...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/api/master/users`, { method: 'GET' });
        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();
        if (!data.success || !data.users || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-secondary); padding: 40px;">U bazi trenutno nema registrovanih klijentskih matrica.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        data.users.forEach(user => {
            const tr = document.createElement('tr');
            const cleanEmailId = user.email.replace(/[@.]/g, '_');

            let statusBadge = '';
            if (user.status === 'approved') {
                statusBadge = `<span class="badge badge-approved">✔️ Odobren</span>`;
            } else if (user.status === 'blocked' || user.status === 'revoked') {
                statusBadge = `<span class="badge badge-revoked">⛔ Blokiran</span>`;
            } else {
                statusBadge = `<span class="badge badge-pending">⏳ Na čekanju</span>`;
            }

            const fieldTenant = user.tenant || user.subdomain || '';
            const verzijaPecat = `<span class="badge badge-version">${user.version || 'v2-edge'}</span>`;

            let actionButtons = '';
            if (user.email === "selectionrooms@gmail.com") {
                actionButtons = `<span style="color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;">Centralno Jezgro</span>`;
            } else {
                if (user.status === 'approved') {
                    actionButtons = `<button class="btn btn-sm btn-revoke" data-email="${user.email}" data-tenant="${fieldTenant}">Oduzmi Vizu</button>`;
                } else {
                    actionButtons = `
                        <button class="btn btn-sm btn-approve" data-email="${user.email}" data-tenant="${fieldTenant}">Odobri</button>
                        <button class="btn btn-sm btn-revoke" data-email="${user.email}" data-tenant="${fieldTenant}">Blokiraj</button>
                    `;
                }
            }

            // Integrisana klasa .shell-input za inpute unutar tabele radi vizuelne unifikacije
            tr.innerHTML = `
                <td style="font-weight: 600; color: #fff;">${user.email}</td>
                <td>
                    <input type="text" id="tenant-input-${cleanEmailId}" value="${fieldTenant}" class="shell-input" style="width: 180px; padding: 5px 10px;">
                </td>
                <td style="text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;">${user.role || 'client'}</td>
                <td>${statusBadge}</td>
                <td>${verzijaPecat}</td>
                <td style="text-align: right;">${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => promeniStatusKlijentaMaster(btn.dataset.email, 'approved', btn.dataset.tenant));
        });
        tbody.querySelectorAll('.btn-revoke').forEach(btn => {
            btn.addEventListener('click', () => promeniStatusKlijentaMaster(btn.dataset.email, 'blocked', btn.dataset.tenant));
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--red-alert); padding: 40px; font-weight: 500;">❌ Greška prilikom komunikacije sa magistralom: ${err.message}</td></tr>`;
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

    if (!confirm(`Alocirati prostor na ivici za: ${email} na adresi https://${subdomain}.selection.rs?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/provision-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tenant: subdomain })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Korisnik ${email} upisan kao PENDING na tenantu [${subdomain}]!`);
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

async function promeniStatusKlijentaMaster(email, status, oldTenant) {
    const cleanEmailId = email.replace(/[@.]/g, '_');
    const inputElement = document.getElementById(`tenant-input-${cleanEmailId}`);
    const targetSubdomain = inputElement ? inputElement.value.trim().toLowerCase() : oldTenant;

    if (!targetSubdomain) {
        alert("❌ Greška: Poddomen mora biti popunjen.");
        return;
    }

    const poruka = status === 'approved'
        ? `Odobriti vizu klijentu ${email} na domenu https://${targetSubdomain}.selection.rs?`
        : `Prekinuti sistemsku vizu i blokirati nalog za ${email}?`;

    if (!confirm(poruka)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/approve-user`, {
            method: 'POST',
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