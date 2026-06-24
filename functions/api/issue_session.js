// SELECTION ADMIN FRONT — Functions Gateway Proxy (V19.0.2 - Outbound Forensic Probing)

export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        // 🔍 PAGES OUTBOUND OSCILOSKOP: Skeniramo šta ulazi i šta se pakuje za eksport
        console.log("========== [PAGES OUTBOUND] ==========");
        console.log("CF email inbound:", request.headers.get("Cf-Access-Authenticated-User-Email"));

        const outboundHeaders = {
            "Cf-Access-Jwt-Assertion": request.headers.get("Cf-Access-Jwt-Assertion") || "",
            "Cf-Access-Authenticated-User-Email": request.headers.get("Cf-Access-Authenticated-User-Email") || "",
            "Content-Type": "application/json"
        };

        console.log("Outbound header keys:", Object.keys(outboundHeaders));
        console.log("Outbound email present:", !!outboundHeaders["Cf-Access-Authenticated-User-Email"]);
        console.log("======================================");

        // Ispaljujemo fetch sa spakovanim zaglavljima ka centralnom API-ju
        const apiResponse = await fetch("https://api.selection.rs/api/me", {
            method: "GET",
            headers: outboundHeaders
        });

        if (!apiResponse.ok) {
            return new Response(JSON.stringify({ error: "🔒 Centralni API je odbio verifikaciju." }), {
                status: apiResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        const responseData = await apiResponse.json();
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

        // Klesanje tokena za klijentsku upotrebu (12 sati važnosti)
        const sessionPayload = {
            email: identityData.email,
            tenant: identityData.tenant,
            role: identityData.role,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12)
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