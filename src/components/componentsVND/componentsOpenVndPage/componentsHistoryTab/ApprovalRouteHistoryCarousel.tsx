// Пролистываемая "карусель" схем маршрута согласования одного процесса (Попытки) - одна
// страница на каждый этап/круг: "Первичное согласование", затем по одной странице на каждый
// ЗАВЕРШЁННЫЙ круг "Согласование после внесённых изменений" (если замечания устраняли
// несколько раз подряд - process.phaseRounds, см. VndApprovalPhaseRound на бэке) плюс одна
// страница на ТЕКУЩИЙ/последний такой круг, и аналогично для "Финальной выдержки" (тоже может
// повториться, если на ней снова оставили замечание).
//
// Каждая страница показывает либо ТЕКУЩЕЕ состояние (если это активный сейчас этап процесса -
// isCurrent), либо КОНЕЧНОЕ состояние круга, каким оно было на момент, когда все согласующие
// этого круга уже отправили резолюции (или когда круг был перезаписан следующим) - именно то,
// что просила Светлана: "либо текущее состояние (если этап - сейчас), либо конечное состояние
// схемы - когда все согласующие отправили свои резолюции".
//
// 23.09.2026 - у каждой страницы видно, к какой ВЕРСИИ документа ("10296-Р1", "10296-Р1.1"...)
// относятся её замечания; эту версию можно открыть (с подсветкой замечаний именно этого круга и
// переходом "Показать в тексте") и скачать - в том числе итоговую согласованную версию на
// последней странице. У решений показываются приложенные к ним файлы - и у прошлых кругов тоже
// (раньше файлы прошлых кругов удалялись, см. VndApprovalStageAttachment.PhaseRoundId на бэке).
import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {ChevronLeft, ChevronRight, Download, Eye, Paperclip} from "lucide-react";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {
    FormattedResolutionComment, type FormattedCommentQuoteRef,
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import type {
    ApprovalPhaseRoundResponse,
    ApprovalProcessResponse,
    ApprovalStageAttachmentResponse,
    ApprovalStageDecisionResponse,
    ApprovalStageQuoteResponse,
    VndRedactionRevisionSnapshotResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {
    getLiveRevisionIndex, getRevisionLabel, getSnapshotRevisionIndex,
} from "@/utils/vndProcess/redactionRevisions.ts";
import {buildRedactionFileName} from "@/utils/downloadFiles/fileNaming.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

const DECISION_COLORS: Record<ApprovalStageDecisionResponse, { color: string; bg: string }> = {
    pending: {color: "#8b97ab", bg: "#f1f3f6"},
    approved: {color: "#1f9d55", bg: "#e8f8ee"},
    approved_with_comment: {color: "#c9820a", bg: "#fdf3e2"},
    rejected: {color: "#d1453b", bg: "#fdeceb"},
    auto_approved_timeout: {color: "#5c6b8a", bg: "#eef1f6"},
    removed_by_editor: {color: "#9aa1ac", bg: "#f4f5f7"},
};

interface SchemaStageDecision {
    stageId: number;
    decision: ApprovalStageDecisionResponse;
    comment: string | null;
    decidedAt: string | null;
    /** Файлы, приложенные к этому решению (для прошлых кругов - из архива круга). */
    attachments?: ApprovalStageAttachmentResponse[];
}

interface SchemaPage {
    key: string;
    phaseLabel: string;
    roundLabel: string | null;
    isCurrent: boolean;
    completedAt: string | null;
    initiatorComment: string | null;
    decisions: SchemaStageDecision[];
    /** Снимок файлов редакции, к которому относятся комментарии этой страницы (см.
     * VndRedactionRevisionSnapshotResponse) — null, если снимка нет (страница "Текущий этап":
     * это ещё живая, не архивная версия документа) или процесс ни разу не отправляли повторно. */
    snapshot: VndRedactionRevisionSnapshotResponse | null;
    /** "primary"/"repeat"/"finalHold" - фаза страницы (для выборки цитат её решений). */
    phaseKey: "primary" | "repeat" | "finalHold";
    /** Версия документа, которую рассматривали на этой странице (0 - "Р1", 1 - "Р1.1"...) - см.
     * pageRevisionIndex. null - определить нельзя. */
    revisionIndex: number | null;
}

/** Ключ снимка в формате, совпадающем с SchemaPage.key ("primary"/"repeat-1"/"finalHold-2" и
 * т.д.) — так снимок находится для нужной страницы карусели одним поиском по массиву. */
function snapshotPageKey(s: VndRedactionRevisionSnapshotResponse): string {
    return s.phase === "primary" ? "primary" : `${s.phase}-${s.roundNumber}`;
}

function findSnapshotForKey(process: ApprovalProcessResponse, key: string): VndRedactionRevisionSnapshotResponse | null {
    return process.redactionSnapshots.find((s) => snapshotPageKey(s) === key) ?? null;
}

function buildPrimaryPage(t: TFunction, process: ApprovalProcessResponse): SchemaPage {
    const isCurrent = process.status === "primary";
    return {
        key: "primary",
        phaseLabel: t("openVndPage.historyTab.processStatuses.primary"),
        roundLabel: null,
        isCurrent,
        completedAt: isCurrent ? null : (process.repeatStartedAt ?? process.finalHoldStartedAt ?? process.completedAt),
        initiatorComment: null,
        decisions: process.stages.map((s) => ({
            stageId: s.id, decision: s.primaryDecision, comment: s.primaryComment, decidedAt: s.primaryDecidedAt,
            attachments: s.primaryAttachments,
        })),
        snapshot: findSnapshotForKey(process, "primary"),
        phaseKey: "primary",
        // Первичное согласование всегда рассматривает самую первую версию документа.
        revisionIndex: 0,
    };
}

function roundToPage(process: ApprovalProcessResponse, round: ApprovalPhaseRoundResponse, phaseLabel: string, roundLabel: string | null): SchemaPage {
    const key = `${round.phase}-${round.roundNumber}`;
    const snapshot = findSnapshotForKey(process, key);
    return {
        key,
        phaseLabel,
        roundLabel,
        isCurrent: false,
        completedAt: round.completedAt,
        initiatorComment: round.initiatorComment,
        decisions: round.stageDecisions,
        snapshot,
        phaseKey: round.phase,
        revisionIndex: snapshot ? getSnapshotRevisionIndex(process, snapshot.id) : null,
    };
}

function buildCurrentRepeatPage(t: TFunction, process: ApprovalProcessResponse, roundLabel: string | null): SchemaPage | null {
    if (!process.repeatStartedAt) return null;
    const isCurrent = process.status === "repeated";
    return {
        key: "repeat-current",
        phaseLabel: t("openVndPage.historyTab.carousel.repeatPhaseLabel"),
        roundLabel,
        isCurrent,
        completedAt: isCurrent ? null : (process.finalHoldStartedAt ?? process.completedAt),
        initiatorComment: process.repeatInitiatorComment,
        decisions: process.stages
            .filter((s) => s.participatesInRepeat)
            .map((s) => ({
                stageId: s.id, decision: s.repeatDecision ?? "pending", comment: s.repeatComment, decidedAt: s.repeatDecidedAt,
                attachments: s.repeatAttachments,
            })),
        // Текущий/ещё не завершённый круг показывает живую версию документа (см. таб
        // "Документ") — архивный снимок для него не создаётся, он появится только когда этот
        // круг завершится следующей повторной отправкой.
        snapshot: null,
        phaseKey: "repeat",
        revisionIndex: getLiveRevisionIndex(process),
    };
}

function buildCurrentFinalHoldPage(t: TFunction, process: ApprovalProcessResponse, roundLabel: string | null): SchemaPage | null {
    if (!process.finalHoldStartedAt) return null;
    const isCurrent = process.status === "final_hold";
    return {
        key: "finalHold-current",
        phaseLabel: t("openVndPage.historyTab.processStatuses.final_hold"),
        roundLabel,
        isCurrent,
        completedAt: isCurrent ? null : process.completedAt,
        initiatorComment: null,
        decisions: process.stages.map((s) => ({
            stageId: s.id, decision: s.finalHoldDecision ?? "pending", comment: s.finalHoldComment, decidedAt: s.finalHoldDecidedAt,
            attachments: s.finalHoldAttachments,
        })),
        snapshot: null,
        phaseKey: "finalHold",
        revisionIndex: getLiveRevisionIndex(process),
    };
}

function buildSchemaPages(t: TFunction, process: ApprovalProcessResponse): SchemaPage[] {
    const pages: SchemaPage[] = [buildPrimaryPage(t, process)];

    const repeatRounds = [...process.phaseRounds]
        .filter((r) => r.phase === "repeat")
        .sort((a, b) => a.roundNumber - b.roundNumber);
    const finalHoldRounds = [...process.phaseRounds]
        .filter((r) => r.phase === "finalHold")
        .sort((a, b) => a.roundNumber - b.roundNumber);

    // Круг нумеруется только если их реально больше одного - незачем подписывать "Круг 1",
    // когда доработка была только одна.
    const repeatTotal = repeatRounds.length + (process.repeatStartedAt ? 1 : 0);
    repeatRounds.forEach((r) => pages.push(
        roundToPage(process, r, t("openVndPage.historyTab.carousel.repeatPhaseLabel"), repeatTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: r.roundNumber}) : null),
    ));
    const currentRepeat = buildCurrentRepeatPage(t, process, repeatTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: repeatTotal}) : null);
    if (currentRepeat) pages.push(currentRepeat);

    const finalHoldTotal = finalHoldRounds.length + (process.finalHoldStartedAt ? 1 : 0);
    finalHoldRounds.forEach((r) => pages.push(
        roundToPage(process, r, t("openVndPage.historyTab.processStatuses.final_hold"), finalHoldTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: r.roundNumber}) : null),
    ));
    const currentFinalHold = buildCurrentFinalHoldPage(t, process, finalHoldTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: finalHoldTotal}) : null);
    if (currentFinalHold) pages.push(currentFinalHold);

    return pages;
}

/** Файлы снимка, у которых реально есть значение — в порядке ru/kg/en/tid/матрица
 * разногласий. Название файла на бэке может отсутствовать (FileAttachment не найден) — тогда
 * подписываем меткой типа файла, чтобы кнопка не осталась пустой. */
function snapshotFiles(t: TFunction, snapshot: VndRedactionRevisionSnapshotResponse): {fileId: number; label: string}[] {
    const entries: {fileId: number | null; name: string | null; labelKey: string}[] = [
        {fileId: snapshot.docFileRuId, name: snapshot.docFileRuName, labelKey: "ru"},
        {fileId: snapshot.docFileKgId, name: snapshot.docFileKgName, labelKey: "kg"},
        {fileId: snapshot.docFileEnId, name: snapshot.docFileEnName, labelKey: "en"},
        {fileId: snapshot.tidFileId, name: snapshot.tidFileName, labelKey: "tid"},
        {fileId: snapshot.disagreementMatrixFileId, name: snapshot.disagreementMatrixFileName, labelKey: "disagreementMatrix"},
    ];
    return entries
        .filter((e): e is {fileId: number; name: string | null; labelKey: string} => e.fileId !== null)
        .map((e) => ({
            fileId: e.fileId,
            label: e.name ?? t(`openVndPage.historyTab.carousel.downloadVersionFileLabels.${e.labelKey}`),
        }));
}

interface ApprovalRouteHistoryCarouselProps {
    process: ApprovalProcessResponse;
    /** ВНД и редакция процесса - нужны, чтобы открывать версии документа в окне просмотра и
     * скачивать текущую/итоговую версию. Без них остаются только кнопки скачивания снимков. */
    vnd?: VndResponse;
    redaction?: VndRedactionResponse;
    /** Это последний процесс согласования редакции - только для него "живые" файлы редакции
     * совпадают с текущей версией процесса (у более ранних попыток их уже могли заменить). */
    isLatestProcess?: boolean;
}

/** Цитаты решений страницы - по этапу: только этой фазы и этой версии документа (см.
 * ApprovalStageQuoteResponse.revisionIndex). */
function quotesForPage(process: ApprovalProcessResponse, page: SchemaPage): Map<number, ApprovalStageQuoteResponse[]> {
    const byStage = new Map<number, ApprovalStageQuoteResponse[]>();
    if (page.revisionIndex === null) return byStage;
    for (const q of process.allQuotes) {
        if (q.phase !== page.phaseKey || q.revisionIndex !== page.revisionIndex) continue;
        const list = byStage.get(q.stageId);
        if (list) list.push(q); else byStage.set(q.stageId, [q]);
    }
    return byStage;
}

/** Файлы ТЕКУЩЕЙ ("живой") версии редакции - для страницы текущего/последнего круга, у которой
 * архивного снимка нет (см. SchemaPage.snapshot). */
function liveRedactionFiles(redaction: VndRedactionResponse, vndName: string): {fileId: number; label: string; name: string}[] {
    const entries: {fileId: number | null; label: string; name: string}[] = [
        {fileId: redaction.docFileRuId, label: "RU", name: buildRedactionFileName(redaction.code, vndName, "ru")},
        {fileId: redaction.docFileKgId, label: "KG", name: buildRedactionFileName(redaction.code, vndName, "kg")},
        {fileId: redaction.docFileEnId, label: "EN", name: buildRedactionFileName(redaction.code, vndName, "en")},
        {fileId: redaction.tidFileId, label: "ТИД", name: `${redaction.code}_ТИД.docx`},
        {fileId: redaction.disagreementMatrixFileId, label: "Матрица разногласий", name: `${redaction.code}_Матрица_разногласий.docx`},
    ];
    return entries.filter((e): e is {fileId: number; label: string; name: string} => e.fileId !== null);
}

interface OpenVersionState {
    revisionIndex: number;
    language?: RedactionViewTarget;
    focusQuoteId?: number;
}

export function ApprovalRouteHistoryCarousel({process, vnd, redaction, isLatestProcess = true}: ApprovalRouteHistoryCarouselProps) {
    const {t} = useTranslation();
    const pages = buildSchemaPages(t, process);
    // По умолчанию открываем ПОСЛЕДНЮЮ страницу (текущий/самый свежий этап) - так сразу видно,
    // на чём процесс сейчас, а назад можно пролистать всю историю кругов.
    const [index, setIndex] = useState(pages.length - 1);
    const safeIndex = Math.min(Math.max(index, 0), pages.length - 1);
    const page = pages[safeIndex];
    // Открытая в окне просмотра версия документа (с замечаниями этого круга).
    const [openVersion, setOpenVersion] = useState<OpenVersionState | null>(null);

    if (!page) return null;

    const stageById = new Map(process.stages.map((s) => [s.id, s]));
    const liveRevisionIndex = getLiveRevisionIndex(process);
    const isLivePage = page.revisionIndex !== null && page.revisionIndex === liveRevisionIndex && !page.snapshot;
    // Открыть версию можно, если известно, какая это версия, и есть что открывать: снимок, либо
    // "живые" файлы редакции у последнего процесса.
    const canOpenVersion = !!vnd && !!redaction && page.revisionIndex !== null
        && (!!page.snapshot || (isLivePage && isLatestProcess));
    const versionLabel = redaction && page.revisionIndex !== null
        ? getRevisionLabel(redaction, page.revisionIndex)
        : null;
    const pageQuotes = quotesForPage(process, page);

    const handleShowQuote = (quote: FormattedCommentQuoteRef) => {
        if (!canOpenVersion || page.revisionIndex === null) return;
        setOpenVersion({
            revisionIndex: page.revisionIndex,
            language: quote.documentTarget as RedactionViewTarget,
            focusQuoteId: quote.id,
        });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-[#26324a]">{page.phaseLabel}</span>
                    {page.roundLabel && (
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#8b97ab]">
                            {page.roundLabel}
                        </span>
                    )}
                    {page.isCurrent ? (
                        <span className="rounded-full bg-[#ececfc] px-2 py-0.5 text-[10px] font-bold text-[#4e57d6]">
                            {t("openVndPage.historyTab.carousel.currentStageLabel")}
                        </span>
                    ) : (
                        <span className="rounded-full bg-[#f1f3f6] px-2 py-0.5 text-[10px] font-bold text-[#8b97ab]">
                            {t("openVndPage.historyTab.carousel.completedLabel")}{page.completedAt ? ` · ${formatDateTime(page.completedAt)}` : ""}
                        </span>
                    )}
                    {versionLabel && (
                        <span className="rounded-full border border-[#d4d6f8] bg-white px-2 py-0.5 text-[10px] font-bold text-[#4e57d6]">
                            {t("openVndPage.historyTab.carousel.versionLabel", {code: versionLabel})}
                        </span>
                    )}
                </div>

                {pages.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={safeIndex === 0}
                            onClick={() => setIndex((i) => Math.max(0, i - 1))}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#e5e9f0] text-[#6b7488] hover:bg-[#f5f6fa] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeft size={14}/>
                        </button>
                        <span className="text-[11px] tabular-nums text-[#8b97ab]">
                            {safeIndex + 1} / {pages.length}
                        </span>
                        <button
                            type="button"
                            disabled={safeIndex === pages.length - 1}
                            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#e5e9f0] text-[#6b7488] hover:bg-[#f5f6fa] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronRight size={14}/>
                        </button>
                    </div>
                )}
            </div>

            {page.initiatorComment && (
                <div className="whitespace-pre-wrap break-words rounded-[10px] border border-[#d4d6f8] bg-[#f5f6fd] px-3 py-2 text-[11.5px] text-[#3c424a]">
                    <span className="font-semibold text-[#4e57d6]">{t("openVndPage.historyTab.carousel.correctionsCommentLabel")}</span>
                    <FormattedResolutionComment text={page.initiatorComment}/>
                </div>
            )}

            {/* Версия документа этой страницы: открыть (с замечаниями этого круга) и скачать.
                Для прошлых кругов - архивный снимок; для текущего/последнего круга - текущие файлы
                редакции (после завершения согласования это итоговая согласованная версия). */}
            {(page.snapshot || (isLivePage && isLatestProcess && redaction)) && (
                <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-2">
                    <span className="text-[11px] font-semibold text-[#6b7488]">
                        {page.snapshot
                            ? t("openVndPage.historyTab.carousel.downloadVersionLabel")
                            : process.status === "approved"
                                ? t("openVndPage.historyTab.carousel.downloadFinalVersionLabel")
                                : t("openVndPage.historyTab.carousel.downloadCurrentVersionLabel")}
                    </span>
                    {(page.snapshot
                        ? snapshotFiles(t, page.snapshot).map((f) => ({...f, name: f.label}))
                        : liveRedactionFiles(redaction!, vnd?.name ?? "")
                    ).map((f) => (
                        <button
                            key={f.fileId}
                            type="button"
                            onClick={() => downloadWithToast(f.fileId, f.name)}
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-[#d4d6f8] bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#4e57d6] hover:bg-[#f5f6fd]"
                        >
                            <Download size={11}/>
                            {f.label}
                        </button>
                    ))}
                    {canOpenVersion && (
                        <button
                            type="button"
                            onClick={() => setOpenVersion({revisionIndex: page.revisionIndex!})}
                            className="ml-auto flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#d4d6f8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4e57d6] hover:bg-[#f5f6fd]"
                        >
                            <Eye size={12}/>
                            {t("openVndPage.historyTab.carousel.openVersionButton")}
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-2.5 rounded-[14px] border border-[#e5e9f0] bg-[#fbfcfe] p-3.5">
                {page.decisions.length === 0 ? (
                    <div className="py-2 text-[11.5px] text-[#a3adbd]">{t("openVndPage.historyTab.carousel.noDataForStage")}</div>
                ) : (
                    page.decisions.map((d) => {
                        const stage = stageById.get(d.stageId);
                        const colors = DECISION_COLORS[d.decision];
                        return (
                            <div
                                key={d.stageId}
                                className="flex min-w-[180px] max-w-[240px] flex-1 flex-col gap-1 rounded-[10px] border border-[#e9edf3] bg-white p-2.5"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded bg-[#ececfc] text-[8.5px] font-bold text-[#4e57d6]">
                                        {getInitials(stage?.approverName ?? "")}
                                    </span>
                                    <span className="truncate text-[11px] font-semibold text-[#26324a]">
                                        {stage?.approverName ?? "—"}
                                    </span>
                                </div>
                                <span
                                    className="w-fit rounded px-1.5 py-0.5 text-[9.5px] font-bold"
                                    style={{color: colors.color, background: colors.bg}}
                                >
                                    {t(`openVndPage.historyTab.carousel.decisionLabels.${d.decision}`)}
                                </span>
                                {d.comment && (
                                    <div className="whitespace-pre-wrap break-words text-[10.5px] text-[#6b7488]">
                                        <FormattedResolutionComment
                                            text={d.comment}
                                            quotes={pageQuotes.get(d.stageId)}
                                            onShowInText={canOpenVersion ? handleShowQuote : undefined}
                                        />
                                    </div>
                                )}
                                {(d.attachments?.length ?? 0) > 0 && (
                                    <div className="flex flex-col gap-1">
                                        {d.attachments!.map((a) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => downloadWithToast(a.fileId, a.fileName)}
                                                className="flex min-w-0 cursor-pointer items-center gap-1 text-left text-[10px] font-semibold text-[#4e57d6] hover:underline"
                                            >
                                                <Paperclip size={10} className="flex-none"/>
                                                <span className="truncate">{a.fileName}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {d.decidedAt && (
                                    <div className="text-[10px] text-[#a3adbd]">{formatDateTime(d.decidedAt)}</div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {openVersion && vnd && redaction && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={redaction}
                    approvalProcess={process}
                    initialRevisionIndex={openVersion.revisionIndex}
                    initialLanguage={openVersion.language}
                    initialFocusQuoteId={openVersion.focusQuoteId}
                    downloadingId={null}
                    onDownload={(fileId, name) => void downloadWithToast(fileId, name)}
                    onClose={() => setOpenVersion(null)}
                />
            )}
        </div>
    );
}
