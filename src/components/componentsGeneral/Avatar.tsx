/**
 * Кружок с инициалами. Настоящих фотографий в системе нет, а пустое место в
 * первой колонке (или в шапке профиля) делает интерфейс безликим.
 * Цвет берётся из имени: одинаковый у одного человека между заходами, разный у соседей.
 */
export function Avatar({name, muted, size = 32}: {name: string; muted?: boolean; size?: number}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;

    return (
        <span
            aria-hidden="true"
            className="grid flex-none place-items-center rounded-full font-bold text-white"
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.36 * 10) / 10,
                background: muted ? "#c3cede" : `hsl(${hue} 45% 52%)`,
            }}
        >
            {initials}
        </span>
    );
}
