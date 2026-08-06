export interface BarDatum {
    label: string;
    value: number;
    percent?: number;
    color?: string;
}

interface HorizontalBarListProps {
    data: BarDatum[];
    defaultColor?: string;
    valueSuffix?: string;
    maxItems?: number;
}

export function HorizontalBarList({data, defaultColor = "#4e57d6", valueSuffix = "", maxItems}: HorizontalBarListProps) {
    const items = maxItems ? data.slice(0, maxItems) : data;

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[12.5px] text-[#a3adbd] py-8">
                Нет данных
            </div>
        );
    }

    const max = Math.max(...items.map((d) => d.value), 1);

    return (
        <div className="flex flex-col gap-3">
            {items.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-[12.5px] text-[#3a4560] w-[150px] shrink-0 truncate" title={d.label}>
                        {d.label}
                    </span>
                    <div className="flex-1 h-[9px] rounded-full bg-[#f0f2f6] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${Math.max((d.value / max) * 100, 2)}%`,
                                background: d.color ?? defaultColor,
                            }}
                        />
                    </div>
                    <span className="text-[12px] font-mono text-[#55617a] w-[46px] text-right shrink-0">
                        {d.value}{valueSuffix}
                    </span>
                    {d.percent !== undefined && (
                        <span className="text-[11px] font-mono text-[#a3adbd] w-[38px] text-right shrink-0">
                            {d.percent}%
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
