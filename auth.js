// auth.js — Identity & Security Gateway Layer
const API_BASE = "https://shell.selection.rs";

export async function verifyIdentityAndGetProfile() {
    const rootShield = document.getElementById('selection-saas-root-shield');
    const badge = document.getElementById('user-session-badge');

    try {
        console.log("🪙 Phase 1: Initiating Token Exchange via local /issue_session...");
        const tokenRes = await fetch("/issue_session", { credentials: "include" });
        if (!tokenRes.ok) throw new Error("Cloudflare Access rejected local session issuance.");

        const tokenData = await tokenRes.json();
        if (!tokenData.token) throw new Error("Token mint returned an empty signature.");

        localStorage.setItem('selection_session_token', tokenData.token);
        console.log("✅ Phase 1 Successful: Selection Token secured in LocalStorage.");

        console.log("📡 Phase 2: Authenticating to public gateway with Bearer token...");
        const res = await fetch(`${API_BASE}/get_user`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenData.token}` }
        });

        if (!res.ok) throw new Error(`Shell gateway rejected Bearer session with status: ${res.status}`);

        const userData = await res.json();
        console.log("👤 Phase 2 Successful! Raw kernel response payload:", userData);
        if (userData.error) throw new Error(userData.error);

        const profil = userData.user || userData;
        const userEmail = profil.email || localStorage.getItem('userEmail') || "selectionrooms@gmail.com";
        const userRole = profil.role || "client";
        const userStatus = profil.status || "pending";
        let activeSubdomain = profil.tenant || profil.subdomain || "admin";

        if (!activeSubdomain || activeSubdomain === "undefined") activeSubdomain = "admin";

        // 🧱 CHECK THROUGH THE WAITING ROOM GATE
        if (userRole !== "master" && userStatus !== "approved") {
            console.warn(`🔒 Identity parked in waiting room [Status: ${userStatus}].`);
            if (rootShield) {
                rootShield.setAttribute('data-status', 'pending');
                rootShield.className = "global-splash-lockout";
                rootShield.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: 'Montserrat', sans-serif; color: #fff; background-color: #0f171e;">
                        <div style="font-size: 60px; margin-bottom: 25px; filter: drop-shadow(0 0 10px rgba(214,180,131,0.2)); line-height: 1;">🔒</div>
                        <h1 style="font-family: 'Cinzel', serif; color: #d4b483; font-size: 2.2rem; margin: 0 0 12px 0; letter-spacing: 1px; text-transform: uppercase;">Account Review in Progress</h1>
                        <p style="color: #eeeeee; max-width: 480px; font-size: 0.95rem; line-height: 1.6; opacity: 0.85; margin: 0 0 25px 0;">
                            Hello <strong style="color:#d4b483; font-weight: 600;">${userEmail}</strong>. Your Selection SaaS space has been successfully reserved and provisioned on the Edge node, but it is currently awaiting administration approval.
                        </p>
                        <div style="background: rgba(212, 180, 131, 0.03); border: 1px dashed #d4b483; padding: 14px 24px; border-radius: 6px; font-size: 0.85rem; color: #d4b483; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: fit-content; margin: 0 auto;">
                            <i class="fa-solid fa-clock-rotate-left"></i> Administration is verifying your metrics and will activate your panel shortly.
                        </div>
                        <span style="font-size: 0.75rem; margin-top: 50px; opacity: 0.25; letter-spacing: 0.5px; display: block;">Selection SaaS Engine • Identity Verified at Edge</span>
                    </div>
                `;
            }
            if (badge) {
                badge.innerHTML = `⏳ <span style="color: #d4b483; font-weight: 600;">Awaiting Approval</span>`;
                badge.style.display = "flex";
            }
            return null; // Halt process
        }

        // 🔓 IDENTITY APPROVED OVER THE GATE
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
        console.error("❌ Core bootstrap failure. Activating local Devel Fallback...", err);
        if (rootShield) rootShield.setAttribute('data-status', 'approved');
        if (badge) {
            badge.innerHTML = `⚠️ <span style="color: #d4b483; font-weight: 600;">Local Sandbox (Devel)</span>`;
            badge.style.display = "flex";
        }
        const fallbackSubdomain = localStorage.getItem('userSubdomain') || 'admin';
        window.currentSubdomain = fallbackSubdomain;
        return { userEmail: "fallback@selection.rs", userRole: "master", userStatus: "approved", activeSubdomain: fallbackSubdomain };
    }
}