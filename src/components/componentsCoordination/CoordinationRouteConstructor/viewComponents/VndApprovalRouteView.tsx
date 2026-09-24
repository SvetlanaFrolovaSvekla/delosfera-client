// Read-only маршрут уже запущенного/завершённого согласования
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {useApprovalRouteLines} from "@/hooks/coordinationHooks/useApprovalRouteLines.ts";
import {StageCardView} from "./StageCardView";
import type {FormattedCommentQuoteRef} from "./FormattedResolutionComment.tsx";
import {NormBlockView, type NormPhaseStatus} from "./NormBlockView";
import {ArrowDown, ArrowLeft, ChevronDown, MessageSquareText, UserPlus} from "lucide-react";
import {getElapsedLabel, getRemainingLabel} from "@/utils/dateUtils.ts";
import {isWorkingNow, useWorkCalendar} from "@/utils/workCalendar.ts";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {COMMENT_TRUNCATE_LENGTH} from "@/constants/coordinationParams.ts";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {CommentViewModal} from "./CommentViewModal.tsx";
import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";

interface VndApprovalRouteViewProps {
    process: ApprovalProcessResponse;
    highlightStageId?: number;
    /** true — не рисовать собственную внешнюю рамку/скругление/фон (используется, когда
     * компонент вложен как тело под цветной шапкой-баннером, и рамку рисует родитель) */
    frameless?: boolean;
    /** Клик по кнопке-лупе "Показать в тексте" рядом с цитатой в резолюции любого этапа - см.
     * StageCardView.onShowQuoteInText. Без этого пропа кнопки-лупы нигде на маршруте не рисуются. */
    onShowQuoteInText?: (quote: FormattedCommentQuoteRef) => void;
    /** true, если у текущего пользователя есть право редактировать маршрут этого процесса
     * (главный редактор, см. PermissionCode.EditAnyVndApprovalRoute) — включает кнопки
     * "Убрать"/"Заменить" на карточках этапов и "+ Добавить согласующего" в конце маршрута. */
    canEditRoute?: boolean;
    /** Убрать согласующего из маршрута — только для custom-этапов, см.
     * StageCardView.onRemoveApprover. */
    onRemoveApprover?: (stageId: number) => void;
    /** Заменить согласующего на обязательном (не custom) этапе, не убирая сам этап — см.
     * StageCardView.onReplaceApprover. */
    onReplaceApprover?: (stageId: number) => void;
    /** Добавить нового согласующего в маршрут — открывает модалку выбора пользователя
     * (см. VndCoordinationTab). Без этого пропа кнопка "+ Добавить" не рисуется. */
    onAddApprover?: () => void;
}

// Статус фазы «Первичное согласование»
function getPrimaryPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "primary") return "current";
    return "passed";
}

// Статус фазы «Повторное согласование»
function getRepeatPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "repeated") return "current";
    if (process.repeatStartedAt) return "passed";
    return "upcoming";
}

// Статус фазы «Финальная выдержка»
function getFinalHoldPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "final_hold") return "current";
    if (process.finalHoldStartedAt) return "passed";
    return "upcoming";
}

interface CurrentPhaseHintProps {
    startedAt: string | null | undefined;
    deadlineAt: string | null | undefined;
    /** Срок идёт только в рабочее время - "прошло"/"осталось" в рабочих часах */
    workingTime?: boolean;
}

// Подсказка "Текущий этап" со стрелочкой, выводится правее блока активной фазы.
//
// Раньше здесь была собственная копия getRemainingLabel (не импортированная из
// dateUtils.ts) - более бедная версия оригинала: для просрочки не показывала, на сколько
// именно (просто "просрочено" без суммы), и использовала сокращения ("дн"/"ч"/"мин") вместо
// склоняемых слов. Теперь используется общая getRemainingLabel из dateUtils - она уже
// возвращает готовую фразу ("осталось X"/"просрочено на X"), поэтому подпись строки
// заменена с "Осталось до дедлайна:" на нейтральное "Дедлайн:", чтобы не задваивать
// "осталось" ("Осталось до дедлайна: осталось 3 часа" читалось бы странно).
function CurrentPhaseHint({startedAt, deadlineAt, workingTime}: CurrentPhaseHintProps) {
    const {t} = useTranslation();
    useWorkCalendar(!!workingTime);
    const elapsed = startedAt ? getElapsedLabel(startedAt, t, {workingTime}) : "—";
    // Вечером/в выходные/в праздник срок не тикает - говорим об этом, чтобы "осталось" не
    // казалось застывшим по ошибке.
    const paused = workingTime && deadlineAt && new Date(deadlineAt).getTime() > Date.now() && !isWorkingNow();

    return (
        <div className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap">
            <ArrowLeft size={16} className="flex-none"/>
            <div className="flex flex-col text-[11.5px] leading-[1.5]">
                <span className="font-semibold">{t("coordination.currentPhaseHint.title")}</span>
                <span className="text-[#8b97ab]">{t("coordination.currentPhaseHint.phaseStarted", {time: elapsed})}</span>
                <span className="text-[#8b97ab]">{t("coordination.currentPhaseHint.deadline", {time: getRemainingLabel(deadlineAt, t, {workingTime})})}</span>
                {paused && (
                    <span className="text-[#b3730a]">{t("coordination.workingTime.paused")}</span>
                )}
            </div>
        </div>
    );
}

export function VndApprovalRouteView({
    process, highlightStageId, frameless, onShowQuoteInText,
    canEditRoute, onRemoveApprover, onReplaceApprover, onAddApprover,
}: VndApprovalRouteViewProps) {
    const [initiatorCommentOpen, setInitiatorCommentOpen] = useState(false);
    // Свёрнут ли по умолчанию блок "Убранные согласующие" ниже основного ряда карточек -
    // см. пояснение у activeStages/removedStages ниже.
    const [showRemovedHistory, setShowRemovedHistory] = useState(false);

    const stagesWithLocalId = useMemo(
        () => process.stages.map((s) => ({...s, localId: String(s.id)})),
        [process.stages],
    );

    // Главный редактор может сколько угодно раз убирать и заново добавлять согласующего на один
    // и тот же custom-этап (каждый раз - новый, отдельный этап в БД, старый остаётся в истории
    // как IsRemovedByEditor - см. пояснение в VndApprovalService.AddApproverAsync на бэке: это
    // сделано намеренно, чтобы не терять историю решений - аудит фиксирует каждое добавление и
    // каждое удаление отдельной записью, это верно и не трогается). Раньше все такие "убранные"
    // этапы рисовались наравне с действующими прямо в основном ряду - после нескольких циклов
    // убрать/добавить одного и того же человека ряд забивался кучей одинаковых неактивных
    // карточек. Теперь в основном ряду (и в линиях-коннекторах к воронке фаз) участвуют только
    // действующие этапы, а все убранные выносятся отдельным блоком над схемой маршрута (см.
    // return ниже) - свёрнутым по умолчанию.
    const activeStages = useMemo(
        () => stagesWithLocalId.filter((s) => !s.isRemovedByEditor),
        [stagesWithLocalId],
    );
    // Кого показываем в истории "Убранные согласующие": только записи с IsRemovedByEditor - и
    // только если у этого же человека сейчас нет ДЕЙСТВУЮЩЕГО этапа в маршруте. Без второго
    // условия один и тот же человек мог бы висеть одновременно и в основном ряду (как активный
    // на новом этапе), и в истории (как убранный со старого) - лишнее задвоение на экране для
    // того, кто прямо сейчас реально согласует. Сама история при этом не худеет - старая запись
    // остаётся в БД и в audit log, просто не выводится в этот список, пока человек активен.
    const activeApproverUserIds = useMemo(
        () => new Set(activeStages.map((s) => s.approverUserId)),
        [activeStages],
    );
    const removedStages = useMemo(
        () => stagesWithLocalId.filter(
            (s) => s.isRemovedByEditor && !activeApproverUserIds.has(s.approverUserId),
        ),
        [stagesWithLocalId, activeApproverUserIds],
    );

    const primaryPhaseStatus = useMemo(() => getPrimaryPhaseStatus(process), [process]);
    const repeatPhaseStatus = useMemo(() => getRepeatPhaseStatus(process), [process]);
    const finalHoldPhaseStatus = useMemo(() => getFinalHoldPhaseStatus(process), [process]);

    // Процесс завершён без результата (отклонён/отозван) - этапы, на которых решение так и не
    // было принято, больше не "В ожидании": ждать уже нечего, весь процесс прекращён.
    const isProcessEnded = process.status === "rejected" || process.status === "cancelled";

    // Маршрут можно редактировать, пока согласование ещё идёт - см. те же проверки статуса
    // в VndApprovalService.AddApproverAsync/RemoveApproverAsync на бэке.
    const canEditRouteNow = !!canEditRoute && process.status !== "approved" && !isProcessEnded;
    const canAddApprover = canEditRouteNow && !!onAddApprover;

    const {funnelWrapperRef, targetRef, cardsScrollRef, paths, edgeFade, recomputePaths, registerStageRef} =
        useApprovalRouteLines(activeStages);

    // Мягкое затухание по краям скроллящегося ряда карточек - только с той стороны, где ещё
    // есть что проскроллить (см. edgeFade в useApprovalRouteLines), чтобы карточка у края не
    // выглядела грубо обрезанной ровно по границе блока.
    const FADE_WIDTH = 20;
    const cardsScrollMaskImage =
        `linear-gradient(to right, ${edgeFade.start ? "transparent" : "black"} 0, black ${FADE_WIDTH}px, ` +
        `black calc(100% - ${FADE_WIDTH}px), ${edgeFade.end ? "transparent" : "black"} 100%)`;

    const [previewAttachment, setPreviewAttachment] = useState<{fileId: number; fileName: string} | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const handleDownload = async (fileId: number, fileName: string) => {
        setDownloadingId(fileId);
        try {
            await downloadWithToast(fileId, fileName);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <>
            {/* Убранные (IsRemovedByEditor) этапы, чей согласующий сейчас не активен в маршруте
                (см. removedStages выше) - отдельная панель НАД схемой маршрута, а не внутри неё:
                это чистая история, к текущему "дереву" отношения не имеет и не должна визуально
                сливаться с ним. Свёрнуто по умолчанию - разворачивается по клику. */}
            {removedStages.length > 0 && (
                <div className="mb-3 rounded-[14px] border border-[#e5e9f0] bg-white px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setShowRemovedHistory((v) => !v)}
                        className="flex w-full cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left text-[12.5px] font-semibold text-[#5b6474] hover:text-[#4e57d6]"
                    >
                        <ChevronDown
                            size={14}
                            className={`flex-none transition-transform ${showRemovedHistory ? "rotate-180" : ""}`}
                        />
                        {showRemovedHistory
                            ? "Скрыть убранных согласующих"
                            : `Убранные согласующие (${removedStages.length})`}
                    </button>

                    {showRemovedHistory && (
                        <div className="mt-3 flex flex-wrap gap-4 border-t border-[#eef0f4] pt-3">
                            {removedStages.map((stage) => (
                                <StageCardView
                                    key={stage.localId}
                                    stage={stage}
                                    cardRef={() => {}}
                                    isProcessEnded={isProcessEnded}
                                    onShowQuoteInText={onShowQuoteInText}
                                    phaseRounds={process.phaseRounds}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div
                ref={funnelWrapperRef}
                className={
                    frameless
                        ? "relative bg-[#fbfcfe] bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px] p-6"
                        : "relative rounded-[16px] border border-[#e5e9f0] bg-[#fbfcfe] bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px] p-6"
                }
            >
            {/* Комментарий инициатора о внесённых исправлениях (см. "Комментарий о внесённых
                исправлениях" в VndRevisionNeededPanel - отправляется вместе с повторной подачей
                редакции после устранения замечаний). Раньше приходил с бэка, но нигде не
                отображался - согласующие не видели, что именно исправил инициатор. Показываем
                один раз для всего маршрута (не привязан к конкретному этапу), если он есть. */}
            {process.repeatInitiatorComment && (
                <div className="mx-auto mb-5 flex w-fit max-w-[640px] flex-col gap-1.5 rounded-[12px] border border-[#d4d6f8] bg-[#f5f6fd] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                            {getInitials(process.initiatorName)}
                        </span>
                        <span className="text-[11.5px] font-semibold text-[#26324a]">
                            {process.initiatorName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4e57d6]">
                            <MessageSquareText size={12} className="flex-none"/>
                            комментарий к исправлениям
                        </span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[12px] leading-snug text-[#3c424a]">
                        {process.repeatInitiatorComment.length > COMMENT_TRUNCATE_LENGTH
                            ? process.repeatInitiatorComment.slice(0, COMMENT_TRUNCATE_LENGTH).trimEnd() + "…"
                            : process.repeatInitiatorComment}
                    </div>

                    {process.repeatInitiatorCommentAttachments.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {process.repeatInitiatorCommentAttachments.map((a) => (
                                <AttachmentRow
                                    key={a.id}
                                    fileId={a.fileId}
                                    fileName={a.fileName}
                                    onView={() => setPreviewAttachment({fileId: a.fileId, fileName: a.fileName})}
                                />
                            ))}
                        </div>
                    )}

                    {(process.repeatInitiatorComment.length > COMMENT_TRUNCATE_LENGTH ||
                        process.repeatInitiatorCommentAttachments.length > 0) && (
                        <button
                            type="button"
                            onClick={() => setInitiatorCommentOpen(true)}
                            className="cursor-pointer self-start rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                        >
                            См. комментарий полностью
                        </button>
                    )}
                </div>
            )}

            {initiatorCommentOpen && (
                <CommentViewModal
                    title="См. комментарий полностью"
                    approverName={process.initiatorName}
                    approverUserId={process.initiatorUserId}
                    comment={process.repeatInitiatorComment ?? ""}
                    attachments={process.repeatInitiatorCommentAttachments}
                    onClose={() => setInitiatorCommentOpen(false)}
                />
            )}

            {previewAttachment && (
                <AttachmentDocxPreviewModal
                    fileId={previewAttachment.fileId}
                    fileName={previewAttachment.fileName}
                    downloadingId={downloadingId}
                    onDownload={handleDownload}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}

            <div
                ref={cardsScrollRef}
                onScroll={recomputePaths}
                style={{maskImage: cardsScrollMaskImage, WebkitMaskImage: cardsScrollMaskImage}}
                className={`flex gap-12 overflow-x-auto px-1 pb-3 ${(edgeFade.start || edgeFade.end) ? "justify-start" : "justify-center"}
                    [scrollbar-width:thin] [scrollbar-color:#c9cee0_transparent]
                    [&::-webkit-scrollbar]:h-[7px]
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-[#c9cee0]
                    [&::-webkit-scrollbar-thumb:hover]:bg-[#a9b2c8]`}
            >
                {activeStages.map((stage) => (
                    <StageCardView
                        key={stage.localId}
                        stage={stage}
                        cardRef={registerStageRef(stage.localId)}
                        isCurrentUserStage={stage.id === highlightStageId}
                        isProcessEnded={isProcessEnded}
                        onShowQuoteInText={onShowQuoteInText}
                        phaseRounds={process.phaseRounds}
                        canEditRoute={canEditRouteNow}
                        onRemoveApprover={onRemoveApprover}
                        onReplaceApprover={onReplaceApprover}
                    />
                ))}

                {canAddApprover && (
                    <button
                        type="button"
                        onClick={onAddApprover}
                        className="cursor-pointer flex h-[fit-content] w-[220px] flex-none flex-col items-center justify-center gap-2 self-stretch rounded-2xl border border-dashed border-[#c9cee0] bg-white/60 p-4 text-[#4e57d6] hover:border-[#4e57d6]/60 hover:bg-white"
                    >
                        <UserPlus size={18}/>
                        <span className="text-[12.5px] font-semibold">Добавить согласующего</span>
                    </button>
                )}
            </div>

            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                {paths.map((d, i) => (
                    <path
                        key={i}
                        d={d}
                        stroke="#d5dae3"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                ))}
            </svg>

            <div className="mx-auto mt-10 flex w-[280px] flex-col items-center gap-4">
                <div className="relative w-full">
                    <NormBlockView
                        label="Первичное согласование"
                        value={process.primaryDeadlineMinutes}
                        workingTime={process.usesWorkingTime}
                        phaseStatus={primaryPhaseStatus}
                        blockRef={targetRef}
                        startedAt={process.primaryStartedAt}
                    />
                    {primaryPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.primaryStartedAt}
                            deadlineAt={process.primaryDeadlineAt}
                            workingTime={process.usesWorkingTime}
                        />
                    )}
                </div>

                <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>

                <div className="relative w-full">
                    <NormBlockView
                        label="Согласование после внесённых изменений"
                        value={process.repeatDeadlineMinutes}
                        workingTime={process.usesWorkingTime}
                        phaseStatus={repeatPhaseStatus}
                        startedAt={process.repeatStartedAt}
                    />
                    {repeatPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.repeatStartedAt}
                            deadlineAt={process.repeatDeadlineAt}
                            workingTime={process.usesWorkingTime}
                        />
                    )}
                </div>

                <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>

                <div className="relative w-full">
                    <NormBlockView
                        label="Финальная выдержка"
                        value={process.finalHoldDeadlineMinutes}
                        workingTime={process.usesWorkingTime}
                        phaseStatus={finalHoldPhaseStatus}
                        startedAt={process.finalHoldStartedAt}
                    />
                    {finalHoldPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.finalHoldStartedAt}
                            deadlineAt={process.finalHoldDeadlineAt}
                            workingTime={process.usesWorkingTime}
                        />
                    )}
                </div>
            </div>
            </div>
        </>
    );
}