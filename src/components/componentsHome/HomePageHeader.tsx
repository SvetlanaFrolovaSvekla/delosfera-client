// Верхняя часть страницы рабочего стола: приветствие, дата и т.д.
import {useTranslation} from "react-i18next";
import {Icon} from "@/components/icons/Icon";

interface HomePageHeaderProps {
    formattedDate: string;
    greeting: string;
    rolePosition?: string;
    roleDept: string;
    onCreateClick: () => void;
}

export function HomePageHeader({formattedDate, greeting, rolePosition, roleDept, onCreateClick}: HomePageHeaderProps) {
    const {t} = useTranslation();

    return (
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
            <div>
                <div className="text-[12.5px] font-medium text-[#8b97ab]">{formattedDate}</div>
                <h1 className="mt-[5px] text-[25px] font-bold tracking-[-0.02em]">{greeting}</h1>
                <div className="mt-[9px] flex items-center gap-2.5">
                    <span
                        className="inline-flex items-center gap-[7px] rounded-lg bg-[var(--app-soft,_#e9f0ff)] px-[11px] py-[5px] text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)]">
                        <Icon name="user" width={14} height={14}/>
                        {rolePosition}
                    </span>
                    <span className="text-[12.5px] text-[#8b97ab]">{roleDept}</span>
                </div>
            </div>
            <button
                onClick={onCreateClick}
                className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[var(--app-accent,_#2f68f5)] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_var(--app-accent,_#2f68f5)] hover:brightness-[1.06]">
                <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                {/* Создать документ */}
                {t("home.createDocument")}
            </button>
        </div>
    );
}