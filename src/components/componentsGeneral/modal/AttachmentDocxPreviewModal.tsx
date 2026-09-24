// Модалка "Просмотр документа" для произвольного вложения ВНД - .docx рендерится через
// docx-preview (useDocxPreview) почти как в Word, .xlsx через SheetJS как обычная HTML-таблица,
// .pptx - слайд в слайд через @office-kit/pptx-preview (см. usePptxPreview) в виде SVG.
// .pdf - постранично в <canvas> через pdf.js (см. usePdfPreview), страницы рисуются лениво по
// мере прокрутки.
// Имя компонента осталось от тех времён, когда он умел только docx - сейчас показывает все четыре формата
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {useSheetPreview} from "@/hooks/vndHooks/useSheetPreview.ts";
import {usePptxPreview} from "@/hooks/vndHooks/usePptxPreview.ts";
import {usePdfPreview} from "@/hooks/vndHooks/usePdfPreview.ts";
import {getPreviewableFileKind} from "@/utils/downloadFiles/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {AlertTriangle, Download, FileSpreadsheet, FileText, Loader2, Presentation, X} from "lucide-react";

interface AttachmentDocxPreviewModalProps {
    fileId: number;
    fileName: string;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;

    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}
     * (например, "documents/attachments" для вложений СЗ/закупок, см. DocumentsController). */
    endpoint?: string;

    /** См. fetchFileBlob: хвост URL после {fileId}, если конечная точка не сам /{id}
     * (например, "/download" для вложений документа, см. DocumentsController). */
    pathSuffix?: string;
}

const KIND_ICON = {
    docx: FileText,
    xlsx: FileSpreadsheet,
    pptx: Presentation,
    pdf: FileText,
};

export function AttachmentDocxPreviewModal({
                                               fileId, fileName, downloadingId, onDownload, onClose,
                                               endpoint, pathSuffix,
                                           }: AttachmentDocxPreviewModalProps) {
    const {t} = useTranslation();

    // У .xlsx и .pptx принципиально разная неполнота превью, поэтому и предупреждения разные,
    // а не одна общая фраза на оба формата.
    // Вынесено внутрь компонента (а не top-level, как раньше), поскольку t() доступен только
    // из useTranslation внутри компонента.
    const ACCURACY_WARNING = {
        // Упрощённый предпросмотр таблицы: форматирование, формулы и объединённые ячейки не воспроизводятся.
        xlsx: t("attachmentPreview.warningXlsx"),
        // Картинки, таблицы, диаграммы и текст теперь рендерятся по-настоящему (см. usePptxPreview) -
        // не воспроизводятся только SmartArt, 3D-объекты, анимации и часть векторной графики (WMF/EMF).
        // Приближённый рендер слайдов: SmartArt, 3D-объекты, анимации и часть эффектов оформления не воспроизводятся.
        pptx: t("attachmentPreview.warningPptx"),
        // Сами страницы pdf.js рисует точно, но только "картинкой": интерактивные элементы PDF
        // (заполняемые поля, проверка электронной подписи, вложенные файлы, закладки) здесь не работают.
        // Предпросмотр PDF без интерактивных элементов: заполняемые поля, проверка электронной подписи, вложенные в PDF файлы и закладки недоступны.
        pdf: t("attachmentPreview.warningPdf"),
    };

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
    } = useDocxPreview(kind === "docx" ? fileId : null, {endpoint, pathSuffix});

    const {
        containerRef: sheetContainerRef,
        loading: sheetLoading,
        error: sheetError,
    } = useSheetPreview(kind === "xlsx" ? fileId : null, {endpoint, pathSuffix});

    const {
        slides: pptxSlides,
        loading: pptxLoading,
        totalSlides: pptxTotalSlides,
        error: pptxError,
    } = usePptxPreview(kind === "pptx" ? fileId : null, {endpoint, pathSuffix});

    const {
        containerRef: pdfContainerRef,
        loading: pdfLoading,
        error: pdfError,
        pageCount: pdfPageCount,
    } = usePdfPreview(kind === "pdf" ? fileId : null, {endpoint, pathSuffix});

    const loading = {docx: docxLoading, xlsx: sheetLoading, pptx: pptxLoading, pdf: pdfLoading}[kind];
    const error = {docx: docxError, xlsx: sheetError, pptx: pptxError, pdf: pdfError}[kind];

    // .pptx после разбора файла дорисовывает слайды по одному (см. usePptxPreview) - "loading"
    // здесь перестаёт быть true, как только известно число слайдов, но сами они ещё могут
    // дорендериваться. Отдельный флаг - чтобы показать под уже готовыми слайдами компактную
    // строку прогресса, а не гнать пользователя обратно в полноэкранный спиннер.
    const pptxStillRendering = kind === "pptx" && !loading && !error && pptxSlides.length < pptxTotalSlides;

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
                                {/* Просмотр вложения */}
                                {t("attachmentPreview.title")}
                                {kind === "pdf" && pdfPageCount > 0 && (
                                    <>
                                        {" · "}
                                        {/* страниц: ${pdfPageCount} */}
                                        {t("attachmentPreview.pageCount", {count: pdfPageCount})}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Скачать документ */}
                        <Tooltip content={t("attachmentPreview.download")} side="bottom">
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
                        <span>
                            {accuracyWarning}{" "}
                            {/* Если нужен точный вид документа — скачайте файл кнопкой выше. */}
                            {t("attachmentPreview.downloadForAccuracy")}
                        </span>
                    </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4">
                    {loading && (
                        <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[#8b97ab]">
                            <Loader2 size={16} className="animate-spin"/>
                            {/* Загрузка документа… */}
                            {t("attachmentPreview.loading")}
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

                    {/* В отличие от docx/xlsx контейнер PDF не прячем через "hidden" на время
                        загрузки: usePdfPreview по его ширине сразу размечает страницы под нужный
                        масштаб, а у скрытого элемента ширина 0. Пока он пустой, места не занимает. */}
                    {kind === "pdf" && (
                        <div ref={pdfContainerRef} className={error ? "hidden" : ""}/>
                    )}

                    {kind === "pptx" && !loading && !error && (
                        <div className="flex flex-col gap-4">
                            {pptxSlides.map((slide) => (
                                <div
                                    key={slide.index}
                                    className="overflow-hidden rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe]"
                                >
                                    <div className="border-b border-[#e9edf3] bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                        {/* Слайд {slide.index} */}
                                        {t("attachmentPreview.slideLabel", {index: slide.index})}
                                    </div>
                                    {slide.svg !== null ? (
                                        // svg приходит уже готовой строкой разметки от renderSlideToSvg
                                        // (@office-kit/pptx-preview) - вставляем как есть, без парсинга
                                        <div
                                            className="p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                                            dangerouslySetInnerHTML={{__html: slide.svg}}
                                        />
                                    ) : (
                                        // renderSlideToSvg упал именно на этом слайде (см. usePptxPreview) -
                                        // остальные слайды это не должно касаться, показываем заглушку
                                        // только тут.
                                        <div className="p-6 text-center text-[12px] text-[#8b97ab]">
                                            {/* Не удалось отобразить этот слайд */}
                                            {t("attachmentPreview.slideRenderFailed")}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Пока остальные слайды ещё дорендериваются (см. usePptxPreview -
                                рендер идёт по одному с отдачей браузеру, а не всей пачкой разом),
                                показываем компактный прогресс под уже готовыми слайдами - вместо
                                того, чтобы держать пользователя перед полноэкранным спиннером до
                                самого конца. */}
                            {pptxStillRendering && (
                                <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-[#8b97ab]">
                                    <Loader2 size={14} className="animate-spin"/>
                                    {/* Рендерим слайд {pptxSlides.length + 1} из {pptxTotalSlides}… */}
                                    {t("attachmentPreview.slideRendering", {
                                        current: pptxSlides.length + 1,
                                        total: pptxTotalSlides,
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}