// Виджет "Последняя активность" в ЭДО
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {History, Lock} from "lucide-react";
import type {ActivityIcon} from "@/service/activityLogService/activityLogServiceType.ts";
import {useRecentActivity} from "@/hooks/activityLogHooks/useRecentActivity.ts";
import {timeAgo} from "@/utils/dateUtils.ts";
import {Icon} from "@/components/icons/Icon";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {HOME_BOTTOM_ROW_HEIGHT} from "@/constants/home.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

const ICON_STYLE: Record<ActivityIcon, { iconName: string; col: string; bg: string }> = {
    check: {iconName: "check", col: "#1c7a4d", bg: "#e2f4ea"},
    x: {iconName: "x", col: "#c0392b", bg: "#fbe7e4"},
    doc: {iconName: "vnd", col: "#2f68f5", bg: "#e9f0ff"},
    clock: {iconName: "clock", col: "#7a5ce0", bg: "#efeafe"},
    // Правки/изменения (записки, заявки, маршруты и т.п.) — тот же цвет, что и
    // у карандаша в "Истории" на карточке документа (DocumentHistory.tsx).
    edit: {iconName: "edit", col: "#55617a", bg: "#eef1f5"},
    info: {iconName: "info", col: "#6b7280", bg: "#f1f2f4"},
    // Удаление черновика — красная мусорка, тот же красный, что и у "x".
    trash: {iconName: "trash", col: "#c0392b", bg: "#fbe7e4"},
};

interface RecentActivityCardProps {
    limit?: number;
    module?: string;
}

// Фильтр активности по разделам (#11): всё / ВНД / служебные записки / закупки.
// undefined = все контуры сразу.
const SECTIONS: { id: string; label: string; module?: string }[] = [
    {id: "all", label: "Все"},
    {id: "vnd", label: "ВНД", module: "vnd"},
    {id: "sz", label: "СЗ", module: "sz"},
    {id: "prc", label: "Закупки", module: "prc"},
];

export function RecentActivityCard({limit = 15, module}: RecentActivityCardProps) {
    const {t} = useTranslation();
    // Раздел задаётся либо снаружи (module), либо переключателем внутри виджета.
    const [section, setSection] = useState<string>(
        SECTIONS.find((s) => s.module === module)?.id ?? "all",
    );
    const activeModule = SECTIONS.find((s) => s.id === section)?.module;
    const {items, isLoading, error} = useRecentActivity(limit, activeModule);
    const navigate = useNavigate();

    return (
        // Высота зафиксирована (HOME_BOTTOM_ROW_HEIGHT) и совпадает с "Последние уведомления"
        // рядом (см. RecentNotificationsCard.tsx) - список ниже сам скроллится, если 15 строк
        // не помещаются (см. flex-1 min-h-0 overflow-y-auto на списке).
        <div
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            style={{height: HOME_BOTTOM_ROW_HEIGHT}}
        >
            <div
                className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                {/* Последняя активность */}
                <h2 className="text-[15px] font-semibold">{t("home.recentActivity.title")}</h2>
                <div className="flex flex-wrap gap-1.5">
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSection(s.id)}
                            className="cursor-pointer rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition-colors"
                            style={{
                                border: `1px solid ${section === s.id ? "#2f68f5" : "#e5e9f0"}`,
                                background: section === s.id ? "#eef3ff" : "#fff",
                                color: section === s.id ? "#2f68f5" : "#55617a",
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                    <button
                        className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                        onClick={() => navigate("/activity")}
                    >
                        {/* Смотреть всю активность */}
                        {t("home.recentActivity.viewAll")}
                    </button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[14px] pt-1.5">
                {isLoading ? (
                    // Загрузка активности…
                    <Loader label={t("home.recentActivity.loading")} fullHeight={false}/>
                ) : error ? (
                    <div className="py-6 text-center text-[13px] text-[#c0392b]">{error}</div>
                ) : items.length === 0 ? (
                    <EmptyState
                        embedded
                        icon={History}
                        title={t("home.recentActivity.empty")}
                        description={t("home.recentActivity.emptyDescription")}
                    />
                ) : (
                    items.map((item) => {
                        const style = ICON_STYLE[item.icon] ?? ICON_STYLE.info;
                        // canOpen=false — запись о чужом черновике ВНД, который у пользователя нет
                        // прав открыть (см. ActivityLogService.CanOpenVndEntry на бэке — тот же
                        // критерий, что и на самой странице ВНД). Раньше строка выглядела как
                        // обычная кликабельная, а переход по её ссылке падал с ошибкой доступа —
                        // теперь такая строка не кликается и выглядит явно приглушённой, с замком
                        // вместо обычной иконки.
                        const locked = !item.canOpen;
                        return (
                            <Tooltip
                                content="Черновик недоступен — нет прав на просмотр чужих черновиков"
                                side="top"
                                disabled={!locked}
                                className="w-full"
                            >
                                <div
                                    key={item.id}
                                    onClick={locked ? undefined : () => navigate(item.url)}
                                    className={
                                        "flex gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0 " +
                                        (locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-[#fafbfc]")
                                    }
                                >
                                <span
                                    className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                    style={locked ? {background: "#eef1f5", color: "#8b97ab"} : {
                                        background: style.bg,
                                        color: style.col
                                    }}
                                >
                                    {locked ? <Lock className="h-3.5 w-3.5"/> :
                                        <Icon name={style.iconName} width={14} height={14}/>}
                                </span>
                                    <div className="min-w-0">
                                        {/* whitespace-pre-line — сервер разносит длинный список изменённых
                                        реквизитов по строкам через \n (см. VndService.BuildChangedFieldsList) */}
                                        <div
                                            className="whitespace-pre-line text-[12.5px] leading-[1.4] text-[#26324a]">{item.text}</div>
                                        <div className="mt-0.5 text-[11px] text-[#8b97ab]">
                                            {timeAgo(item.createdAt)}
                                            {locked && " · нет доступа"}
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>
                        );
                    })
                )}
            </div>
        </div>
    );
}