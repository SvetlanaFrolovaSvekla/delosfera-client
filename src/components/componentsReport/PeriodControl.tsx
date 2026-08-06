import {GRANULARITY, type AnalyticsGranularity} from "@/service/analyticsService/vndAnalyticsServiceType.ts";

interface PeriodControlProps {
    granularity: AnalyticsGranularity;
    onGranularityChange: (g: AnalyticsGranularity) => void;
}

const OPTIONS: Array<{ value: AnalyticsGranularity; label: string }> = [
    {value: GRANULARITY.Week, label: "По неделям"},
    {value: GRANULARITY.Month, label: "По месяцам"},
    {value: GRANULARITY.Quarter, label: "По кварталам"},
    {value: GRANULARITY.Year, label: "По годам"},
];

export function PeriodControl({granularity, onGranularityChange}: PeriodControlProps) {
    return (
        <div className="inline-flex items-center rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] p-[3px] gap-[2px]">
            {OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onGranularityChange(opt.value)}
                    className={`px-[10px] py-[5px] rounded-[8px] text-[11.5px] font-semibold cursor-pointer border-none transition-colors ${
                        granularity === opt.value
                            ? "bg-white text-[#4e57d6] shadow-sm"
                            : "bg-transparent text-[#8b97ab] hover:text-[#3a4560]"
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
