/* Метрики Посещения системы */
export function Figure({value, label, alert}: {
    value: number | string; label: string; alert?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className={`font-mono text-[22px] font-bold leading-tight
                              ${alert ? "text-[#c0392b]" : "text-[#101a2c]"}`}>
                {value}
            </span>
            <span className="text-[12px] text-[#8593a8]">{label}</span>
        </div>
    );
}