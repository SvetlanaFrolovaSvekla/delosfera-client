export interface DonutDatum {
    label: string;
    value: number;
    percent: number;
    color: string;
}

interface DonutChartProps {
    data: DonutDatum[];
    size?: number;
    thickness?: number;
    centerLabel?: string;
    centerValue?: string | number;
    showLegend?: boolean;
}

const R = 42; // радиус окружности в единицах viewBox 0..100
const CIRC = 2 * Math.PI * R;

export function DonutChart({
                                data,
                                size = 176,
                                thickness = 15,
                                centerLabel,
                                centerValue,
                                showLegend = true,
                            }: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[12.5px] text-[#a3adbd] py-8">
                Нет данных
            </div>
        );
    }

    let cumulative = 0;

    return (
        <div className="flex items-center gap-5 flex-wrap">
            <div className="relative shrink-0" style={{width: size, height: size}}>
                <svg viewBox="0 0 100 100" width={size} height={size} style={{transform: "rotate(-90deg)"}}>
                    <circle cx="50" cy="50" r={R} fill="none" stroke="#f0f2f6" strokeWidth={thickness}/>
                    {data.map((d, i) => {
                        const fraction = d.value / total;
                        const dash = fraction * CIRC;
                        const offset = -((cumulative / total) * CIRC);
                        cumulative += d.value;
                        return (
                            <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r={R}
                                fill="none"
                                stroke={d.color}
                                strokeWidth={thickness}
                                strokeDasharray={`${dash} ${CIRC - dash}`}
                                strokeDashoffset={offset}
                                strokeLinecap={data.length > 1 ? "butt" : "round"}
                            >
                                <title>{`${d.label}: ${d.value} (${d.percent}%)`}</title>
                            </circle>
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[20px] font-bold text-[#0f1b2d] leading-tight">
                        {centerValue ?? total}
                    </span>
                    {centerLabel && <span className="text-[10.5px] text-[#8b97ab] font-medium mt-[1px]">{centerLabel}</span>}
                </div>
            </div>

            {showLegend && (
                <div className="flex-1 min-w-[140px] flex flex-col gap-[7px]">
                    {data.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12.5px]">
                            <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{background: d.color}}/>
                            <span className="text-[#3a4560] truncate flex-1">{d.label}</span>
                            <span className="text-[#8b97ab] font-mono text-[11.5px] shrink-0">{d.value}</span>
                            <span className="text-[#a3adbd] font-mono text-[11px] w-[38px] text-right shrink-0">
                                {d.percent}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
