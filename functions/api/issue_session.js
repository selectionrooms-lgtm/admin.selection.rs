// SELECTION ADMIN FRONT — Functions Gateway Proxy (V19.0.0 - Identity Mapping Fix)

export async function onRequestGet(context) {
    const { request, env } = context;

    // 🔍 FRONTEND OSCILOSKOP: Proveravamo šta Pages uopšte dobija od Cloudflare Access-a
    console.log("==================== [PAGES ACCESS INBOUND] ====================");
    console.log("[PAGES] CF Access email:", request.headers.get("Cf-Access-Authenticated-User-Email"));
    console.log("[PAGES] CF Access JWT exists:", !!request.headers.get("Cf-Access-Jwt-Assertion"));
    console.log("[PAGES] Svi primljeni ključevi hedera:", [...request.headers.keys()]);
    console.log("================================================================");

    const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
    const cfAccessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

    try {
        // 🌐 2. Šaljemo upit našem vrhovnom carinskom skladištu (Centralni API)
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

        const responseData = await apiResponse.json();

        // 🛡️ POPRAVKA: Pravilno mapiranje podataka iz centralnog Identity objekta Workera
        const identityData = responseData.identity || responseData;

        if (!identityData || !identityData.email) {
            throw new Error("Centralni API nije vratio validan identitet korisnika.");
        }

        const tajnaKljuca = env.JWT_SECRET;
        if (!tajnaKljuca) {
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
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12) // 12 sati važnosti
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