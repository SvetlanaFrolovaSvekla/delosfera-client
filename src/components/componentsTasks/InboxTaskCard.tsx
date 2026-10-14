/** Карточка задачи сводного реестра (записки/закупки/ознакомление) — в том же виде, что и карточка
 * задачи ВНД (VndTaskCard): значок контура, номер, бейджи, название, строка сути и срок справа.
 *
 * Одна и та же карточка и на странице "Мои задачи" (внутри InboxTaskRow, рядом с кнопками
 * действий), и в виджете "Мои задачи" на главной (через SzTaskCard, square) — раньше у
 * главной была своя карточка с другим значком и непереведёнными подписями. */
import type {MouseEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {taskLink, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {INBOX_CONTOUR_META} from "@/constants/taskInboxConst.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {Icon} from "@/assets/icons/Icon.tsx";

// toLocaleString не подхватывает язык интерфейса сам — берём его из i18n.language, иначе
// дата на "Мои задачи" оставалась бы русской при переключении на en/ky.
const DATE_LOCALE_BY_LANG: Record<string, string> = {
    ru: "ru-RU",
    en: "en-US",
    ky: "ky-KG",
};

function formatDue(iso: string | null, lang: string): string {
    if (!iso) return "";
    const locale = DATE_LOCALE_BY_LANG[lang] ?? "ru-RU";
    return new Date(iso).toLocaleString(locale, {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

// Контур документа → вид значка/бейджа (цвета те же, что у вкладок-карточек над реестром).
// eslint-disable-next-line react-refresh/only-export-components
export function inboxContourMeta(documentType: string) {
    switch (documentType) {
        case "Procurement":
            return INBOX_CONTOUR_META.prc;
        case "Acknowledgement":
            return INBOX_CONTOUR_META.ack;
        case "Vnd":
            return INBOX_CONTOUR_META.vnd;
        default:
            return INBOX_CONTOUR_META.sz;
    }
}

// Выделение текста мышью не должно открывать карточку — как у VndTaskCard.
const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) e.preventDefault();
};

interface InboxTaskCardProps {
    task: InboxTask;
    /** Запрос поиска — подсвечивает совпадения, как на карточках ВНД. */
    searchQuery?: string;
    /** Без скруглений, с тонким разделителем сверху — плотный список виджета на главной. */
    square?: boolean;
    /** Убрать верхний разделитель у первой строки (см. тот же проп у VndTaskCard). */
    noTopBorder?: boolean;
    /** Без собственной рамки — карточку оборачивает InboxTaskRow вместе с кнопками действий. */
    bare?: boolean;
}

export function InboxTaskCard({task, searchQuery = "", square = false, noTopBorder = false, bare = false}: InboxTaskCardProps) {
    const {t, i18n} = useTranslation();
    const meta = inboxContourMeta(task.documentType);
    const ContourIcon = meta.icon;

    const metaParts = [
        // Этап есть только у задач маршрута: решение адресата и поручение приходят вне согласования.
        task.stepOrder !== null ? t("tasks.inbox.stepSuffix", {step: task.stepOrder}) : null,
        task.onBehalfOf ? t("tasks.inbox.onBehalfOfSuffix", {name: task.onBehalfOf}) : null,
        task.delegatedBy ? t("tasks.inbox.delegatedBySuffix", {name: task.delegatedBy}) : null,
    ].filter(Boolean);

    const frame = bare
        ? "min-w-0 flex-1"
        : square
            ? `w-full border-t border-[#f3f6f9] ${noTopBorder ? "border-t-0" : ""}`
            : "w-full rounded-[14px] border border-[#e9edf3]";

    return (
        <Link
            to={taskLink(task)}
            draggable={false}
            onClick={handleClick}
            className={`cursor-pointer flex items-center gap-[13px] bg-white px-[18px] py-[13px] text-left no-underline text-inherit transition-colors hover:bg-[#f8fafc] select-text [-webkit-user-drag:none] ${frame}`}
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{background: meta.bg, color: meta.color}}
            >
                <ContourIcon size={18}/>
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        <HighlightText text={task.regNumber ?? t("tasks.common.noRegNumber")} query={searchQuery}/>
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: meta.bg, color: meta.color}}
                    >
                        {task.documentTypeTitle}
                    </span>
                    {/* Своя записка инициатора: действия не требует, показывает, где она сейчас. */}
                    {task.isOwn && (
                        <span
                            title={t("tasks.inbox.ownHint")}
                            className="rounded-full bg-[#ececfc] px-[9px] py-[2px] text-[11px] font-semibold text-[#4e57d6]"
                        >
                            {t("tasks.inbox.ownBadge")}
                        </span>
                    )}
                    {/* Что именно ждёт: регистрация, согласование, подпись, резолюция... */}
                    <span className="rounded-full bg-[#f2f5f9] px-[9px] py-[2px] text-[11px] font-semibold text-[#55617a]">
                        {task.taskType}
                    </span>
                    {task.isOverdue && (
                        <span className="rounded-full bg-[#fdf0ee] px-[9px] py-[2px] text-[11px] font-semibold text-[#c0392b]">
                            {t("tasks.inbox.overdueBadge")}
                        </span>
                    )}
                </span>

                {/* Название — отдельной строкой, как у ВНД */}
                <span className="mt-[3px] block truncate text-[13.5px] font-semibold text-[#1c2740]">
                    «<HighlightText text={task.documentTitle} query={searchQuery}/>»
                </span>

                {metaParts.length > 0 && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                        <HighlightText text={metaParts.join(" · ")} query={searchQuery}/>
                    </span>
                )}
            </span>

            {task.isOwn ? (
                // У своей записки срока для автора нет — показываем, с какого момента она на этапе.
                <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold text-[#8b97ab]">
                    <Icon name="clock" width={14} height={14}/>
                    {t("tasks.inbox.ownSincePrefix")}{formatDue(task.createdAt, i18n.language)}
                </span>
            ) : (
                <span
                    className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold"
                    style={{color: task.isOverdue ? "#c0392b" : "#55617a"}}
                >
                    <Icon name="clock" width={14} height={14}/>
                    {task.dueAt ? formatDue(task.dueAt, i18n.language) : t("tasks.inbox.noDue")}
                </span>
            )}

            <Icon name="chevr" width={17} height={17} className="flex-none text-[#c3ccd8]"/>
        </Link>
    );
}
