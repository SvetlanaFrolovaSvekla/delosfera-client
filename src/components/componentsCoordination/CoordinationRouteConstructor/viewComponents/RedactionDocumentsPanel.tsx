// Компонента с карточкой панели для скачивания ВНД (Документы редакции) в RedactionColumn, RedactionSummaryCard
import React, {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName, isPreviewableFile, resolveVndDocTitle} from "@/utils/downloadFiles/fileNaming.ts";
import type {RedactionLanguage, RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {Download, Eye, FilePlus2, FileText, Loader2, RefreshCw, Trash2, Upload} from "lucide-react";
import {
    AttachmentDocxPreviewModal
} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {useCanExportVnd} from "@/hooks/vndHooks/useCanExportVnd.ts";
import {approvalSheetCaption, getRedactionApprovalSheets} from "@/utils/vndProcess/approvalSheets.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";

interface RedactionDocumentsPanelProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    /* Открыть просмотр документа этой редакции на указанном языке, либо ТИД/специальных вложений
     * (без сравнения, через RedactionViewModal) - кнопка-глазик показывается у языковых
     * документов, ТИД и специальных вложений. У обычных вложений (см. attachments ниже) своя,
     * отдельная кнопка-глазик - открывает AttachmentDocxPreviewModal для .docx/.xlsx/.pptx. */
    onView?: (target: RedactionViewTarget) => void;
}

const DOC_LABELS: {
    labelKey: string;
    lang: RedactionLanguage;
    fileKey: "docFileRuId" | "docFileKgId" | "docFileEnId";
    updatedAtKey: "docRuUpdatedAt" | "docKgUpdatedAt" | "docEnUpdatedAt";
}[] = [
    {labelKey: "vndEditLastRevisionModal.langRu", lang: "ru", fileKey: "docFileRuId", updatedAtKey: "docRuUpdatedAt"},
    {labelKey: "vndEditLastRevisionModal.langKg", lang: "kg", fileKey: "docFileKgId", updatedAtKey: "docKgUpdatedAt"},
    {labelKey: "vndEditLastRevisionModal.langEn", lang: "en", fileKey: "docFileEnId", updatedAtKey: "docEnUpdatedAt"},
];

export function RedactionDocumentsPanel({
                                            vnd,
                                            selected,
                                            downloadingId,
                                            onDownload,
                                            onView,
                                        }: RedactionDocumentsPanelProps) {
    // Просмотр вложения прямо в браузере (см. AttachmentDocxPreviewModal) — по клику на
    // отдельную кнопку-глазик рядом со скачиванием, только для форматов, которые эта модалка
    // умеет показать: .docx/.xlsx/.pptx (см. isPreviewableFile).
    const [previewAttachment, setPreviewAttachment] = useState<{ fileId: number; fileName: string } | null>(null);
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();

    // Метка "Обновлено, дата" актуальна только пока редакция ещё в процессе согласования
    // (т.е. пока не исключено, что мы смотрим именно на этап "Согласование после внесённых
    // изменений") — как только процесс завершился (согласовано/отклонено) или редакция
    // осталась черновиком нового цикла актуализации, метка больше не имеет смысла и должна
    // исчезнуть из интерфейса. Сами DocXxUpdatedAt в БД при этом не сбрасываются - это лог
    // для аудита, кто и когда обновлял файлы редакции.
    const showUpdatedAtBadge = selected.approvalStatus === "Pending";

    const documents = DOC_LABELS
        .filter((d) => selected[d.fileKey] !== null)
        .map((d) => ({
            key: d.lang,
            fileId: selected[d.fileKey] as number,
            label: t(d.labelKey),
            lang: d.lang,
            fileName: buildRedactionFileName(selected.code, vnd.name, d.lang),
            displayTitle: resolveVndDocTitle(vnd, d.lang),
            // Заполняется только если документ на этом языке заменялся после создания
            // редакции (см. ResubmitAfterRevisionAsync на бэке) — показываем как метку
            // "Обновлено, дата" ниже, пока идёт согласование (см. showUpdatedAtBadge).
            // Null для исходного, ни разу не заменённого файла.
            updatedAt: showUpdatedAtBadge ? selected[d.updatedAtKey] : null,
        }));

    // ТИД не привязан к языку - один файл на редакцию. Имя файла собираем отдельно,
    // не через buildRedactionFileName (та функция заточена под языковые варианты документа).
    const tidFileName = `${selected.code}_ТИД.docx`;

    // Листы согласования формируются автоматически сервером (см. VndApprovalService.
    // FinalizeApprovalAsync). У редакции их может быть несколько - первичное согласование плюс
    // по листу за каждое повторное согласование в рамках актуализации без изменений (см.
    // VndRedactionApprovalSheet на бэке); показываем все, от нового к старому, с подписью, от
    // какого согласования и какого числа лист. Последний открывается тем же просмотрщиком, что
    // и раньше (onView("approvalSheet") - он смотрит на approvalSheetFileId), предыдущие - в
    // AttachmentDocxPreviewModal.
    const approvalSheets = [...getRedactionApprovalSheets(selected)].reverse();

    // Матрица разногласий - тоже "специальное" вложение без привязки к языку, появляется, если
    // инициатор при доработке был не полностью согласен с замечаниями (см. RemarksAgreement).
    const disagreementMatrixFileName = `${selected.code}_Матрица_разногласий.docx`;

    return (
        <>
        <div className="p-[20px]">
            <SectionLabel>{t("redactionDocumentsPanel.documents")}</SectionLabel>
            <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                    <DownloadRow
                        key={doc.key}
                        icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                        isDownloading={downloadingId === doc.fileId}
                        onClick={() => onDownload(doc.fileId, doc.fileName)}
                        onView={onView ? () => onView(doc.lang) : undefined}
                    >
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {doc.label}
                            </span>
                            <span className="truncate text-[13px] text-[#26324a]">{doc.displayTitle}</span>
                        </span>
                        {doc.updatedAt && (
                            <span className="flex-none rounded-full bg-[#e7f6ec] px-2 py-[3px] text-[10.5px] font-semibold text-[#1f9254]">
                                {t("redactionDocumentsPanel.updated", {date: formatDate(doc.updatedAt)})}
                            </span>
                        )}
                    </DownloadRow>
                ))}
            </div>

            {selected.tidFileId !== null && (
                <>
                    <SectionLabel className="mt-5">{t("redactionDocumentsPanel.tid")}</SectionLabel>
                    <div className="flex flex-col gap-2">
                        <DownloadRow
                            icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                            isDownloading={downloadingId === selected.tidFileId}
                            onClick={() => onDownload(selected.tidFileId as number, tidFileName)}
                            onView={onView ? () => onView("tid") : undefined}
                        >
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                    {t("redactionDocumentsPanel.tid")}
                                </span>
                                <span className="truncate text-[13px] text-[#26324a]">
                                    {t("redactionDocumentsPanel.tidFull")}
                                </span>
                            </span>
                        </DownloadRow>
                    </div>
                </>
            )}

            {/* Специальные вложения показываются всегда: в них всегда есть строка "Титульный лист"
                (даже если он ещё не сформирован - тогда с кнопками "Сформировать"/"Загрузить"). */}
            <>
                    <SectionLabel className="mt-5">{t("redactionDocumentsPanel.special")}</SectionLabel>
                    <div className="flex flex-col gap-2">
                        <TitlePageRow
                            vndId={vnd.id}
                            redaction={selected}
                            downloadingId={downloadingId}
                            onDownload={onDownload}
                            onPreview={(fileId, fileName) => setPreviewAttachment({fileId, fileName})}
                        />
                        {approvalSheets.map((sheet) => {
                            const isLatest = sheet.fileId === selected.approvalSheetFileId;
                            return (
                                <DownloadRow
                                    key={`sheet-${sheet.id}-${sheet.fileId}`}
                                    icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                                    isDownloading={downloadingId === sheet.fileId}
                                    onClick={() => onDownload(sheet.fileId, sheet.fileName)}
                                    onView={isLatest
                                        ? (onView ? () => onView("approvalSheet") : undefined)
                                        : () => setPreviewAttachment({fileId: sheet.fileId, fileName: sheet.fileName})}
                                >
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                            {t("redactionDocumentsPanel.approvalSheet")}
                                            {approvalSheets.length > 1 && isLatest ? ` · ${t("approvalSheets.latest")}` : ""}
                                        </span>
                                        <span className="truncate text-[13px] text-[#26324a]">
                                            {approvalSheetCaption(t, sheet)}
                                        </span>
                                    </span>
                                    {sheet.isNoChangesActualization && (
                                        <span className="flex-none rounded-full bg-[#ececfc] px-2 py-[3px] text-[10.5px] font-semibold text-[#4e57d6]">
                                            {t("approvalSheets.noChangesBadge")}
                                        </span>
                                    )}
                                </DownloadRow>
                            );
                        })}
                        {selected.disagreementMatrixFileId !== null && (
                            <DownloadRow
                                icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                                isDownloading={downloadingId === selected.disagreementMatrixFileId}
                                onClick={() => onDownload(selected.disagreementMatrixFileId as number, disagreementMatrixFileName)}
                                onView={onView ? () => onView("disagreementMatrix") : undefined}
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                        {t("redactionDocumentsPanel.disagreementMatrix")}
                                    </span>
                                    <span className="truncate text-[13px] text-[#26324a]">
                                        {disagreementMatrixFileName}
                                    </span>
                                </span>
                            </DownloadRow>
                        )}
                    </div>
            </>

            {selected.attachments.length > 0 && (
                <>
                    <SectionLabel className="mt-5">
                        {t("redactionDocumentsPanel.attachments", {count: selected.attachments.length})}
                    </SectionLabel>
                    <div className="flex flex-col gap-2">
                        {selected.attachments.map((attachment) => (
                            <DownloadRow
                                key={attachment.fileId}
                                icon={<FileText size={16} className="text-[#8b97ab]"/>}
                                isDownloading={downloadingId === attachment.fileId}
                                onClick={() => onDownload(attachment.fileId, attachment.fileName)}
                                onView={isPreviewableFile(attachment.fileName)
                                    ? () => setPreviewAttachment({fileId: attachment.fileId, fileName: attachment.fileName})
                                    : undefined}
                                viewTooltip={t("redactionDocumentsPanel.viewAttachment")}
                            >
                                <span className="flex-1 truncate">{attachment.fileName}</span>
                            </DownloadRow>
                        ))}
                    </div>
                </>
            )}
        </div>

        {previewAttachment && (
            <AttachmentDocxPreviewModal
                fileId={previewAttachment.fileId}
                fileName={previewAttachment.fileName}
                downloadingId={downloadingId}
                onDownload={onDownload}
                downloadDisabled={!canExportVnd}
                downloadDisabledHint={t("redactionDocumentsPanel.noExportHint")}
                onClose={() => setPreviewAttachment(null)}
            />
        )}
        </>
    );
}

/** Строка "Титульный лист" в специальных вложениях: шапка с реквизитами этой и предыдущей редакции
 * (см. VndTitlePageService на бэке). Формируется сама при консолидации новой редакции; у старых ВНД
 * её можно сформировать кнопкой или загрузить свой файл. Загруженный вручную лист система больше
 * сама не пересобирает (только по кнопке "Сформировать заново"). */
export function TitlePageRow({
                          vndId,
                          redaction,
                          downloadingId,
                          onDownload,
                          onPreview,
                          onChanged,
                      }: {
    vndId: number;
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onPreview: (fileId: number, fileName: string) => void;
    /** Титульный лист сформирован/загружен/убран - например, перечитать список редакций. */
    onChanged?: (updated: VndRedactionResponse) => void;
}) {
    const {t} = useTranslation();
    // Решает сервер (VndTitlePageService.CanManage): главный редактор, право «Редактирование
    // реквизитов ВНД» или ответственный за текущую актуализацию - у готовящейся редакции.
    const canManage = redaction.canManageTitlePage === true;

    const [state, setState] = useState(() => resolveTitlePageState(redaction));
    const [busy, setBusy] = useState<"generate" | "upload" | "remove" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Другая редакция или обновлённые с сервера данные - берём их.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(resolveTitlePageState(redaction));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [redaction.id, redaction.titlePageFileId, redaction.titlePageIsManual]);

    const run = async (kind: "generate" | "upload" | "remove", action: () => Promise<VndRedactionResponse>,
                       successKey: string) => {
        setBusy(kind);
        try {
            const updated = await action();
            const next = titlePageState(updated);
            // Запоминаем результат, пока родитель не перечитает редакцию: при перемонтировании
            // строка со старым объектом redaction иначе "откатилась" бы к прежнему файлу.
            const prevOverride = titlePageOverrides.get(redaction.id);
            titlePageOverrides.set(redaction.id, {
                staleFileId: prevOverride ? prevOverride.staleFileId : (redaction.titlePageFileId ?? null),
                state: next,
            });
            setState(next);
            onChanged?.(updated);
            toast.success(t(successKey));
        } catch (e) {
            toast.error(t("titlePage.error"), e instanceof Error ? e.message : undefined);
        } finally {
            setBusy(null);
        }
    };

    const generate = () => run("generate", () => vndService.generateTitlePage(vndId, redaction.id), "titlePage.generated");
    const remove = () => run("remove", () => vndService.removeTitlePage(vndId, redaction.id), "titlePage.removed");
    const upload = (file: File) => run("upload", () => vndService.uploadTitlePage(vndId, redaction.id, file), "titlePage.uploaded");

    const actions = canManage && (
        <div className="flex flex-none items-center gap-1">
            <IconAction
                tooltip={state.fileId === null ? t("titlePage.generate") : t("titlePage.regenerate")}
                busy={busy === "generate"}
                disabled={busy !== null}
                onClick={generate}
            >
                {state.fileId === null ? <FilePlus2 size={14}/> : <RefreshCw size={14}/>}
            </IconAction>
            <IconAction
                tooltip={t("titlePage.upload")}
                busy={busy === "upload"}
                disabled={busy !== null}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={14}/>
            </IconAction>
            {state.fileId !== null && (
                <IconAction
                    tooltip={t("titlePage.remove")}
                    busy={busy === "remove"}
                    disabled={busy !== null}
                    onClick={remove}
                    danger
                >
                    <Trash2 size={14}/>
                </IconAction>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(file);
                }}
            />
        </div>
    );

    if (state.fileId === null) {
        return (
            <div className="flex items-center gap-2 rounded-[9px] border border-dashed border-[#d7dee8] px-3 py-[10px]">
                <FileText size={16} className="flex-none text-[#a3adbd]"/>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                        {t("titlePage.label")}
                    </span>
                    <span className="truncate text-[13px] text-[#8b97ab]">{t("titlePage.notCreated")}</span>
                </span>
                {actions}
            </div>
        );
    }

    const fileId = state.fileId;
    return (
        <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
                <DownloadRow
                    icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                    isDownloading={downloadingId === fileId}
                    onClick={() => onDownload(fileId, state.fileName)}
                    onView={isPreviewableFile(state.fileName) ? () => onPreview(fileId, state.fileName) : undefined}
                >
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            {t("titlePage.label")}
                        </span>
                        <span className="truncate text-[13px] text-[#26324a]">{state.fileName}</span>
                    </span>
                    {state.isManual && (
                        <span className="flex-none rounded-full bg-[#fff4e0] px-2 py-[3px] text-[10.5px] font-semibold text-[#a86b00]">
                            {t("titlePage.manualBadge")}
                        </span>
                    )}
                </DownloadRow>
            </div>
            {actions}
        </div>
    );
}

function titlePageState(r: VndRedactionResponse) {
    return {
        fileId: r.titlePageFileId ?? null,
        fileName: r.titlePageFileName ?? `${r.code}_Титульный_лист.docx`,
        isManual: r.titlePageIsManual ?? false,
    };
}

type TitlePageState = ReturnType<typeof titlePageState>;

/** Последний результат "Сформировать/Загрузить/Убрать" по редакции (redactionId -> состояние),
 * пока в props ещё приходит старый объект редакции (staleFileId). Без этого после
 * перемонтирования строка показывала прежний файл (или "не сформирован") до обновления
 * страницы, а просмотр прежнего файла давал 403: после пересоздания он больше не привязан к
 * редакции и доступен только тому, кто его сформировал (VndFileAccessAuthorizer). */
const titlePageOverrides = new Map<number, { staleFileId: number | null; state: TitlePageState }>();

function resolveTitlePageState(r: VndRedactionResponse): TitlePageState {
    const fromProps = titlePageState(r);
    const override = titlePageOverrides.get(r.id);
    if (!override) return fromProps;
    // В props всё ещё старые данные - показываем результат действия.
    if (fromProps.fileId === override.staleFileId && fromProps.fileId !== override.state.fileId) {
        return override.state;
    }
    // Props догнали (или файл сменили где-то ещё) - дальше верим серверу.
    titlePageOverrides.delete(r.id);
    return fromProps;
}

function IconAction({
                        children,
                        tooltip,
                        busy,
                        disabled,
                        danger = false,
                        onClick,
                    }: {
    children: React.ReactNode;
    tooltip: string;
    busy: boolean;
    disabled: boolean;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <Tooltip content={tooltip} side="top">
            <button
                type="button"
                disabled={disabled}
                onClick={onClick}
                aria-label={tooltip}
                className={`cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white p-[6px] disabled:cursor-not-allowed disabled:opacity-60 ${
                    danger ? "text-[#c2410c] hover:bg-[#fdecec]" : "text-[#4e57d6] hover:bg-[#ececfc]"
                }`}
            >
                {busy ? <Loader2 size={14} className="animate-spin"/> : children}
            </button>
        </Tooltip>
    );
}

function SectionLabel({children, className = ""}: {children: React.ReactNode; className?: string}) {
    return (
        <div className={`mb-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd] ${className}`}>
            {children}
        </div>
    );
}

function DownloadRow({
                         icon,
                         children,
                         isDownloading,
                         onClick,
                         onView,
                         viewTooltip,
                     }: {
    icon: React.ReactNode;
    children: React.ReactNode;
    isDownloading: boolean;
    onClick: () => void;
    onView?: () => void;
    /** Подсказка кнопки-глазика (см. onView) — по умолчанию для документов/ТИД/специальных
     * вложений, для обычных вложений вызывающая сторона передаёт более точный текст ("Просмотреть
     * вложение"). */
    viewTooltip?: string;
}) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();
    return (
        <div className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] pr-2 hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]">
            <button
                type="button"
                disabled={isDownloading || !canExportVnd}
                onClick={onClick}
                title={canExportVnd ? undefined : t("redactionDocumentsPanel.noExportHint")}
                className="cursor-pointer flex min-w-0 flex-1 items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#26324a] disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {icon}
                {children}
                {isDownloading ? (
                    <Loader2 size={14} className="ml-auto flex-none animate-spin text-[#8b97ab]"/>
                ) : (
                    <Download size={14} className="ml-auto flex-none text-[#8b97ab]"/>
                )}
            </button>

            {onView && (
                <Tooltip content={viewTooltip ?? t("redactionDocumentsPanel.viewDocument")} side="top">
                    <button
                        type="button"
                        onClick={onView}
                        className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white p-[6px] text-[#4e57d6] hover:bg-[#ececfc]"
                    >
                        <Eye size={14}/>
                    </button>
                </Tooltip>
            )}
        </div>
    );
}