// Модалка "Просмотр документа" для произвольного вложения ВНД - .docx рендерится через
// docx-preview (useDocxPreview) почти как в Word, .xlsx через SheetJS как обычная HTML-таблица,
// .pptx - как текст слайдов (у нас нет полноценного рендерера презентаций, см. usePptxPreview).
// Имя компонента осталось от тех времён, когда он умел только docx - сейчас показывает все три
// формата (см. getPreviewableFileKind в utils/fileNaming.ts).
import {createPortal} from "react-dom";
import {AlertTriangle, Download, FileSpreadsheet, FileText, Loader2, Presentation, X} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {useSheetPreview} from "@/hooks/vndHooks/useSheetPreview.ts";
import {usePptxPreview} from "@/hooks/vndHooks/usePptxPreview.ts";
import {getPreviewableFileKind} from "@/utils/downloadFiles/fileNaming.ts";

interface AttachmentDocxPreviewModalProps {
    fileId: number;
    fileName: string;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

const KIND_ICON = {
    docx: FileText,
    xlsx: FileSpreadsheet,
    pptx: Presentation,
};

// У .xlsx и .pptx принципиально разная неполнота превью (таблица без стилей/формул - это не
// то же самое, что "только текст без единой картинки"), поэтому и предупреждения разные, а не
// одна общая фраза на оба формата.
const ACCURACY_WARNING = {
    xlsx: "Упрощённый предпросмотр таблицы: форматирование, формулы и объединённые ячейки не воспроизводятся.",
    pptx: "Показан только текст слайдов: изображения, диаграммы, оформление и расположение элементов не воспроизводятся.",
};

export function AttachmentDocxPreviewModal({
                                                fileId, fileName, downloadingId, onDownload, onClose,
                                            }: AttachmentDocxPreviewModalProps) {
    // Модалку открывают только по кнопке "Просмотр" у уже отфильтрованных isPreviewableFile
    // вложений (см. AttachmentRow/RedactionAttachmentsModal/VndEditLastRevisionModal) - но на
    // случай рассинхронизации (файл переименовали, кэш и т.п.) без распознанного вида честно
    // показываем "предпросмотр недоступен" вместо падения на пустом containerRef.
    const kind = getPreviewableFileKind(fileName) ?? "docx";
    const HeaderIcon = KIND_ICON[kind];

    const {
        containerRef: docxContainerRef,
        loading: docxLoading,
        error: docxError,
    } = useDocxPreview(kind === "docx" ? fileId : null);

    const {
        containerRef: sheetContainerRef,
        loading: sheetLoading,
        error: sheetError,
    } = useSheetPreview(kind === "xlsx" ? fileId : null);

    const {
        slides: pptxSlides,
        loading: pptxLoading,
        error: pptxError,
    } = usePptxPreview(kind === "pptx" ? fileId : null);

    const loading = kind === "docx" ? docxLoading : kind === "xlsx" ? sheetLoading : pptxLoading;
    const error = kind === "docx" ? docxError : kind === "xlsx" ? sheetError : pptxError;

    // .docx рендерится через docx-preview довольно близко к оригиналу - предупреждение там
    // не нужно. .xlsx/.pptx - приближённые превью, поэтому здесь явно просим не считать их
    // оригиналом (см. ACCURACY_WARNING выше).
    const accuracyWarning = kind !== "docx" ? ACCURACY_WARNING[kind] : null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <HeaderIcon size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {fileName}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                Просмотр вложения
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Tooltip content="Скачать документ" side="bottom">
                            <button
                                type="button"
                                disabled={downloadingId === fileId}
                                onClick={() => onDownload(fileId, fileName)}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === fileId ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Download size={16}/>
                                )}
                            </button>
                        </Tooltip>

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {accuracyWarning && !loading && !error && (
                    <div className="flex flex-none items-start gap-2 border-b border-[#f5e3c4] bg-[#fffaf0] px-6 py-2.5 text-[12px] text-[#8a6116]">
                        <AlertTriangle size={15} className="mt-[1px] flex-none"/>
                        <span>{accuracyWarning} Если нужен точный вид документа — скачайте файл кнопкой выше.</span>
                    </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4">
                    {loading && (
                        <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[#8b97ab]">
                            <Loader2 size={16} className="animate-spin"/>
                            Загрузка документа…
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-1 items-center justify-center text-[13px] text-[#c0392b]">
                            {error}
                        </div>
                    )}

                    {kind === "docx" && (
                        <div ref={docxContainerRef} className={loading || error ? "hidden" : ""}/>
                    )}

                    {kind === "xlsx" && (
                        <div ref={sheetContainerRef} className={loading || error ? "hidden" : ""}/>
                    )}

                    {kind === "pptx" && !loading && !error && (
                        <div className="flex flex-col gap-3">
                            {pptxSlides.map((slide) => (
                                <div
                                    key={slide.index}
                                    className="rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-4"
                                >
                                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                        Слайд {slide.index}
                                    </div>
                                    {slide.paragraphs.length > 0 ? (
                                        <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-[#3c4356]">
                                            {slide.paragraphs.map((line, i) => (
                                                <div key={i}>{line}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[12.5px] italic text-[#a3adbd]">
                                            Текста на слайде нет (изображение, диаграмма или пустой макет)
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
