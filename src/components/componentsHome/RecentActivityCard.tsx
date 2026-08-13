// Виджет "Последняя активность" в ЭДО
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import type {ActivityIcon} from "@/service/activityLogService/activityLogServiceType.ts";
import {useRecentActivity} from "@/hooks/activityLogHooks/useRecentActivity.ts";
import {timeAgo} from "@/utils/dateUtils.ts";
import {Icon} from "@/components/icons/Icon";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

const ICON_STYLE: Record<ActivityIcon, { iconName: string; col: string; bg: string }> = {
    check: {iconName: "check", col: "#1c7a4d", bg: "#e2f4ea"},
    x: {iconName: "x", col: "#c0392b", bg: "#fbe7e4"},
    doc: {iconName: "vnd", col: "#2f68f5", bg: "#e9f0ff"},
    clock: {iconName: "clock", col: "#7a5ce0", bg: "#efeafe"},
    info: {iconName: "info", col: "#6b7280", bg: "#f1f2f4"},
};

interface RecentActivityCardProps {
    limit?: number;
    module?: string;
}

export function RecentActivityCard({limit = 8, module}: RecentActivityCardProps) {
    const {t} = useTranslation();
    const {items, isLoading, error} = useRecentActivity(limit, module);
    const navigate = useNavigate();

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                {/* Последняя активность */}
                <h2 className="text-[15px] font-semibold">{t("home.recentActivity.title")}</h2>
            </div>
            <div className="px-[18px] pb-[14px] pt-1.5">
                {isLoading ? (
                    // Загрузка активности…
                    <Loader label={t("home.recentActivity.loading")} fullHeight={false}/>
                ) : error ? (
                    <div className="py-6 text-center text-[13px] text-[#c0392b]">{error}</div>
                ) : items.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-[#8b97ab]">
                        {/* Пока нет событий */}
                        {t("home.recentActivity.empty")}
                    </div>
                ) : (
                    items.map((item) => {
                        const style = ICON_STYLE[item.icon] ?? ICON_STYLE.info;
                        return (
                            <div
                                key={item.id}
                                onClick={() => navigate(item.url)}
                                className="flex cursor-pointer gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0 hover:bg-[#fafbfc]"
                            >
                                <span
                                    className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                    style={{background: style.bg, color: style.col}}
                                >
                                    <Icon name={style.iconName} width={14} height={14}/>
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] leading-[1.4] text-[#26324a]">{item.text}</div>
                                    <div className="mt-0.5 text-[11px] text-[#8b97ab]">{timeAgo(item.createdAt)}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}