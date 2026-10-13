// Цветная "таблетка" статуса (последней редакции / документа) в шапке открытого ВНД
export function StatusPill({color, bg, label}: { color: string; bg: string; label: string }) {
    return (
        <span className="px-2.5 py-0.5 rounded-full text-[12px]" style={{color, background: bg}}>{label}</span>
    );
}