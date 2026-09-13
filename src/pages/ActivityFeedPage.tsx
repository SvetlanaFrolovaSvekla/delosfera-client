// Страница "Активность на портале" — развёрнутая версия виджета "Последняя
// активность" с главной: та же лента событий и те же разделы, но не
// обрезается до 8-15 записей, а открывается по кнопке "Смотреть всю активность".
import {useState} from "react";
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
    // Правки/изменения (записки, заявки, маршруты и т.п.) — тот же цвет, что и
    // у карандаша в "Истории" на карточке документа (DocumentHistory.tsx).
    edit: {iconName: "edit", col: "#55617a", bg: "#eef1f5"},
    info: {iconName: "info", col: "#6b7280", bg: "#f1f2f4"},
    // Удаление черновика — красная мусорка, тот же красный, что и у "x".
    trash: {iconName: "trash", col: "#c0392b", bg: "#fbe7e4"},
};

// Те же разделы, что и в виджете "Последняя активность" на главной.
const SECTIONS: { id: string; label: string; module?: string }[] = [
    {id: "all", label: "Все"},
    {id: "vnd", label: "ВНД", module: "vnd"},
    {id: "sz", label: "СЗ", module: "sz"},
    {id: "prc", label: "Закупки", module: "prc"},
];

// Сервер отдаёт не больше 50 записей за раз (см. ActivityLogController.GetRecent) —
// постраничной подгрузки для этой ленты пока нет, берём максимум одним запросом.
const FEED_LIMIT = 50;

export function ActivityFeedPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [section, setSection] = useState<string>("all");
    const activeModule = SECTIONS.find((s) => s.id === section)?.module;
    const {items, isLoading, error} = useRecentActivity(FEED_LIMIT, activeModule);

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div>
                <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                    {/* Активность на портале */}
                    {t("activityFeed.title")}
                </h1>
                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                    {t("activityFeed.subtitle")}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        className="cursor-pointer rounded-full px-3 py-[5px] text-[12px] font-semibold transition-colors"
                        style={{
                            border: `1px solid ${section === s.id ? "#2f68f5" : "#e5e9f0"}`,
                            background: section === s.id ? "#eef3ff" : "#fff",
                            color: section === s.id ? "#2f68f5" : "#55617a",
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <section className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-[18px] pb-[14px] pt-1.5">
                {isLoading ? (
                    // Загрузка активности…
                    <Loader label={t("activityFeed.loading")} fullHeight={false}/>
                ) : error ? (
                    <div className="py-6 text-center text-[13px] text-[#c0392b]">{error}</div>
                ) : items.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-[#8b97ab]">
                        {/* Пока нет событий */}
                        {t("activityFeed.empty")}
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
                                    {/* whitespace-pre-line — сервер разносит длинный список изменённых
                                        реквизитов по строкам через \n (см. VndService.BuildChangedFieldsList) */}
                                    <div className="whitespace-pre-line text-[12.5px] leading-[1.4] text-[#26324a]">{item.text}</div>
                                    <div className="mt-0.5 text-[11px] text-[#8b97ab]">{timeAgo(item.createdAt)}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>
        </div>
    );
}
