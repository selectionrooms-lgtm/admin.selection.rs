// SELECTION ADMIN FRONT — Functions Gateway Proxy (V19.0.5 - Access Assertion Proxy)

export async function onRequestGet(context) {
    const { request } = context;

    // Uzimamo jedini stvarni kriptografski dokaz identiteta koji nam Cloudflare šalje
    const accessJwt = request.headers.get("cf-access-jwt-assertion");

    if (!accessJwt) {
        return new Response(JSON.stringify({ error: "🔒 Bezbednosna rampa: Cloudflare Access JWT nije pronađen." }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // Ispaljujemo fetch ka centralnom API-ju i prosleđujemo sirovi CF Access token
        const apiResponse = await fetch("https://api.selection.rs/api/me", {
            method: "GET",
            headers: {
                "X-Selection-Access-Assertion": accessJwt,
                "Content-Type": "application/json"
            }
        });

        if (!apiResponse.ok) {
            const errTekst = await apiResponse.text();
            return new Response(JSON.stringify({ error: `🔒 Centralni API odbio verifikaciju: ${errTekst}` }), {
                status: apiResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        // API nam vraća profil i već iskovani dugotrajni unutrašnji token za brauzer!
        const responseData = await apiResponse.json();

        return new Response(JSON.stringify(responseData), {
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