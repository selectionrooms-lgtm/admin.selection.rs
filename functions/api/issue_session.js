// SELECTION ADMIN FRONT — Functions Gateway Proxy (V20.0.0 - Pure Token Extraction Pipe)

export async function onRequestGet(context) {
    const { request } = context;

    // Uzimamo jedini stvarni kriptografski dokaz identiteta koji nam Cloudflare šalje na zaštićenom frontendu
    const accessJwt = request.headers.get("cf-access-jwt-assertion");

    if (!accessJwt) {
        return new Response(JSON.stringify({
            success: false,
            error: "🔒 Bezbednosna rampa: Cloudflare Access JWT nije pronađen u mrežnim zaglavljima."
        }), {
            status: 401,
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    // Bez ijednog eksternog mrežnog poziva, samo pakujemo čist token u striktan JSON ugovor i vraćamo ga frontu
    return new Response(JSON.stringify({
        success: true,
        token: accessJwt
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
        }
    });
}