export function isTokenExpired(token: string, bufferSeconds = 15): boolean {
    try {
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
    } catch {
        return true;
    }
}