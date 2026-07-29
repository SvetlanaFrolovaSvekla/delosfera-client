// Кнопка перехода к уведомлениям
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {Icon} from "@/components/icons/Icon";
import {notifs} from "@/service/mockData/HeaderData.tsx";
import { Tooltip } from "../componentsGeneral/Tooltip";

export function NotificationsDropdown() {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <Tooltip content={t("header.notifTooltip")} side="bottom">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="cursor-pointer relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                >
                    <Icon name="bell" width={19} height={19}/>
                    <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#e0483d]"/>
                </button>
            </Tooltip>

            {open && (
                <div className="absolute right-0 top-[46px] z-40 w-[340px] overflow-hidden rounded-[13px] border border-[#e5e9f0] bg-white shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)]">
                    <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-[13px]">
                        <span className="text-[13.5px] font-semibold">{t("header.notif")}</span>
                        <Link
                            to="/notifications"
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-semibold text-[var(--app-accent,_#4e57d6)] hover:underline"
                        >
                            {t("header.allNotifs")} &gt;&gt;
                        </Link>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
                        {notifs.map((n) => (
                            <div
                                key={n.id}
                                className="flex gap-[11px] border-b border-[#f3f6f9] px-4 py-[11px] hover:bg-[#f8fafc]"
                            >
                                <span className="mt-[5px] h-2 w-2 flex-none rounded-full" style={{background: n.dot}}/>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] leading-[1.45] text-[#26324a]">{t(n.textKey)}</div>
                                    <div className="mt-[3px] text-[11px] text-[#8b97ab]">{t(n.timeKey)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}