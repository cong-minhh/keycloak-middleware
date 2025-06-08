export default async function authFetch(input, init = {}) {
    const res = await fetch(input, {
        ...init,
        credentials: 'include'     // carry cookies/session
    });

    // If the server tells us “not authenticated” or “forbidden”…
    if (res.status === 401 || res.status === 403) {
        let body = {};
        try {
            body = await res.json();
        } catch (e) {
            // fallback
        }
        // Kick the browser to Keycloak login
        window.location.href = body.loginUrl || '/login';
        // never resolve with JSON data
        return new Promise(() => { });
    }

    // Otherwise OK → parse JSON
    return res.json();
}
