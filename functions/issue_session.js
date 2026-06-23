// =========================================================================
// SELECTION SAAS — /functions/issue_session.js (Admin Bootstrap Kovnica)
// =========================================================================

// 🔐 Web Crypto API: Generisanje Selection V18-safe Bearer Tokena (HMAC SHA-256)
async function generisiPotpisanToken(payload, secretKeyStr) {
    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(secretKeyStr);
    const key = await crypto.subtle.importKey(
        "raw", secretKeyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );

    const stringifiedPayload = JSON.stringify(payload);
    const base64Payload = btoa(unescape(encodeURIComponent(stringifiedPayload)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Payload));

    // V8-safe prebacivanje buffera u Base64URL string
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    return `${base64Payload}.${base64Signature}`;
}

// 🧠 KV Lookup za prava i poddomene klijenta
async function getTenantContext(email, env) {
    if (!email) return null;
    const cisceniEmail = email.trim().toLowerCase();

    // Master overrider za tvoj glavni nalog
    if (cisceniEmail === "selectionrooms@gmail.com") {
        return { email: cisceniEmail, tenant: "admin", role: "master" };
    }

    // Proveravamo da li tvoj Pages projekat ima vezan isti SELECTION_KV kao i shell radnik
    if (!env.SELECTION_KV) {
        return { email: cisceniEmail, tenant: "canvas", role: "client" };
    }

    const raw = await env.SELECTION_KV.get(`user:${cisceniEmail}`);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        return {
            email: cisceniEmail,
            tenant: parsed.tenant || parsed.subdomain || null,
            role: parsed.role || "client"
        };
    } catch (e) {
        return { email: cisceniEmail, tenant: raw.trim(), role: "client" };
    }
}

// 🌐 Glavni Pages Functions Handler za GET /issue_session
export async function onRequestGet(context) {
    const { request, env } = context;

    // 👤 Prošireno čitanje identiteta (Hvatamo sve moguće Cloudflare Access kanale)
    let email = request.headers.get('Cf-Access-Authenticated-User-Email') ||
        request.headers.get('Cf-Access-Authenticated-With-User-Email');

    // 💡 Ekstra trik: Ako zaglavlja zakazu, Pages Functions imaju Access podatke spakovane unutar request.cf objekta
    if (!email && request.cf && request.cf.jwtUser) {
        email = request.cf.jwtUser.email;
    }

    if (!email) {
        // Privremeni debug: Vratićemo u telu odgovora šta tačno radnik vidi u zaglavljima da lakše lociramo
        const sviHeaderi = {};
        for (let [key, value] of request.headers.entries()) {
            if (key.startsWith('cf-access')) sviHeaderi[key] = value;
        }
        return new Response(JSON.stringify({
            error: "🔒 Gvozdeni Štit: Nema Cloudflare Access identiteta.",
            debug_seen_headers: sviHeaderi
        }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 🪙 Pakujemo čist, unificiran i privremen stateless koverat (važi 12 sati)
    const sessionPayload = {
        email: userContext.email,
        tenant: userContext.tenant,
        role: userContext.role,
        exp: Date.now() + (1000 * 60 * 60 * 12)
    };

    const tajnaKljuca = env.JWT_SECRET || "PodrazumevanaSelectionTajna33#";
    const potpisaniToken = await generisiPotpisanToken(sessionPayload, tajnaKljuca);

    return new Response(JSON.stringify({ token: potpisaniToken }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}