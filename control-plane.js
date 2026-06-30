// SELECTION CONTROL PLANE — control-plane.js (V6.1.0 - Production D1 Unified Bridge)
const API_BASE = "https://api.selection.rs";

let trenutnoUlogovaniKorisnik = null;
let sviKorisniciKes = [];

export async function studioFetch(url, options = {}) {
    options.headers = {
        "Content-Type": "application/json",
        // ⚡ UNIFIKACIJA: Šaljemo token kroz standardni Authorization i cross-domain šine
        "Authorization": window.CF_SOURCE_TOKEN ? `Bearer ${window.CF_SOURCE_TOKEN}` : "",
        "x-source-token": window.CF_SOURCE_TOKEN || "",
        ...(options.headers || {})
    };
    options.credentials = 'include';

    try {
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            console.warn("🚨 [Security Shield] Saas kapija prekinula sesiju (401/403).");
            alert("🔒 Vaša administrativna sesija je istekla ili nemate Master privilegije.");
            document.dispatchEvent(new CustomEvent('ShellAuthLost', { detail: { reason: "Session expired." } }));
            throw new Error("Unauthorized_Bypass_Blocked");
        }
        return response;
    } catch (e) {
        if (e.message === "Unauthorized_Bypass_Blocked") throw e;
        console.error("❌ [Network Crash]:", e.message);
        throw e;
    }
}

function initControlPlane() {
    console.log("🎮 [Control Plane] Komandna stanica aktivirana.");
    const identityBadge = document.getElementById('admin-identity');
    if (identityBadge && trenutnoUlogovaniKorisnik) {
        identityBadge.textContent = trenutnoUlogovaniKorisnik.email;
    }

    osveziMasterTabeluKorisnika();
    setupEventListeners();
}

// 🧠 KRITIČNI KRUG ODREDIŠTA: Provera i evakuacija latched stanja na ulazu
function proveriIBootstrapujIzLatchedStanja() {
    const cachedIdentity = window.__CF_BOOTSTRAP_STATE__;
    if (cachedIdentity) {
        console.log("⚡ [Control Plane] Trka pobeđena! Identitet uspešno evakuisan iz globalnog latch-a:", cachedIdentity.email);
        trenutnoUlogovaniKorisnik = cachedIdentity;
        initControlPlane();
        return true;
    }
    return false;
}

// Slušamo event ako se control-plane učitao pre završetka bootstrapa
document.addEventListener('ShellProvisionalReady', (event) => {
    if (trenutnoUlogovaniKorisnik) return; // Ako smo već podigli sistem kroz latch, ignoriši zakasneli event
    trenutnoUlogovaniKorisnik = event.detail;
    console.log("🚀 [Control Plane] Signal primljen preko mrežnog eventa:", trenutnoUlogovaniKorisnik.email);
    initControlPlane();
});

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
                const subdomainMec = k.subdomain ? k.subdomain.toLowerCase().includes(pojam) : false;
                return emailMec || phoneMec || subdomainMec;
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
        const cistiPhone = klijent.phone ? String(klijent.phone).trim().replace(/\s+/g, '') : '';
        const whatsappNumber = cistiPhone.replace(/[^0-9]/g, '');

        // --- PRIPREMA DINAMIČKIH WHATSAPP PORUKA ---
        let waUrl = "";
        let waLabel = "Pristup";

        if (whatsappNumber) {
            const txtActive = `🎉 *VIZA ODOBRENA — Pristup Otključan!*\n\n🌐 *Vaš aktivni domen:* https://${cistiSubdomain}.selection.rs\n🎨 *Vaš kreativni Composer:* https://composer.selection.rs\n\nDobrodošli u Selection ekosistem.`;
            const txtBlocked = `🔒 *OBAVEŠTENJE: Viza Privremeno Ukinuta*\n\nStatus Vaše digitalne vize za domen *${cistiSubdomain}.selection.rs* je promenjen u *SUSPENDOVAN*. Radni prostor je privremeno zaključan.`;
            const txtGrace = `🗑️ *UPOZORENJE: Pokrenut Grace Period (30 Dana)*\n\nVaš prostor *${cistiSubdomain}.selection.rs* je obeležen za brisanje. Imate 30 dana da preuzmete podatke pre trajnog uništenja na našem sistemu.`;

            if (klijent.status === 'active') {
                waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(txtActive)}`;
                waLabel = "Pristup";
            } else if (klijent.status === 'blocked') {
                waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(txtBlocked)}`;
                waLabel = "Suspenzija";
            } else if (klijent.status === 'grace_period') {
                waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(txtGrace)}`;
                waLabel = "Grace";
            } else {
                // Za pending / čekaonicu šaljemo podrazumevani pristupni šablon
                waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(txtActive)}`;
                waLabel = "Pristup";
            }
        }

        // 1. Kolona: Korisnik (Email)
        const tdEmail = document.createElement('td');
        tdEmail.style.cssText = "font-weight: 600; color: #fff;";
        tdEmail.textContent = klijent.email;
        tr.appendChild(tdEmail);

        // 2. Kolona: Kontakt Telefon
        const tdPhone = document.createElement('td');
        tdPhone.style.cssText = "color: var(--text-secondary); font-size: 13px; font-family: monospace;";
        tdPhone.textContent = klijent.phone || "—";
        tr.appendChild(tdPhone);

        // 3. Kolona: Tenant (Poddomen)
        const tdTenant = document.createElement('td');
        if (cistiSubdomain) {
            tdTenant.innerHTML = `<a href="https://${cistiSubdomain}.selection.rs" target="_blank" class="shell-link" style="color: var(--gold); text-decoration: none; font-weight: 500; font-family: monospace; display: inline-flex; align-items: center; gap: 4px;">🌐 ${cistiSubdomain}.selection.rs</a>`;
        } else {
            tdTenant.innerHTML = `<span style="color: var(--text-secondary); font-size: 12px; font-style: italic;">Nije alociran</span>`;
        }
        tr.appendChild(tdTenant);

        // 4. Kolona: Uloga
        const tdRole = document.createElement('td');
        tdRole.style.cssText = "text-transform: uppercase; font-size: 11px; color: var(--text-secondary); font-weight: 600; letter-spacing:0.5px;";
        tdRole.textContent = klijent.role || 'client';
        tr.appendChild(tdRole);

        // 5. Kolona: Status Vize
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

        // 6. Kolona: Verzija Zapisa / Datum
        const tdDate = document.createElement('td');
        tdDate.innerHTML = `<span class="badge badge-version">${klijent.created_at ? klijent.created_at.split(' ')[0] : 'Uživo'}</span>`;
        tr.appendChild(tdDate);

        // 7. Kolona: Akcije
        const tdActions = document.createElement('td');
        tdActions.style.cssText = "text-align: right; display: flex; gap: 8px; justify-content: flex-end; align-items: center; wrap: nowrap;";

        if (klijent.role === "master") {
            tdActions.innerHTML = `<span style="color: var(--gold); font-size: 12px; font-style: italic; font-weight: 500;">Centralno Jezgro</span>`;
        } else {
            // Oko dugmeta za Studio (otvara novi prozor eksternom putanjom)
            if (klijent.status === 'active' && cistiSubdomain) {
                const btnStudio = document.createElement('a');
                btnStudio.href = `https://composer.selection.rs/studio/?mode=admin&tenant=${klijent.tenant_id}&token=${window.CF_SOURCE_TOKEN}`;
                btnStudio.target = "_blank";
                btnStudio.className = "btn btn-sm";
                btnStudio.style.cssText = "background: var(--gold); color: #000; border: none; font-weight: 600; text-decoration: none; padding: 5px 12px; border-radius: 4px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;";
                btnStudio.innerHTML = `👁️ Otvori Studio`;
                tdActions.appendChild(btnStudio);
            }

            // Upravljanje administrativnim statusima
            if (klijent.status === 'pending') {
                const btnApprove = document.createElement('button');
                btnApprove.className = "btn btn-sm btn-approve";
                btnApprove.textContent = "Odobri Vizu";
                btnApprove.onclick = () => promeniStatusKlijentaMaster(klijent.id, 'approve');
                tdActions.appendChild(btnApprove);
            } else if (klijent.status === 'active') {
                const btnBlock = document.createElement('button');
                btnBlock.className = "btn btn-sm btn-revoke";
                btnBlock.textContent = "Oduzmi Vizu";
                btnBlock.onclick = () => promeniStatusKlijentaMaster(klijent.id, 'revoke');
                tdActions.appendChild(btnBlock);
            } else if (klijent.status === 'blocked' || klijent.status === 'grace_period') {
                const btnRestore = document.createElement('button');
                btnRestore.className = "btn btn-sm btn-approve";
                btnRestore.style.cssText = "background: rgba(50,220,50,0.15); border: 1px solid rgba(50,220,50,0.4); color: #70f070;";
                btnRestore.textContent = "🔄 Vrati Vizu";
                btnRestore.onclick = () => promeniStatusKlijentaMaster(klijent.id, 'restore');
                tdActions.appendChild(btnRestore);
            }

            // Grace period / Brisanje
            if (klijent.status !== 'grace_period') {
                const btnDelete = document.createElement('button');
                btnDelete.className = "btn btn-sm btn-delete";
                btnDelete.textContent = "🗑 Obriši";
                btnDelete.style.cssText = "background: rgba(220,50,50,0.15); border: 1px solid rgba(220,50,50,0.4); color: #ff6b6b; padding: 5px 10px; border-radius: 4px; font-size: 12px;";
                btnDelete.onclick = () => obrisiKlijentaMaster(klijent.id, klijent.email);
                tdActions.appendChild(btnDelete);
            }

            // 🟢 ZELENO DUGME: Brzo slanje WhatsApp-a zasnovano na trenutnom stanju baze
            if (whatsappNumber) {
                const btnWa = document.createElement('a');
                btnWa.href = waUrl;
                btnWa.target = "_blank";
                btnWa.title = `Ispucaj WhatsApp poruku za status: ${waLabel}`;
                btnWa.style.cssText = "background: #128C7E; color: #fff; font-weight: 600; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; transition: opacity 0.2s; cursor: pointer;";
                btnWa.innerHTML = `💬 WA: ${waLabel}`;
                tdActions.appendChild(btnWa);
            }
        }

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
}

async function promeniStatusKlijentaMaster(requestId, akcija) {
    let potvrdnaPoruka = "";
    let ruta = "";
    switch (akcija) {
        case 'approve':
            potvrdnaPoruka = "Odobriti aktivaciju i izdati vizu klijentu?";
            ruta = '/api/master/approve-user';
            break;
        case 'revoke':
            potvrdnaPoruka = "Suspendovati klijenta i privremeno ukinuti vizu?";
            ruta = '/api/master/revoke-user';
            break;
        case 'restore':
            potvrdnaPoruka = "Poništiti sve restrikcije, prekinuti brisanje i ponovo aktivirati vizu klijentu?";
            ruta = '/api/master/approve-user';
            break;
        default:
            return;
    }
    if (!confirm(potvrdnaPoruka)) return;
    try {
        const response = await studioFetch(`${API_BASE}${ruta}`, { method: 'POST', body: JSON.stringify({ requestId }) });
        const rez = await response.json();
        if (response.ok && rez.success) await osveziMasterTabeluKorisnika();
    } catch (e) { console.error(e); }
}

async function obrisiKlijentaMaster(requestId, email) {
    if (!confirm(`🗑️ Pokrenuti Grace Period za klijenta: ${email}?`)) return;
    try {
        const response = await studioFetch(`${API_BASE}/api/master/delete-request`, { method: 'POST', body: JSON.stringify({ requestId }) });
        const rez = await response.json();
        if (response.ok && rez.success) await osveziMasterTabeluKorisnika();
    } catch (e) { console.error(e); }
}

async function masterKreirajNovogKorisnika() {
    const emailInput = document.getElementById('client-email');
    const phoneInput = document.getElementById('client-phone');
    const subInput = document.getElementById('client-subdomain');
    if (!emailInput || !subInput || !phoneInput) return;

    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim().replace(/\s+/g, '');
    const subdomain = subInput.value.trim().toLowerCase();
    if (!email || !subdomain || !phone) return;

    try {
        const response = await studioFetch(`${API_BASE}/api/onboarding/request`, {
            method: 'POST',
            body: JSON.stringify({ company_name: "Selection Klijent", email, phone, requested_subdomain: subdomain })
        });
        const rez = await response.json();
        if (response.ok && rez.success) {
            alert(`🎉 Zahtev alociran!`);
            emailInput.value = ''; phoneInput.value = ''; subInput.value = '';
            await osveziMasterTabeluKorisnika();
        }
    } catch (error) { console.error(error); }
}

// 🏁 EKSPRESNO OKIDANJE: Proveravamo latch odmah pri samom inicijalnom učitavanju skripte!
proveriIBootstrapujIzLatchedStanja();