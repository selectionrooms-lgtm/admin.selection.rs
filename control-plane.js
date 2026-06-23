// control-plane.js — Master Control Terminal Engine
const API_BASE = "https://shell.selection.rs";

export function initControlPlaneElements() {
    // Vezujemo funkcije na window objekat isključivo ako je master aktiviran
    window.otvoriMasterControlPlane = otvoriMasterControlPlane;
    window.zatvoriMasterControlPlane = zatvoriMasterControlPlane;
    window.masterKreirajNovogKorisnika = masterKreirajNovogKorisnika;
    window.promeniStatusKlijentaMaster = promeniStatusKlijentaMaster;
}

export async function otvoriMasterControlPlane() {
    const overlay = document.getElementById('master-control-plane-overlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    await osveziMasterTabeluKorisnika();
}

export function zatvoriMasterControlPlane() {
    document.getElementById('master-control-plane-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

export async function osveziMasterTabeluKorisnika() {
    const tbody = document.getElementById('master-users-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--admin-accent); font-weight:600;">⚡ Scanning Edge KV bus, fetching user records...</td></tr>`;

    try {
        const token = localStorage.getItem('selection_session_token');
        const res = await fetch(`${API_BASE}/api/master/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Edge Kernel rejected access control read verification status.");
        const data = await res.json();
        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--admin-muted);">No tenant registration matrices discovered on the cloud link.</td></tr>`;
            return;
        }

        document.getElementById('stat-total-users').innerText = data.users.length;
        document.getElementById('stat-pending-users').innerText = data.users.filter(u => u.status === 'pending').length;
        document.getElementById('stat-approved-users').innerText = data.users.filter(u => u.status === 'approved').length;

        tbody.innerHTML = '';
        data.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--admin-border)";

            let statusBadge = user.status === 'approved'
                ? `<span style="background: rgba(46, 204, 113, 0.1); color: #2ecc71; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">✔️ APPROVED</span>`
                : user.status === 'blocked'
                    ? `<span style="background: rgba(184, 29, 36, 0.1); color: #b81d24; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">⛔ BLOCKED</span>`
                    : `<span style="background: rgba(212, 180, 131, 0.1); color: var(--admin-accent); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">⏳ PENDING</span>`;

            let actionButton = user.email !== "selectionrooms@gmail.com"
                ? (user.status === 'approved'
                    ? `<button onclick="promeniStatusKlijentaMaster('${user.email}', 'blocked', '${user.tenant}')" style="background:#b81d24; border:none; color:#fff; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:700;">Revoke Access</button>`
                    : `<button onclick="promeniStatusKlijentaMaster('${user.email}', 'approved', '${user.tenant}')" style="background:#2ecc71; border:none; color:#0a1015; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:800;">Approve Tenant</button>`)
                : `<span style="color:var(--admin-muted); font-size:0.75rem; font-style:italic;">Core Master Node</span>`;

            tr.innerHTML = `
                <td style="padding: 14px; font-weight:600; color:#fff;">${user.email}</td>
                <td style="padding: 14px;">
                    <input type="text" id="tenant-input-${user.email.replace(/[@.]/g, '_')}" value="${user.tenant || ''}" style="background:#070b0e; color:#fff; border:1px solid var(--admin-border); padding:6px 10px; border-radius:6px; font-size:0.85rem; width:140px;">
                </td>
                <td style="padding: 14px; text-transform:uppercase; font-size:0.8rem; color:var(--admin-muted); font-weight:600;">${user.role || 'client'}</td>
                <td style="padding: 14px; color:var(--admin-muted); font-size:0.85rem;">${user.odobren_datuma || user.created_at || 'N/A'}</td>
                <td style="padding: 14px;">${statusBadge}</td>
                <td style="padding: 14px; text-align: right;">${actionButton}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#b81d24; font-weight:600;">❌ Matrix engine exception error: ${err.message}</td></tr>`;
    }
}

export async function masterKreirajNovogKorisnika() {
    const subInput = document.getElementById('master-novi-subdomain');
    const emailInput = document.getElementById('master-novi-email');
    const statusPoruka = document.getElementById('master-status-poruka');
    if (!subInput || !emailInput || !statusPoruka) return;

    const subdomain = subInput.value.trim().toLowerCase();
    const email = emailInput.value.trim();

    if (!subdomain || !email) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Operations Error: Credentials values requested empty bounds!"; return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Format Error: Subdomain restricted to lowercase alphanumerics and hyphens."; return;
    }

    if (!confirm(`Launch brand new cloud isolated workspace space layer at https://${subdomain}.selection.rs for client user identity: ${email}?`)) return;
    statusPoruka.style.color = "#d4b483"; statusPoruka.style.display = "block"; statusPoruka.innerText = "⚡ Initializing edge slots allocation...";

    try {
        const token = localStorage.getItem('selection_session_token');
        const response = await fetch(`${API_BASE}/provision_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ email: email, subdomain: subdomain, role: "admin" })
        });
        const rez = await response.json();
        if (response.ok && rez.success) {
            statusPoruka.style.color = "#2ecc71";
            statusPoruka.innerHTML = `🎉 SUCCESSFUL ALLOCATION: Spatial layer <strong>${subdomain}</strong> deployed live!<br>🔗 Point Link: <a href="https://${subdomain}.selection.rs" target="_blank" style="color:#2ecc71; text-decoration:underline;">${subdomain}.selection.rs</a>`;
            subInput.value = ''; emailInput.value = '';
        } else {
            statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = `❌ Terminal Rejection: ${rez.error || "Unknown validation exception"}`;
        }
    } catch (error) {
        statusPoruka.style.color = "#b81d24"; statusPoruka.innerText = "❌ Security Connection Error: failed link exchange.";
    }
}

export async function promeniStatusKlijentaMaster(email, status, oldTenant) {
    const idSuffix = email.replace(/[@.]/g, '_');
    const inputElement = document.getElementById(`tenant-input-${idSuffix}`);
    const targetSubdomain = inputElement ? inputElement.value.trim().toLowerCase() : oldTenant;

    if (!targetSubdomain) { alert("❌ Operations Error: Valid subdomain mapping required."); return; }
    const confirmMessage = status === 'approved'
        ? `Authorize secure space visa credentials for ${email} on node address: https://${targetSubdomain}.selection.rs?`
        : `Revoke system permissions for ${email}? This mutation immediately drops the client access window.`;

    if (!confirm(confirmMessage)) return;

    try {
        const token = localStorage.getItem('selection_session_token');
        const response = await fetch(`${API_BASE}/api/master/update_status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ klijentEmail: email, noviStatus: status, noviTenant: targetSubdomain, novaUloga: "client" })
        });
        if (response.ok) { await osveziMasterTabeluKorisnika(); } else { alert("🔒 Security Gate Rejection."); }
    } catch (e) { alert("❌ Control Plane link lost."); }
}