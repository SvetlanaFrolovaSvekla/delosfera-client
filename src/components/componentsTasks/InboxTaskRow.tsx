/** Строка страницы "Мои задачи": карточка задачи (InboxTaskCard, в виде карточки ВНД) и справа —
 * кнопки делегирования и оп-риска, если применимы. */
import {useTranslation} from "react-i18next";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {InboxTaskCard} from "@/components/componentsTasks/InboxTaskCard.tsx";
import {Share2, ShieldAlert} from "lucide-react";

interface InboxTaskRowProps {
    task: InboxTask;
    onDelegate: (task: InboxTask) => void;
    /** Поднять оп-риск с этого шага (RISK-1) — задаётся только при праве ManageRiskEvents. */
    onRaiseRisk?: (task: InboxTask) => void;
    /** Запрос поиска — подсвечивает совпадения, как на карточках ВНД. */
    searchQuery?: string;
    /** Выполненная задача: только просмотр, без делегирования и оп-риска. */
    readOnly?: boolean;
}

export function InboxTaskRow({task, onDelegate, onRaiseRisk, searchQuery = "", readOnly = false}: InboxTaskRowProps) {
    const {t} = useTranslation();

    return (
        <div className="flex items-stretch overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <InboxTaskCard task={task} searchQuery={searchQuery} bare/>

            {/* Делегировать можно только задачу согласования: у неё есть
                участник маршрута, которого движок и проверяет. */}
            {!readOnly && task.participantId !== null && (
                <button
                    type="button"
                    title={t("tasks.inbox.delegateAction")}
                    onClick={() => onDelegate(task)}
                    className="flex w-11 flex-none cursor-pointer items-center justify-center border-0 border-l border-solid border-[#eef2f7] bg-transparent text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#55617a]"
                >
                    <Share2 className="h-4 w-4"/>
                </button>
            )}

            {/* Поднять оп-риск с любого шага/документа (RISK-1) — кнопка есть только
                у сотрудников с правом ManageRiskEvents (см. TaskInboxPage). Со своей записки
                на отслеживании оп-риск не поднимают — это не шаг, а наблюдение. */}
            {!readOnly && onRaiseRisk && !task.isOwn && (
                <button
                    type="button"
                    title={t("tasks.inbox.raiseRiskAction")}
                    onClick={() => onRaiseRisk(task)}
                    className="flex w-11 flex-none cursor-pointer items-center justify-center border-0 border-l border-solid border-[#eef2f7] bg-transparent text-[#8b97ab] hover:bg-[#fdf6f5] hover:text-[#c0392b]"
                >
                    <ShieldAlert className="h-4 w-4"/>
                </button>
            )}
        </div>
    );
}
