// Карточка-обертка. Содержит черную иконку, заголовок; ниже могут быть поля для ввода/просмотра
import type {ReactNode} from "react";

export function Section({
                            icon,
                            title,
                            children,
                            noMarginBottom,
                        }: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
    noMarginBottom?: boolean;
}) {
    return (
        <div
            className={`bg-white border border-[#eef2f7] rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] ${noMarginBottom ? "" : "mb-4"}`}
        >
            <div className="flex items-center gap-2 mb-5">
                {icon}
                <span className="text-[12px] font-bold tracking-[.04em] uppercase text-[#2d354a]">{title}</span>
            </div>
            {children}
        </div>
    );
}