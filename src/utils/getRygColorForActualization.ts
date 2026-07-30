export function getRygColorForActualization(days: number) {
    if (days < 0 || days < 5) return "#c0392b";
    if (days < 30) return "#b3730a";
    return "#1c7a4d";
}
