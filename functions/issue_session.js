// SELECTION ADMIN FRONT — Functions Gateway Proxy (V19.0.0)

export async function onRequestGet(context) {
    const { request, env } = context;

    // 1. Pokupiš mrežne Access podatke koji su stigli na admin.selection.rs
    const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
    const cfAccessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

    // 🌐 2. Šaljemo upit našem vrhovnom carinskom skladištu (Centralni API)
    // Ne čitamo bazu odavde, pitamo direktno api.selection.rs koji je jedini ustavni izvor!
    try {
        const apiResponse = await fetch("https://api.selection.rs/api/me", {
            method: "GET",
            headers: {
                "Cf-Access-Jwt-Assertion": cfAccessJwt || "",
                "Cf-Access-Authenticated-User-Email": cfAccessEmail || "",
                "Content-Type": "application/json"
            }
        });

        if (!apiResponse.ok) {
            return new Response(JSON.stringify({ error: "🔒 Centralni API je odbio verifikaciju." }), {
                status: apiResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Centralni API nam vraća proverene podatke o tebi (email, role, tenant)
        const identityData = await apiResponse.json();

        // ⏳ Ako nam u budućnosti zatreba klesanje kratkotrajnog tokena za Studio direktno sa fronta:
        // Koristimo isti gvozdeni JWT_SECRET koji je unet u Pages environment variables.
        const tajnaKljuca = env.JWT_SECRET;
        if (!tajnaKljuca) {
            // Ako Pages nema JWT_SECRET, samo prosleđujemo odgovor centralnog API-ja brauzeru
            return new Response(JSON.stringify({ user: identityData }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
            });
        }

        // Kriptografski potpisujemo token za Composer Sandbox (Isti HMAC SHA-256 algoritam)
        const sessionPayload = {
            email: identityData.email,
            tenant: identityData.tenant,
            role: identityData.role,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12) // Važi 12 sati (Unix timestamp standard!)
        };

        const encoder = new TextEncoder();
        const secretKeyData = encoder.encode(tajnaKljuca);
        const key = await crypto.subtle.importKey("raw", secretKeyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

        const stringifiedPayload = JSON.stringify(sessionPayload);
        const base64Payload = btoa(unescape(encodeURIComponent(stringifiedPayload))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Payload));
        const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

        const potpisaniToken = `${base64Payload}.${base64Signature}`;

        return new Response(JSON.stringify({ token: potpisaniToken, user: identityData }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        });

    } catch (err) {
        console.error("💥 Admin Bootstrap Proxy Crash:", err.message);
        return new Response(JSON.stringify({ error: "INTERNAL_PROXY_ERROR", details: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}