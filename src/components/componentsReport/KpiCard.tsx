import type {LucideIcon} from "lucide-react";

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bg: string;
    hint?: string;
}

export function KpiCard({label, value, icon: Icon, color, bg, hint}: KpiCardProps) {
    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl p-4 flex items-center gap-3 min-w-0">
            <div
                className="w-11 h-11 rounded-[12px] grid place-items-center shrink-0"
                style={{background: bg, color}}
            >
                <Icon className="w-5 h-5" strokeWidth={2}/>
            </div>
            <div className="min-w-0">
                <div className="text-[20px] font-bold text-[#0f1b2d] leading-tight truncate">{value}</div>
                <div className="text-[12px] text-[#8b97ab] font-medium truncate">{label}</div>
                {hint && <div className="text-[11px] text-[#a3adbd] mt-[2px] truncate">{hint}</div>}
            </div>
        </div>
    );
}
