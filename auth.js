// auth.js — Identity & Security Gateway Layer
const API_BASE = "https://shell.selection.rs";

export async function verifyIdentityAndGetProfile() {
    const rootShield = document.getElementById('selection-saas-root-shield');
    const badge = document.getElementById('user-session-badge');

    try {
        console.log("🪙 Phase 1: Initiating Token Exchange...");
        const tokenRes = await fetch("/issue_session", { credentials: "include" });
        if (!tokenRes.ok) throw new Error("Cloudflare Access rejected local session issuance.");

        const tokenData = await tokenRes.json();
        if (!tokenData.token) throw new Error("Token mint returned empty.");

        localStorage.setItem('selection_session_token', tokenData.token);

        console.log("📡 Phase 2: Authenticating to public gateway...");
        const res = await fetch(`${API_BASE}/get_user`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenData.token}` }
        });

        if (!res.ok) throw new Error(`Shell gateway error status: ${res.status}`);

        const userData = await res.json();
        if (userData.error) throw new Error(userData.error);

        const profil = userData.user || userData;
        const userEmail = profil.email || localStorage.getItem('userEmail') || "selectionrooms@gmail.com";
        const userRole = profil.role || "client";
        const userStatus = profil.status || "pending";
        let activeSubdomain = profil.tenant || profil.subdomain || "admin";

        if (!activeSubdomain || activeSubdomain === "undefined") activeSubdomain = "admin";

        // 🧱 PROVERA ULJEZA ILI KLIJENTA NA ČEKANJU (WAITING ROOM ENGINE)
        if (userRole !== "master" && userStatus !== "approved") {
            console.warn(`🔒 Identity parked in waiting room [Status: ${userStatus}].`);
            if (rootShield) {
                rootShield.setAttribute('data-status', 'pending');
                rootShield.className = "global-splash-lockout"; // Aktivira fiksiran mrak preko celog ekrana

                // Čist, centriran HTML bez okvira koji guše sredinu
                rootShield.innerHTML = `
                    <div class="global-splash-wrapper">
                        <div style="font-size: 55px; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(214,180,131,0.15));">🔒</div>
                        <h1 style="font-family: 'Cinzel', serif; color: #d4b483; font-size: 2.1rem; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">Account Review in Progress</h1>
                        <p style="color: #eeeeee; font-size: 0.95rem; line-height: 1.6; opacity: 0.85; margin-bottom: 20px;">
                            Hello <strong style="color:#d4b483; font-weight: 600;">${userEmail}</strong>. Your Selection SaaS space has been successfully reserved and provisioned on the Edge node, but it is currently awaiting administration approval.
                        </p>
                        <p style="font-size: 0.9rem; color: #d4b483; font-weight: 500; letter-spacing: 0.5px; opacity: 0.95; line-height: 1.5;">
                            <i class="fa-solid fa-clock-rotate-left" style="margin-right: 6px;"></i> Administration is verifying your metrics and will activate your panel shortly.
                        </p>
                        <span style="font-size: 0.75rem; margin-top: 60px; opacity: 0.2; letter-spacing: 0.5px; display: block;">Selection SaaS Engine • Identity Verified at Edge</span>
                    </div>
                `;
            }
            if (badge) {
                badge.innerHTML = `⏳ <span style="color: #d4b483; font-weight: 600;">Awaiting Approval</span>`;
                badge.style.display = "flex";
            }
            return null; // Stopira učitavanje ostatka aplikacije
        }

        // 🔓 USPEŠNO ODOBREN PROLAZ
        if (rootShield) rootShield.setAttribute('data-status', 'approved');
        if (badge) {
            const icon = userRole === "master" ? "👑" : "🔒";
            badge.innerHTML = `${icon} <span style="color: var(--admin-accent); font-weight: 600;">${userEmail}</span>`;
            badge.style.display = "flex";
        }

        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('userSubdomain', activeSubdomain);
        window.currentSubdomain = activeSubdomain;

        return { userEmail, userRole, userStatus, activeSubdomain };

    } catch (err) {
        console.error("❌ Gateway failure. Sandbox recovery...", err);
        if (rootShield) rootShield.setAttribute('data-status', 'approved');
        const fallbackSubdomain = localStorage.getItem('userSubdomain') || 'admin';
        window.currentSubdomain = fallbackSubdomain;
        return { userEmail: "fallback@selection.rs", userRole: "master", userStatus: "approved", activeSubdomain: fallbackSubdomain };
    }
}