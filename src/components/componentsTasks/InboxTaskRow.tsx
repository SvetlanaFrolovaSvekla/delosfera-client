/** Одна строка сводного реестра задач (записки/закупки/ознакомление) — ссылка на документ,
 * бейдж типа, метаданные и, если применимо, кнопка делегирования. */
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {taskLink, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {Share2} from "lucide-react";

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

interface InboxTaskRowProps {
    task: InboxTask;
    onDelegate: (task: InboxTask) => void;
}

export function InboxTaskRow({task, onDelegate}: InboxTaskRowProps) {
    const {t, i18n} = useTranslation();

    return (
        <div
            className="flex items-stretch border-t border-[#eef2f7]"
            style={task.isOverdue ? {background: "#fdf6f5"} : undefined}
        >
            <Link
                to={taskLink(task)}
                className="flex flex-1 min-w-0 items-center gap-3.5 px-4 py-[13px] no-underline text-inherit"
            >
                <span className="whitespace-nowrap rounded-[6px] bg-[#f2f5f9] px-2 py-[3px] text-[11px] font-bold text-[#55617a]">
                    {task.documentTypeTitle}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-[#0f1b2d]">
                        {task.documentTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                        {task.regNumber ?? t("tasks.common.noRegNumber")} · {task.taskType}
                        {/* Этап есть только у задач маршрута: решение адресата и
                            поручение приходят вне согласования. */}
                        {task.stepOrder !== null && ` · ${t("tasks.inbox.stepSuffix", {step: task.stepOrder})}`}
                        {task.onBehalfOf && ` · ${t("tasks.inbox.onBehalfOfSuffix", {name: task.onBehalfOf})}`}
                        {task.delegatedBy && ` · ${t("tasks.inbox.delegatedBySuffix", {name: task.delegatedBy})}`}
                    </span>
                </span>

                <span
                    className="whitespace-nowrap text-[12px] font-semibold"
                    style={{color: task.isOverdue ? "#c0392b" : "#55617a"}}
                >
                    {task.isOverdue ? t("tasks.inbox.overduePrefix") : t("tasks.inbox.duePrefix")}
                    {task.dueAt ? formatDue(task.dueAt, i18n.language) : t("tasks.inbox.noDue")}
                </span>
            </Link>

            {/* Делегировать можно только задачу согласования: у неё есть
                участник маршрута, которого движок и проверяет. */}
            {task.participantId !== null && (
                <button
                    type="button"
                    title={t("tasks.inbox.delegateAction")}
                    onClick={() => onDelegate(task)}
                    className="flex w-11 flex-none cursor-pointer items-center justify-center border-l border-[#eef2f7] bg-transparent text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#55617a]"
                >
                    <Share2 className="h-4 w-4"/>
                </button>
            )}
        </div>
    );
}
