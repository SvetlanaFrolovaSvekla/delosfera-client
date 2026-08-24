// Панель с перечнем редакций документа
import {Fragment} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";
import {
    Calendar,
    Columns2,
    Download,
    ListTree,
    Loader2,
    Paperclip,
    Pencil,
    Plus,
    RefreshCw,
    Table2,
    Upload
} from "lucide-react";
import type {VndStatusKey} from "@/constants/vndTabs.ts";

/** Какое действие выполняет главная кнопка сайдбара:
 * - "new" — добавить редакцию напрямую (у ВНД ещё нет действующей редакции)
 * - "actualize" — начать актуализацию (открывает StartActualizationModal/RequestActualizationAccessModal)
 * - "performActualization" — выполнить актуализацию (открывает PerformActualizationModal прямо
 *   здесь, во вкладке «Редакции» — без перехода на вкладку «Актуализация»): либо цикл уже начат
 *   напрямую и шаг ещё не пройден (needsPerform), либо есть одобренная заявка и цикл нужно
 *   стартовать (needsConfirmStartAfterRequest)
 * - "uploadActualized" — загрузить актуализированную версию (цикл начат И шаг "Выполнить
 *   актуализацию" уже пройден) */
export type RedactionsPrimaryActionVariant = "new" | "actualize" | "performActualization" | "uploadActualized";

interface RedactionsSidebarProps {
    redactions: VndRedactionResponse[];
    vndStatus: VndStatusKey;
    selectedId: number | undefined;
    onSelect: (id: number) => void;
    primaryActionVariant: RedactionsPrimaryActionVariant;
    primaryActionDisabled: boolean;
    /** Текст подсказки под кнопкой (почему заблокирована/что происходит) — необязателен */
    primaryActionHint?: string;
    onPrimaryAction: () => void;
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

const VISIBLE_REDACTIONS_COUNT = 4;
const REDACTION_ITEM_HEIGHT_PX = 56;

const PRIMARY_ACTION_META: Record<
    RedactionsPrimaryActionVariant,
    { icon: typeof Plus; labelKey: string }
> = {
    new: {icon: Plus, labelKey: "openVndPage.redactionsSidebar.newRedactionButton"},
    actualize: {icon: RefreshCw, labelKey: "openVndPage.redactionsSidebar.actualRedactionButton"},
    performActualization: {icon: RefreshCw, labelKey: "openVndPage.redactionsSidebar.performActualizationButton"},
    uploadActualized: {icon: Upload, labelKey: "openVndPage.redactionsSidebar.uploadActualizedButton"},
};

export function RedactionsSidebar({
                                      redactions,
                                      vndStatus,
                                      selectedId,
                                      onSelect,
                                      primaryActionVariant,
                                      primaryActionDisabled,
                                      primaryActionHint,
                                      onPrimaryAction,
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
    const isScrollable = redactions.length > VISIBLE_REDACTIONS_COUNT;
    const lastRedactionId = redactions[0]?.id;
    const firstRedactionId = redactions[redactions.length - 1]?.id;
    const primaryMeta = PRIMARY_ACTION_META[primaryActionVariant];
    const PrimaryIcon = primaryMeta.icon;

    return (
        <div className="rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
            <div className="px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                {/* Редакции документа */}
                {t("openVndPage.redactionsSidebar.title")}
            </div>

            <div
                className={`flex flex-col gap-2 ${isScrollable ? "overflow-y-auto pr-1" : ""}`}
                style={isScrollable ? {maxHeight: VISIBLE_REDACTIONS_COUNT * REDACTION_ITEM_HEIGHT_PX} : undefined}
            >
                {redactions.map((e, index) => (
                    <Fragment key={e.id}>
                        <RedactionListItem
                            redaction={e}
                            vndStatus={vndStatus}
                            isLatest={e.id === lastRedactionId}
                            active={e.id === selectedId}
                            onClick={() => onSelect(e.id)}
                            showEditButton={canEditLastRevision && e.id === lastRedactionId && e.approvalStatus !== "Pending"}
                            showTidButton={e.id !== firstRedactionId}
                            onEdit={() => onEditRedaction(e.id)}
                            onOpenAttachments={() => onOpenAttachments(e)}
                            onOpenTid={() => onOpenTid(e)}
                        />
                        {index < redactions.length - 1 && (
                            <div className="h-px shrink-0 bg-gradient-to-r from-transparent via-[#e5e9f0] to-transparent"/>
                        )}
                    </Fragment>
                ))}
            </div>

            <div className="mt-[11px] flex flex-col gap-1">
                <button
                    onClick={onPrimaryAction}
                    disabled={primaryActionDisabled}
                    className="cursor-pointer flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                >
                    <PrimaryIcon size={16} strokeWidth={2}/>
                    {t(primaryMeta.labelKey)}
                </button>
                {primaryActionHint && (
                    <p className="px-1 text-[11px] leading-[1.4] text-[#9a6408]">
                        {primaryActionHint}
                    </p>
                )}
            </div>

            <button
                onClick={onDownloadSelected}
                disabled={downloadDisabled || downloading}
                className="cursor-pointer mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] transition-colors hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {downloading ? (
                    <Loader2 size={16} strokeWidth={1.8} className="animate-spin"/>
                ) : (
                    <Download size={16} strokeWidth={1.8}/>
                )}
                {/* Скачать редакцию */}
                {t("openVndPage.redactionsSidebar.downloadButton")}
            </button>

            <button
                onClick={onToggleContents}
                className={`cursor-pointer mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                    contentsOpen
                        ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                        : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                }`}
            >
                <ListTree size={16} strokeWidth={1.8}/>
                {/* Содержание редакции */}
                {t("openVndPage.redactionsSidebar.contentsButton")}
            </button>

            <button
                onClick={onToggleCompare}
                className={`cursor-pointer mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                    compareMode
                        ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                        : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                }`}
            >
                <Columns2 size={16} strokeWidth={1.8}/>
                {/* Сравнение редакций */}
                {t("openVndPage.redactionsSidebar.compareButton")}
            </button>
        </div>
    );
}

function RedactionListItem({
                               redaction,
                               vndStatus,
                               isLatest,
                               active,
                               onClick,
                               showEditButton,
                               showTidButton,
                               onEdit,
                               onOpenAttachments,
                               onOpenTid,
                           }: {
    redaction: VndRedactionResponse;
    active: boolean;
    vndStatus: VndStatusKey;
    isLatest: boolean;
    onClick: () => void;
    showEditButton: boolean;
    showTidButton: boolean;
    onEdit: () => void;
    onOpenAttachments: () => void;
    onOpenTid: () => void;
}) {
    const {t} = useTranslation();
    const status = getRedactionDisplayStatus(redaction, vndStatus, isLatest);
    const meta = REDACTION_STATUS_META[status];
    const hasAttachments = redaction.attachmentFileIds.length > 0;
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
                                {redaction.attachmentFileIds.length}
                            </button>
                        ) : (
                            <span className="flex items-center gap-[4px] text-[#c3ccd8]">
                                <Paperclip size={12} className="flex-none"/>
                                0
                            </span>
                        )}
                    </span>

                    {redaction.description && (
                        <span className="mt-[5px] line-clamp-5 block text-[11.5px] leading-[1.5] text-[#55617a]">
                            {redaction.description}
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