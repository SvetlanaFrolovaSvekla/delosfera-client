export function getFirstLastName(fullName?: string): string {
    if (!fullName) return "";

    const parts = fullName.trim().split(/\s+/);
    return parts.slice(0, 2).join(" ");
}