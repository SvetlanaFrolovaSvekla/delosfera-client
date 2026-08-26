// Компонента с карточкой панели для скачивания ВНД (Документы редакции) в RedactionColumn, RedactionSummaryCard
import React from "react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName, resolveVndDocTitle} from "@/utils/fileNaming.ts";
import type {RedactionLanguage} from "@/utils/redactionLanguagePanelUtils.ts";
import {Download, FileText, Loader2} from "lucide-react";

interface RedactionDocumentsPanelProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    /* Открыть просмотр документа этой редакции на указанном языке (без сравнения). */
    /* Кнопка "Просмотр" показывается только у языковых документов — не у ТИД и вложений. */
    onView?: (language: RedactionLanguage) => void;
}

const DOC_LABELS: {label: string; lang: RedactionLanguage; fileKey: "docFileRuId" | "docFileKgId" | "docFileEnId"}[] = [
    {label: "Русский", lang: "ru", fileKey: "docFileRuId"},
    {label: "Кыргызча", lang: "kg", fileKey: "docFileKgId"},
    {label: "English", lang: "en", fileKey: "docFileEnId"},
];

export function RedactionDocumentsPanel({
                                            vnd,
                                            selected,
                                            downloadingId,
                                            onDownload,
                                            onView,
                                        }: RedactionDocumentsPanelProps) {
    const documents = DOC_LABELS
        .filter((d) => selected[d.fileKey] !== null)
        .map((d) => ({
            key: d.label,
            fileId: selected[d.fileKey] as number,
            label: d.label,
            lang: d.lang,
            fileName: buildRedactionFileName(selected.code, vnd.name, d.lang),
            displayTitle: resolveVndDocTitle(vnd, d.lang),
        }));

    // ТИД не привязан к языку - один файл на редакцию. Имя файла собираем отдельно,
    // не через buildRedactionFileName (та функция заточена под языковые варианты документа).
    const tidFileName = `${selected.code}_ТИД.docx`;

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

            {selected.attachmentFileIds.length > 0 && (
                <>
                    <SectionLabel className="mt-5">
                        Вложения ({selected.attachmentFileIds.length})
                    </SectionLabel>
                    <div className="flex flex-col gap-2">
                        {selected.attachmentFileIds.map((fid) => (
                            <DownloadRow
                                key={fid}
                                icon={<FileText size={16} className="text-[#8b97ab]"/>}
                                isDownloading={downloadingId === fid}
                                onClick={() => onDownload(fid, `Вложение_${fid}`)}
                            >
                                <span className="flex-1">Вложение #{fid}</span>
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