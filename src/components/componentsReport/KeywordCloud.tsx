import type {ChartCategoryPoint} from "@/service/analyticsService/vndAnalyticsServiceType.ts";
import {colorAt} from "@/constants/reportPalette.ts";

interface KeywordCloudProps {
    data: ChartCategoryPoint[];
}

export function KeywordCloud({data}: KeywordCloudProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[12.5px] text-[#a3adbd] py-8">
                Нет данных
            </div>
        );
    }

    const max = Math.max(...data.map((d) => d.value), 1);
    const min = Math.min(...data.map((d) => d.value), 0);

    const sizeFor = (value: number) => {
        if (max === min) return 13;
        const t = (value - min) / (max - min);
        return 11.5 + t * 11; // 11.5px .. 22.5px
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {data.map((d, i) => (
                <span
                    key={i}
                    className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-full font-semibold"
                    style={{
                        fontSize: sizeFor(d.value),
                        color: colorAt(i),
                        background: `${colorAt(i)}17`,
                    }}
                    title={`${d.label}: ${d.value} документов`}
                >
                    {d.label}
                    <span className="text-[10px] font-mono opacity-70">{d.value}</span>
                </span>
            ))}
        </div>
    );
}
