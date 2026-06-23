// Pomoćna funkcija za čitanje kolačića na serveru
function uzmiKolacicIzHeadera(headers, name) {
    const cookieHeader = headers.get('Cookie');
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';');
    for (let cookie of cookies) {
        const [key, val] = cookie.trim().split('=');
        if (key === name) return val;
    }
    return null;
}

export async function onRequestGet(context) {
    const { request, env } = context;

    // 1. Proba preko standardnih headera
    let email = request.headers.get('Cf-Access-Authenticated-User-Email') ||
        request.headers.get('Cf-Access-Authenticated-With-User-Email');

    // 2. Pošto je HTTP Only na OFF, čupamo token direktno iz kolačića zahteva!
    if (!email) {
        const cfAuthToken = uzmiKolacicIzHeadera(request.headers, 'CF_Authorization');
        if (cfAuthToken) {
            try {
                const delovi = cfAuthToken.split('.');
                if (delovi.length === 3) {
                    const rawPayload = atob(delovi[1].replace(/-/g, '+').replace(/_/g, '/'));
                    const parsedJwt = JSON.parse(rawPayload);
                    if (parsedJwt.email) {
                        email = parsedJwt.email;
                        console.log("🎯 Identitet iščupan iz kolačića:", email);
                    }
                }
            } catch (e) {
                console.error("Greška pri dekodiranju:", e.message);
            }
        }
    }

    if (!email) {
        return new Response(JSON.stringify({ error: "🔒 Nema Access identiteta." }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const cisceniEmail = email.trim().toLowerCase();

    // Gvozdeni Master Overrider za tebe
    let userContext = { email: cisceniEmail, tenant: "admin", role: "client" };
    if (cisceniEmail === "selectionrooms@gmail.com") {
        userContext.role = "master";
    } else {
        if (env.SELECTION_KV) {
            const raw = await env.SELECTION_KV.get(`user:${cisceniEmail}`);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    userContext.tenant = parsed.tenant || parsed.subdomain || null;
                    userContext.role = parsed.role || "client";
                } catch (e) {
                    userContext.tenant = raw.trim();
                }
            }
        }
    }

    const sessionPayload = {
        email: userContext.email,
        tenant: userContext.tenant,
        role: userContext.role,
        exp: Date.now() + (1000 * 60 * 60 * 12)
    };

    const tajnaKljuca = env.JWT_SECRET || "PodrazumevanaSelectionTajna33#";

    // Kriptografski potpisujemo naš token (HMAC SHA-256)
    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(tajnaKljuca);
    const key = await crypto.subtle.importKey("raw", secretKeyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const stringifiedPayload = JSON.stringify(sessionPayload);
    const base64Payload = btoa(unescape(encodeURIComponent(stringifiedPayload))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Payload));
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const potpisaniToken = `${base64Payload}.${base64Signature}`;

    return new Response(JSON.stringify({ token: potpisaniToken }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
}