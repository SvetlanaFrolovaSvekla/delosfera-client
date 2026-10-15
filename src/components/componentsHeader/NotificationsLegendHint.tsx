// Значок «?» в шапке панели уведомлений: по наведению показывает белую
// подсказку - что означают цвета кружков у уведомлений.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {HelpCircle} from "lucide-react";
import {SEVERITY_DOT} from "@/constants/notificationConst.ts";
import type {NotificationSeverity} from "@/service/notificationsService/notificationsServiceType.ts";

const ROWS: { severity: NotificationSeverity; key: "info" | "success" | "warning" | "urgent" }[] = [
    {severity: "Info", key: "info"},
    {severity: "Success", key: "success"},
    {severity: "Warning", key: "warning"},
    {severity: "Urgent", key: "urgent"},
];

/** Поместить внутрь контейнера с `relative`: подсказка раскрывается на всю его ширину. */
export function NotificationsLegendHint() {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                aria-label={t("notifications.legend.title")}
                aria-expanded={open}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => setOpen((v) => !v)}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[#8b97ab] transition-colors hover:bg-[#f1f4f9] hover:text-[#55617a]"
            >
                <HelpCircle size={17} strokeWidth={2}/>
            </button>

            <div
                role="tooltip"
                className={`pointer-events-none absolute left-5 right-5 top-full z-20 mt-1.5 rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-3.5 shadow-[0_14px_34px_-10px_rgba(15,27,45,.28)] transition-all duration-150 ease-out ${
                    open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                }`}
            >
                <div className="text-[12.5px] font-bold text-[#1c2740]">{t("notifications.legend.title")}</div>
                <div className="mb-2.5 mt-0.5 text-[11.5px] text-[#8b97ab]">{t("notifications.legend.subtitle")}</div>

                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {ROWS.map(({severity, key}) => (
                        <li key={key} className="flex items-center gap-2.5 text-[12px] text-[#3a4560]">
                            <span className="h-2 w-2 flex-none rounded-full" style={{background: SEVERITY_DOT[severity]}}/>
                            <span className="font-semibold">{t(`notifications.severity.${key}`)}</span>
                            <span className="text-[#8b97ab]">— {t(`notifications.legend.${key}`)}</span>
                        </li>
                    ))}
                    <li className="flex items-center gap-2.5 border-t border-[#eef2f7] pt-2 text-[12px] text-[#3a4560]">
                        <span className="h-[7px] w-[7px] flex-none rounded-full bg-[var(--app-accent,_#4e57d6)]"/>
                        <span>{t("notifications.legend.unread")}</span>
                    </li>
                </ul>
            </div>
        </>
    );
}
