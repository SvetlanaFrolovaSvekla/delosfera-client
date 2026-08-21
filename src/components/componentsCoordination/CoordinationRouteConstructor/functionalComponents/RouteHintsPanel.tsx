// Панель с подсказками по работе с конструктором маршрута согласования
import type {LucideIcon} from "lucide-react";

export interface RouteHint {
    icon: LucideIcon;
    iconColor: string;
    text: string;
}

interface RouteHintsPanelProps {
    items: RouteHint[];
    className?: string;
}

export function RouteHintsPanel({items, className = ""}: RouteHintsPanelProps) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div key={i} className="flex items-start gap-3">
                        <Icon
                            size={18}
                            strokeWidth={2}
                            className="mt-[1px] flex-none"
                            style={{color: item.iconColor}}
                        />
                        <span className="text-[13px] font-normal leading-relaxed text-[#26324a]">
                            {item.text}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}