// admin/bootstrap.js (V25.5.0 - STERILE DIAGNOSTIC BLOCK)
const API_BASE = "https://api.selection.rs";

export const AUTH_STATE = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    ERROR: "error"
};

async function safeFetch(url) {
    console.log("📡 [Network] START FETCH:", url);

    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    });

    console.log("📡 [Network] FETCH RESPONSE STATUS:", res.status);

    const text = await res.text();
    const cleanText = text.trim();
    const looksLikeHtml = cleanText.startsWith("<!DOCTYPE") || cleanText.startsWith("<html");

    if (looksLikeHtml) {
        throw new Error("HTML_FALLBACK_DETECTED");
    }

    if (res.status === 401) {
        throw new Error("API_STATUS_401");
    }

    if (!res.ok) {
        throw new Error(`API_STATUS_${res.status}`);
    }

    try {
        return JSON.parse(cleanText);
    } catch {
        throw new Error("BAD_RESPONSE_FORMAT");
    }
}

export async function bootstrapAdmin() {
    // Brojač izvršenja na samom vrhu funkcije
    console.count("🔍 [Kernel] BOOTSTRAP_EXECUTION_COUNT");

    const root = document.getElementById("selection-admin-root");
    if (!root) {
        console.error("⛔ [Kernel] Root element fali u DOM-u.");
        return null;
    }

    root.setAttribute("data-status", AUTH_STATE.LOADING);

    try {
        const profile = await safeFetch(`${API_BASE}/api/me`);
        console.log("🟢 [Kernel] FETCH DONE - Uspešna autorizacija.");

        root.setAttribute("data-status", AUTH_STATE.AUTHENTICATED);
        return profile;

    } catch (err) {
        // GVOZDENI DIAGNOSTIK BLOK — SVI REDIREKTI I SKOKOVI SU INTERNIRANI
        console.error("🚨 [Kernel] AUTH DEBUG CATCH:", err.message);

        root.setAttribute("data-status", AUTH_STATE.UNAUTHENTICATED);

        // ZABETONIRAN STOP. Nema koda, nema navigacije, nema ničega posle ovoga.
        return null;
    }
}

// Jedini korenski okidač pri učitavanju fajla
bootstrapAdmin();