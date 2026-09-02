// Панель с перечнем редакций документа
import {Fragment} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";

/** Компактный формат для строки "Актуализация {дата} №{код}" / "Первая редакция {дата} №{код}" —
 * ДД.ММ.ГГг. (двузначный год), как на макете. Отдельно от formatDate (там полный год) — это
 * не дата загрузки файла, а дата ПРИНЯТИЯ конкретной редакции (реквизит редакции). */
function formatShortYearDate(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return "";
    return `${d}.${m}.${y.slice(-2)}г.`;
}
import {
    Calendar,
    CheckCircle2,
    Columns2,
    Download,
    ListTree,
    Loader2,
    Paperclip,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Table2,
    Upload
} from "lucide-react";
import type {VndStatusKey} from "@/constants/vndTabs.ts";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

/** Какое действие выполняет главная кнопка сайдбара:
 * - "new" — добавить редакцию напрямую (у ВНД ещё нет действующей редакции)
 * - "actualize" — начать актуализацию (открывает StartActualizationModal/RequestActualizationAccessModal)
 * - "performActualization" — выполнить актуализацию (открывает PerformActualizationModal прямо
 *   здесь, во вкладке «Редакции» — без перехода на вкладку «Актуализация»): либо цикл уже начат
 *   напрямую и шаг ещё не пройден (needsPerform), либо есть одобренная заявка и цикл нужно
 *   стартовать (needsConfirmStartAfterRequest)
 * - "uploadActualized" — загрузить актуализированную версию (цикл начат, шаг "Выполнить
 *   актуализацию" пройден, и заявлено, что будут изменения — нужна новая редакция)
 * - "startApprovalNoChanges" — заявлено "без изменений" + цикл требует согласования: новая
 *   редакция не нужна, действующая редакция отправляется на согласование как есть
 * - "confirmNoChanges" — заявлено "без изменений" + согласование не требуется: подтвердить
 *   отсутствие изменений напрямую, документ сразу уходит в консолидацию */
export type RedactionsPrimaryActionVariant =
    | "new"
    | "actualize"
    | "performActualization"
    | "uploadActualized"
    | "startApprovalNoChanges"
    | "confirmNoChanges";

interface RedactionsSidebarProps {
    redactions: VndRedactionResponse[];
    vndStatus: VndStatusKey;
    /** Дата вступления в силу ВНД — определяет, показывать ли действующей редакции статус
     * "ожидание вступления в силу" вместо "актуальная" (см. getRedactionDisplayStatus). */
    effectiveDate?: string | null;
    selectedId: number | undefined;
    /** id редакции, чей последний процесс согласования был отклонён - под ней покажем
     * подсказку "отредактируйте, чтобы отправить вновь" (см. VndEditionsTab) */
    rejectedRedactionId?: number;
    onSelect: (id: number) => void;
    primaryActionVariant: RedactionsPrimaryActionVariant;
    primaryActionDisabled: boolean;
    primaryActionHint?: string;
    /** Тултип-пояснение к primaryActionHint - показывается рядом с текстом подсказки, если задан. */
    primaryActionHintTooltip?: string;
    onPrimaryAction: () => void;
    /** Надпись-кнопка под подсказкой основного действия — например, "Изменить настройки
     * актуализации" в сценарии startApprovalNoChanges. Показывается, только если задан label. */
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    secondaryActionTooltip?: string;
    compareMode: boolean;
    onToggleCompare: () => void;
    contentsOpen: boolean;
    onToggleContents: () => void;
    canEditLastRevision: boolean;
    onEditRedaction: (id: number) => void;
    onOpenAttachments: (redaction: VndRedactionResponse) => void;
    onOpenTid: (redaction: VndRedactionResponse) => void;
    onDownloadSelected: () => void;
    downloadDisabled: boolean;
    downloading: boolean;
}

const PRIMARY_ACTION_META: Record<
    RedactionsPrimaryActionVariant,
    { icon: typeof Plus; labelKey: string }
> = {
    new: {icon: Plus, labelKey: "openVndPage.redactionsSidebar.newRedactionButton"},
    actualize: {icon: RefreshCw, labelKey: "openVndPage.redactionsSidebar.actualRedactionButton"},
    performActualization: {icon: RefreshCw, labelKey: "openVndPage.redactionsSidebar.performActualizationButton"},
    uploadActualized: {icon: Upload, labelKey: "openVndPage.redactionsSidebar.uploadActualizedButton"},
    startApprovalNoChanges: {icon: Send, labelKey: "openVndPage.redactionsSidebar.startApprovalButton"},
    confirmNoChanges: {icon: CheckCircle2, labelKey: "openVndPage.redactionsSidebar.confirmNoChangesButton"},
};

export function RedactionsSidebar({
                                      redactions,
                                      vndStatus,
                                      effectiveDate,
                                      selectedId,
                                      rejectedRedactionId,
                                      onSelect,
                                      primaryActionVariant,
                                      primaryActionDisabled,
                                      primaryActionHint,
                                      primaryActionHintTooltip,
                                      onPrimaryAction,
                                      secondaryActionLabel,
                                      onSecondaryAction,
                                      secondaryActionTooltip,
                                      compareMode,
                                      onToggleCompare,
                                      contentsOpen,
                                      onToggleContents,
                                      canEditLastRevision,
                                      onEditRedaction,
                                      onOpenAttachments,
                                      onOpenTid,
                                      onDownloadSelected,
                                      downloadDisabled,
                                      downloading,
                                  }: RedactionsSidebarProps) {
    const {t} = useTranslation();
    const lastRedactionId = redactions[0]?.id;
    const firstRedactionId = redactions[redactions.length - 1]?.id;
    const primaryMeta = PRIMARY_ACTION_META[primaryActionVariant];
    const PrimaryIcon = primaryMeta.icon;
    const compareDisabled = redactions.length < 2;

    return (
        <div className="flex max-h-[500px] flex-col rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
            <div
                className="flex-none px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                {t("openVndPage.redactionsSidebar.title")}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-2">
                    {redactions.map((e, index) => (
                        <Fragment key={e.id}>
                            <RedactionListItem
                                redaction={e}
                                vndStatus={vndStatus}
                                effectiveDate={effectiveDate}
                                isLatest={e.id === lastRedactionId}
                                active={e.id === selectedId}
                                onClick={() => onSelect(e.id)}
                                showEditButton={canEditLastRevision && e.id === lastRedactionId && e.approvalStatus !== "Pending"}
                                showTidButton={e.id !== firstRedactionId}
                                wasRejected={e.id === rejectedRedactionId}
                                onEdit={() => onEditRedaction(e.id)}
                                onOpenAttachments={() => onOpenAttachments(e)}
                                onOpenTid={() => onOpenTid(e)}
                            />
                            {index < redactions.length - 1 && (
                                <div
                                    className="h-px shrink-0 bg-gradient-to-r from-transparent via-[#e5e9f0] to-transparent"/>
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>

            <div className="mt-[11px] flex flex-none flex-col gap-1">
                <button
                    onClick={onPrimaryAction}
                    disabled={primaryActionDisabled}
                    className="cursor-pointer flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                >
                    <PrimaryIcon size={16} strokeWidth={2}/>
                    {t(primaryMeta.labelKey)}
                </button>
                {primaryActionHint && (
                    <div className="flex items-start gap-0.5 px-1">
                        <p className="text-[11px] leading-[1.4] text-[#9a6408]">
                            {primaryActionHint}
                        </p>
                        {primaryActionHintTooltip && (
                            <HelpTooltip content={primaryActionHintTooltip}/>
                        )}
                    </div>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <div className="flex items-center gap-0.5 px-1">
                        <button
                            onClick={onSecondaryAction}
                            className="cursor-pointer text-left text-[11px] font-semibold leading-[1.4] text-[#4e57d6] hover:underline"
                        >
                            {secondaryActionLabel}
                        </button>
                        {secondaryActionTooltip && (
                            <HelpTooltip content={secondaryActionTooltip}/>
                        )}
                    </div>
                )}
            </div>

            <button
                onClick={onDownloadSelected}
                disabled={downloadDisabled || downloading}
                className="cursor-pointer mt-2 flex h-[38px] w-full flex-none items-center justify-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] transition-colors hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {downloading ? (
                    <Loader2 size={16} strokeWidth={1.8} className="animate-spin"/>
                ) : (
                    <Download size={16} strokeWidth={1.8}/>
                )}
                {t("openVndPage.redactionsSidebar.downloadButton")}
            </button>

            <button
                onClick={onToggleContents}
                className={`cursor-pointer mt-2 flex h-[38px] w-full flex-none items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                    contentsOpen
                        ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                        : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                }`}
            >
                <ListTree size={16} strokeWidth={1.8}/>
                {t("openVndPage.redactionsSidebar.contentsButton")}
            </button>

            <Tooltip
                content="Сравнение доступно, если у документа есть хотя бы две редакции"
                disabled={!compareDisabled}
                side="top"
            >
                <button
                    onClick={onToggleCompare}
                    disabled={compareDisabled}
                    className={`cursor-pointer mt-2 flex h-[38px] w-full flex-none items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                        compareDisabled
                            ? "disabled:cursor-not-allowed border-[#e5e9f0] bg-[#f6f8fb] text-[#a3adbd]"
                            : compareMode
                                ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                                : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                    }`}
                >
                    <Columns2 size={16} strokeWidth={1.8}/>
                    {t("openVndPage.redactionsSidebar.compareButton")}
                </button>
            </Tooltip>
        </div>
    );
}

function RedactionListItem({
                               redaction,
                               vndStatus,
                               effectiveDate,
                               isLatest,
                               active,
                               onClick,
                               showEditButton,
                               showTidButton,
                               wasRejected,
                               onEdit,
                               onOpenAttachments,
                               onOpenTid,
                           }: {
    redaction: VndRedactionResponse;
    active: boolean;
    vndStatus: VndStatusKey;
    effectiveDate?: string | null;
    isLatest: boolean;
    onClick: () => void;
    showEditButton: boolean;
    showTidButton: boolean;
    /** последний процесс согласования этой редакции был отклонён - показать подсказку */
    wasRejected?: boolean;
    onEdit: () => void;
    onOpenAttachments: () => void;
    onOpenTid: () => void;
}) {
    const {t} = useTranslation();
    const status = getRedactionDisplayStatus(redaction, vndStatus, isLatest, effectiveDate);
    const meta = REDACTION_STATUS_META[status];
    // Кнопка-скрепка открывает "Вложения редакции" (RedactionAttachmentsModal), где помимо
    // обычных вложений теперь показываются и "Специальные вложения" - ТИД и Лист согласования
    // (см. RedactionAttachmentsModal). Раньше кнопка/счётчик учитывали только обычные вложения,
    // из-за чего редакция без обычных вложений, но с уже сформированным Листом согласования
    // (после консолидации), выглядела так, будто вложений нет вовсе, и открыть модалку было
    // нельзя - посмотреть лист согласования можно было только со страницы согласования.
    const specialAttachmentsCount =
        (redaction.tidFileId !== null ? 1 : 0)
        + (redaction.approvalSheetFileId !== null ? 1 : 0)
        + (redaction.disagreementMatrixFileId !== null ? 1 : 0);
    const totalAttachmentsCount = redaction.attachmentFileIds.length + specialAttachmentsCount;
    const hasAttachments = totalAttachmentsCount > 0;
    const hasTid = redaction.tidFileId !== null;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
            className={`cursor-pointer flex flex-col gap-2 rounded-[10px] border p-2 text-left transition-colors ${
                active
                    ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06]"
                    : "border-transparent hover:bg-[#f6f8fb]"
            }`}
        >
            <div className="flex items-start gap-2">
                <span className="w-[38px] flex-none font-mono text-[13px] font-bold text-[#1c2740]">
                    Р{redaction.number}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-[7px]">
                        <span className="text-[12.5px] font-semibold text-[#26324a]">{redaction.code}</span>
                        <span
                            className="rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold"
                            style={{color: meta.color, background: meta.bg}}
                        >
                            {meta.label}
                        </span>
                    </span>

                    <span className="mt-[4px] flex items-center gap-[10px] text-[11px] text-[#3c424a]">
                        <span className="flex items-center gap-[4px]">
                            <Calendar size={12} className="flex-none"/>
                            {formatDate(redaction.createdAt)}
                        </span>
                        {hasAttachments ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onOpenAttachments();
                                }}
                                className="cursor-pointer flex items-center gap-[4px] text-[#3c424a] hover:text-[#4e57d6]"
                            >
                                <Paperclip size={12} className="flex-none"/>
                                {totalAttachmentsCount}
                            </button>
                        ) : (
                            <span className="flex items-center gap-[4px] text-[#c3ccd8]">
                                <Paperclip size={12} className="flex-none"/>
                                0
                            </span>
                        )}
                    </span>

                    {/* Дата принятия/№ принятия ИМЕННО этой редакции (см. миграцию "реквизиты по
                        редакции") — не показываем, пока редакция ещё не консолидирована и этих
                        реквизитов у неё ещё нет (adoptionDate пуст до PublishAsync). */}
                    {redaction.adoptionDate && (
                        <span className="mt-[4px] block text-[11px] leading-[1.4] text-[#55617a]">
                            {redaction.number === 1 ? "Первая редакция" : "Актуализация"}{" "}
                            {formatShortYearDate(redaction.adoptionDate)}
                            {redaction.adoptionCode && ` №${redaction.adoptionCode}`}
                        </span>
                    )}

                    {redaction.description && (
                        <span className="mt-[5px] line-clamp-5 block text-[11.5px] leading-[1.5] text-[#55617a]">
                            {redaction.description}
                        </span>
                    )}

                    {wasRejected && (
                        <span className="mt-[5px] block text-[11px] leading-[1.4] text-[#c0392b]">
                            Эта редакция была отклонена при согласовании. Отредактируйте её, чтобы отправить на согласование вновь.
                        </span>
                    )}
                </span>
            </div>

            {(showEditButton || showTidButton) && (
                <div className="flex items-center justify-center gap-[6px]">
                    {showEditButton && (
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit();
                            }}
                            className="cursor-pointer inline-flex h-7 flex-none items-center justify-center gap-[5px] rounded-[7px] border border-[#e5e9f0] bg-white px-[10px] text-[11px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                        >
                            <Pencil size={12} strokeWidth={2} className="flex-none"/>
                            {/* Редактировать */}
                            {t("openVndPage.redactionsSidebar.editButton")}
                        </button>
                    )}

                    {showTidButton && (
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpenTid();
                            }}
                            disabled={!hasTid}
                            className="cursor-pointer inline-flex h-7 flex-none items-center justify-center gap-[5px] rounded-[7px] border border-[#e5e9f0] bg-white px-[10px] text-[11px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Table2 size={12} strokeWidth={2} className="flex-none"/>
                            {/* ТИД */}
                            {t("openVndPage.redactionsSidebar.tidButton")}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}