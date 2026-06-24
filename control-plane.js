// SELECTION MASTER CONTROL PLANE — Control Plane Engine (V2.0.0)
import { verifyIdentityAndGetProfile } from './auth.js';

const API_BASE = "https://shell.selection.rs";

// 🚀 INICIJALIZACIJA PANEL SVEUČILIŠTA
document.addEventListener("DOMContentLoaded", async () => {
    // 🛡️ Korak 1: Prvo pokrećemo gvozdenu proveru mrežnog identiteta
    const identity = await verifyIdentityAndGetProfile();

    // Ako identitet nije rešen ili korisnik nije master, auth.js preuzima ekran i blokira dalji rad
    if (!identity) return;

    // 🔄 Korak 2: Ti si verifikovan, odmah inicijalizujemo tabelu i hvatamo formu
    await osveziMasterTabeluKorisnika();
    setupEventListeners();
});

function setupEventListeners() {
    const form = document.getElementById('provision-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await masterKreirajNovogKorisnika();
        });
    }
}

// 📊 SKENIRANJE BAZE KORISNIKA NA IVICI MREŽE
async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--gold); padding: 30px;">⚡ Skeniram Edge KV magistralu, sakupljam žurnale korisnika...</td></tr>`;

    try {
        // Više ne šaljemo ručne Bearer tokene, Cloudflare Access sam lepi sesiju
        const res = await fetch(`${API_BASE}/api/master/users`, {
            method: 'GET'
        });

        if (!res.ok) throw new Error(`Edge ruter vratio status: ${res.status}`);

        const data = await res.json();
        if (!data.success || !data.users || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-secondary); padding: 30px;">U bazi trenutno nema registrovanih klijentskih matrica.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        data.users.forEach(user => {
            const tr = document.createElement('tr');
            const cleanEmailId = user.email.replace(/[@.]/g, '_');

            // Formiranje vizuelnih bedževa za status vize
            let statusBadge = '';
            if (user.status === 'approved') {
                statusBadge = `<span class="badge badge-approved">✔️ Odobren</span>`;
            } else if (user.status === 'blocked' || user.status === 'revoked') {
                statusBadge = `<span class="badge badge-revoked">⛔ Blokiran</span>`;
            } else {
                statusBadge = `<span class="badge badge-pending">⏳ Na čekanju</span>`;
            }

            // Formiranje verzionog pečata za Temporal Guard reviziju
            const verzijaPecat = `<span class="badge badge-version">${user.version || 'v1-legacy'}</span>`;

            // Kreiranje akcionih dugmića na osnovu trenutnog stanja vize
            let actionButtons = '';
            if (user.email === "selectionrooms@gmail.com") {
                actionButtons = `<span style="color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;">Centralno Jezgro Sistema</span>`;
            } else {
                if (user.status === 'approved') {
                    actionButtons = `<button class="btn btn-sm btn-revoke" data-email="${user.email}" data-tenant="${user.tenant}">Oduzmi Vizu</button>`;
                } else {
                    actionButtons = `
                        <button class="btn btn-sm btn-approve" data-email="${user.email}" data-tenant="${user.tenant}">Odobri</button>
                        <button class="btn btn-sm btn-revoke" data-email="${user.email}" data-tenant="${user.tenant}">Blokiraj</button>
                    `;
                }
            }

            tr.innerHTML = `
                <td style="font-weight: 500;">${user.email}</td>
                <td>
                    <input type="text" id="tenant-input-${cleanEmailId}" value="${user.tenant || ''}" 
                           style="background: #1c1c1e; color: #fff; border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px; font-size: 13px; width: 160px;">
                </td>
                <td style="text-transform: uppercase; font-size: 12px; color: var(--text-secondary); font-weight: 600;">${user.role || 'client'}</td>
                <td>${statusBadge}</td>
                <td>${verzijaPecat}</td>
                <td style="text-align: right;">${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });

        // Kačimo event listenere na dinamički generisana dugmad u tabeli
        tbody.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => promeniStatusKlijentaMaster(btn.dataset.email, 'approved', btn.dataset.tenant));
        });
        tbody.querySelectorAll('.btn-revoke').forEach(btn => {
            btn.addEventListener('click', () => promeniStatusKlijentaMaster(btn.dataset.email, 'blocked', btn.dataset.tenant));
        });

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--red-alert); padding: 30px; font-weight: 500;">❌ Greška prilikom skeniranja magistrale: ${err.message}</td></tr>`;
    }
}

// 🐣 PROVIŽONING (LANSER) NOVOG KLIJENTSKOG PROSTORA
async function masterKreirajNovogKorisnika() {
    const emailInput = document.getElementById('client-email');
    const subInput = document.getElementById('client-subdomain');

    if (!emailInput || !subInput) return;

    const email = emailInput.value.trim();
    const subdomain = subInput.value.trim().toLowerCase();

    if (!email || !subdomain) return;

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        alert("❌ Greška u formatu: Poddomen sme da sadrži samo mala slova, brojeve i crtice.");
        return;
    }

    if (!confirm(`Lansirati potpuno izolovani prostor na ivici mreže za korisnika: ${email} na adresi https://${subdomain}.selection.rs?`)) return;

    try {
        const response = await fetch(`${API_BASE}/provision_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, subdomain, role: "client" })
        });

        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 USPEŠNO: Prostor za ${subdomain}.selection.rs uspešno alociran u pending statusu!`);
            emailInput.value = '';
            subInput.value = '';
            await osveziMasterTabeluKorisnika();
        } else {
            alert(`❌ Odbijeno sa ivice: ${rez.error || "Nepoznata validaciona greška."}`);
        }
    } catch (error) {
        alert("❌ Greška u komunikaciji sa bezbednosnim provajderom.");
    }
}

// 🔑 MUTACIJA STATUSI / VIZE I AKTIVACIJA TEMPORALNOG ŠTITA
async function promeniStatusKlijentaMaster(email, status, oldTenant) {
    const cleanEmailId = email.replace(/[@.]/g, '_');
    const inputElement = document.getElementById(`tenant-input-${cleanEmailId}`);
    const targetSubdomain = inputElement ? inputElement.value.trim().toLowerCase() : oldTenant;

    if (!targetSubdomain) {
        alert("❌ Operaciona greška: Validno mapiranje poddomena je obavezno.");
        return;
    }

    const confirmMessage = status === 'approved'
        ? `Odobriti vizu i aktivirati radni prostor za ${email} na domenu https://${targetSubdomain}.selection.rs?`
        : `Prekinuti sistemsku vizu za ${email}? Ova izmena kroz naš Temporal Guard trenutno poništava sve aktivne tokene klijenta na internetu.`;

    if (!confirm(confirmMessage)) return;

    try {
        const response = await fetch(`${API_BASE}/api/master/update_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                klijentEmail: email,
                noviStatus: status,
                noviTenant: targetSubdomain,
                novaUloga: "client"
            })
        });

        if (response.ok) {
            await osveziMasterTabeluKorisnika();
        } else {
            alert("🔒 Odbijeno sa Security Gateway kapije.");
        }
    } catch (e) {
        alert("❌ Veza sa Control Plane-om je prekinuta.");
    }
}