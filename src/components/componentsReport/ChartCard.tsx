import type {ReactNode} from "react";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    minHeight?: number;
}

export function ChartCard({title, subtitle, action, children, className = "", minHeight}: ChartCardProps) {
    return (
        <div
            className={`bg-white border border-[#e9edf3] rounded-2xl p-5 flex flex-col ${className}`}
        >
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="m-0 text-[14px] font-semibold text-[#1c2740]">{title}</h3>
                    {subtitle && <p className="m-0 mt-[3px] text-[12px] text-[#8b97ab]">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="flex-1" style={minHeight ? {minHeight} : undefined}>
                {children}
            </div>
        </div>
    );
}
