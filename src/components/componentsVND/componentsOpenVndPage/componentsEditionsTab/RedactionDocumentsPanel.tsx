// Компонента с карточкой панели для скачивания ВНД (Документы редакции) в RedactionColumn, RedactionSummaryCard
import React from "react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName, resolveVndDocTitle} from "@/utils/fileNaming.ts";
import type {RedactionLanguage, RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {Download, FileText, Loader2} from "lucide-react";

interface RedactionDocumentsPanelProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    /* Открыть просмотр документа этой редакции на указанном языке, либо ТИД (без сравнения). */
    /* Кнопка "Просмотр" показывается у языковых документов и у ТИД — не у вложений. */
    onView?: (target: RedactionViewTarget) => void;
}

const DOC_LABELS: {
    label: string;
    lang: RedactionLanguage;
    fileKey: "docFileRuId" | "docFileKgId" | "docFileEnId";
    updatedAtKey: "docRuUpdatedAt" | "docKgUpdatedAt" | "docEnUpdatedAt";
}[] = [
    {label: "Русский", lang: "ru", fileKey: "docFileRuId", updatedAtKey: "docRuUpdatedAt"},
    {label: "Кыргызча", lang: "kg", fileKey: "docFileKgId", updatedAtKey: "docKgUpdatedAt"},
    {label: "English", lang: "en", fileKey: "docFileEnId", updatedAtKey: "docEnUpdatedAt"},
];

export function RedactionDocumentsPanel({
                                            vnd,
                                            selected,
                                            downloadingId,
                                            onDownload,
                                            onView,
                                        }: RedactionDocumentsPanelProps) {
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
            key: d.label,
            fileId: selected[d.fileKey] as number,
            label: d.label,
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

    // Лист согласования формируется автоматически сервером (см. VndApprovalService.
    // FinalizeApprovalAsync) - имя файла тоже собираем отдельно, оригинальное имя сохранённого
    // на сервере вложения совпадает с этим шаблоном.
    const approvalSheetFileName = `${selected.code}_Лист_согласования.docx`;

    // Матрица разногласий - тоже "специальное" вложение без привязки к языку, появляется, если
    // инициатор при доработке был не полностью согласен с замечаниями (см. RemarksAgreement).
    const disagreementMatrixFileName = `${selected.code}_Матрица_разногласий.docx`;

    return (
        <div className="p-[20px]">
            <SectionLabel>Документы редакции</SectionLabel>
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
                                Обновлено, {formatDate(doc.updatedAt)}
                            </span>
                        )}
                    </DownloadRow>
                ))}
            </div>

            {selected.tidFileId !== null && (
                <>
                    <SectionLabel className="mt-5">ТИД</SectionLabel>
                    <div className="flex flex-col gap-2">
                        <DownloadRow
                            icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                            isDownloading={downloadingId === selected.tidFileId}
                            onClick={() => onDownload(selected.tidFileId as number, tidFileName)}
                            onView={onView ? () => onView("tid") : undefined}
                        >
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                    ТИД
                                </span>
                                <span className="truncate text-[13px] text-[#26324a]">
                                    Таблица изменений и дополнений
                                </span>
                            </span>
                        </DownloadRow>
                    </div>
                </>
            )}

            {(selected.approvalSheetFileId !== null || selected.disagreementMatrixFileId !== null) && (
                <>
                    <SectionLabel className="mt-5">Специальные вложения</SectionLabel>
                    <div className="flex flex-col gap-2">
                        {selected.approvalSheetFileId !== null && (
                            <DownloadRow
                                icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                                isDownloading={downloadingId === selected.approvalSheetFileId}
                                onClick={() => onDownload(selected.approvalSheetFileId as number, approvalSheetFileName)}
                                onView={onView ? () => onView("approvalSheet") : undefined}
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                        Лист согласования
                                    </span>
                                    <span className="truncate text-[13px] text-[#26324a]">
                                        {approvalSheetFileName}
                                    </span>
                                </span>
                            </DownloadRow>
                        )}
                        {selected.disagreementMatrixFileId !== null && (
                            <DownloadRow
                                icon={<FileText size={16} className="flex-none text-[#4e57d6]"/>}
                                isDownloading={downloadingId === selected.disagreementMatrixFileId}
                                onClick={() => onDownload(selected.disagreementMatrixFileId as number, disagreementMatrixFileName)}
                                onView={onView ? () => onView("disagreementMatrix") : undefined}
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                        Матрица разногласий
                                    </span>
                                    <span className="truncate text-[13px] text-[#26324a]">
                                        {disagreementMatrixFileName}
                                    </span>
                                </span>
                            </DownloadRow>
                        )}
                    </div>
                </>
            )}

            {selected.attachments.length > 0 && (
                <>
                    <SectionLabel className="mt-5">
                        Вложения ({selected.attachments.length})
                    </SectionLabel>
                    <div className="flex flex-col gap-2">
                        {selected.attachments.map((attachment) => (
                            <DownloadRow
                                key={attachment.fileId}
                                icon={<FileText size={16} className="text-[#8b97ab]"/>}
                                isDownloading={downloadingId === attachment.fileId}
                                onClick={() => onDownload(attachment.fileId, attachment.fileName)}
                            >
                                <span className="flex-1 truncate">{attachment.fileName}</span>
                            </DownloadRow>
                        ))}
                    </div>
                </>
            )}
        </div>
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
                     }: {
    icon: React.ReactNode;
    children: React.ReactNode;
    isDownloading: boolean;
    onClick: () => void;
    onView?: () => void;
}) {
    return (
        <div className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] pr-2 hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]">
            <button
                type="button"
                disabled={isDownloading}
                onClick={onClick}
                className="cursor-pointer flex min-w-0 flex-1 items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#26324a] disabled:opacity-60"
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
                <button
                    type="button"
                    onClick={onView}
                    className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                >
                    Просмотр
                </button>
            )}
        </div>
    );
}