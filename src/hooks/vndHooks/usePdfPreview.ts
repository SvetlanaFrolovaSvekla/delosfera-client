// Просмотр .pdf в браузере через pdf.js (pdfjs-dist, Apache-2.0, Mozilla - тот же движок, что
// встроен в Firefox). Вся работа - на клиенте, сервер лишь отдаёт файл как обычно
// (fetchFileBlob), никакой конвертации/рендера на бэке.
//
// Почему не <iframe src=blob:...> со встроенным просмотрщиком браузера: он бывает отключён
// групповыми политиками (Edge/Chrome "AlwaysOpenPdfExternally"), выглядит по-разному в разных
// браузерах и исполняет JavaScript/формы внутри PDF. pdf.js рисует страницы в <canvas> сам,
// одинаково везде, и скрипты из документа не выполняет.
//
// Что сделано, чтобы не грузить ни сеть, ни браузер:
//  - pdfjs-dist подгружается динамическим import() (как exceljs в useSheetPreview.ts и
//    @office-kit/pptx в usePptxPreview.ts) - ~490 КБ (≈150 КБ gzip) попадают в отдельный чанк, который
//    скачивается только при первом открытии PDF и дальше берётся из кеша;
//  - разбор файла идёт в Web Worker (pdf.worker.min.mjs, отдельный файл сборки) - основной
//    поток и интерфейс не подвисают даже на тяжёлых документах;
//  - страницы рендерятся лениво: пока страница далеко от видимой области, на её месте пустая
//    заглушка нужного размера, canvas создаётся, только когда страница подъезжает к экрану
//    (IntersectionObserver), и освобождается, когда уезжает далеко - память не растёт с числом
//    страниц, 300-страничный документ открывается так же быстро, как 3-страничный;
//  - плотность пикселей ограничена (MAX_PIXEL_RATIO, MAX_CANVAS_PIXELS) - на 4K-экранах не
//    создаются гигантские canvas.
//
// Декодеры сканов (JBIG2/JPEG 2000, wasm) и ICC-профили раздаются как статика сборки - см.
// pdfjsAssetsPlugin в vite.config.ts (папка assets/pdfjs-<версия>/). Стандартные шрифты и CMap
// (нужны только для документов с НЕвстроенными шрифтами/иероглифами) не раздаём - для таких
// шрифтов pdf.js берёт системные (useSystemFonts по умолчанию), на Windows это Arial/Times.
//
// Берём именно legacy-сборку pdfjs-dist (legacy/build/...): обычная сборка v6 рассчитана на
// самые свежие браузеры и использует Map.prototype.getOrInsertComputed и т.п. - в Chrome/Edge
// даже 2025 года страницы падают с "getOrInsertComputed is not a function" (проверено). Legacy -
// тот же код с полифилами, лицензия та же, весит на ~10% больше.
import React, {useEffect, useRef, useState} from "react";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type {PDFDocumentProxy, PDFPageProxy, RenderTask} from "pdfjs-dist";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

interface UsePdfPreviewOptions {
    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}. */
    endpoint?: string;
    /** См. fetchFileBlob: хвост URL после {fileId}. */
    pathSuffix?: string;
}

interface UsePdfPreviewResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    loading: boolean;
    error: string | null;
    pageCount: number;
}

/** Выше 2 разница на глаз не видна, а память canvas растёт квадратично. */
const MAX_PIXEL_RATIO = 2;
/** Предел площади одного canvas (≈ 16 Мп) - и браузеры сами ограничивают размер canvas, и
 * памяти так уходит не больше ~64 МБ на страницу даже для чертежа формата A0. */
const MAX_CANVAS_PIXELS = 16_000_000;
/** Насколько заранее (в пикселях до края видимой области) начинать рисовать страницу -
 * чтобы при обычной прокрутке она успевала появиться до того, как попадёт в кадр. */
const PRERENDER_MARGIN = "1200px 0px";
/** Отступ между страницами и максимальная ширина страницы на экране. */
const PAGE_GAP_PX = 16;
const MAX_PAGE_WIDTH_PX = 920;

export function usePdfPreview(
    fileId: number | null,
    options: UsePdfPreviewOptions = {},
): UsePdfPreviewResult {
    const {endpoint, pathSuffix} = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            setPageCount(0);
            if (container) container.innerHTML = "";
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        let pdfDoc: PDFDocumentProxy | null = null;
        let destroyLoadingTask: (() => Promise<void>) | null = null;
        let observer: IntersectionObserver | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let resizeTimer: number | undefined;

        interface PageSlot {
            pageNumber: number;
            wrapper: HTMLDivElement;
            /** Размер страницы в PDF-единицах при scale = 1 (с учётом поворота). */
            baseWidth: number;
            baseHeight: number;
            page: PDFPageProxy | null;
            canvas: HTMLCanvasElement | null;
            renderTask: RenderTask | null;
            /** Ширина контейнера, под которую нарисован текущий canvas - при изменении ширины
             * окна страницы, оставшиеся в кадре, перерисовываются. */
            renderedForWidth: number;
            visible: boolean;
        }

        const slots: PageSlot[] = [];

        const availableWidth = () => {
            const w = container?.clientWidth ?? 0;
            return Math.max(200, Math.min(w, MAX_PAGE_WIDTH_PX));
        };

        const layoutSlot = (slot: PageSlot) => {
            const cssWidth = availableWidth();
            const cssHeight = Math.round((cssWidth * slot.baseHeight) / slot.baseWidth);
            slot.wrapper.style.width = `${cssWidth}px`;
            slot.wrapper.style.height = `${cssHeight}px`;
        };

        const releaseSlot = (slot: PageSlot) => {
            slot.renderTask?.cancel();
            slot.renderTask = null;
            if (slot.canvas) {
                // Обнуление размеров сразу отдаёт память canvas браузеру, не дожидаясь GC.
                slot.canvas.width = 0;
                slot.canvas.height = 0;
                slot.canvas.remove();
                slot.canvas = null;
            }
            // Сама страница держит разобранные шрифты/картинки в воркере - освобождаем и их.
            slot.page?.cleanup();
            slot.renderedForWidth = 0;
        };

        const renderSlot = async (slot: PageSlot) => {
            if (cancelled || !pdfDoc) return;
            const cssWidth = availableWidth();
            if (slot.canvas && slot.renderedForWidth === cssWidth) return;

            slot.renderTask?.cancel();

            try {
                slot.page ??= await pdfDoc.getPage(slot.pageNumber);
                if (cancelled || !slot.visible) return;

                const page = slot.page;
                const scale = cssWidth / slot.baseWidth;
                const viewport = page.getViewport({scale});

                let ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
                const pixels = viewport.width * viewport.height * ratio * ratio;
                if (pixels > MAX_CANVAS_PIXELS) ratio *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

                const canvas = document.createElement("canvas");
                canvas.width = Math.floor(viewport.width * ratio);
                canvas.height = Math.floor(viewport.height * ratio);
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.style.display = "block";

                const task = page.render({
                    canvas,
                    viewport,
                    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
                });
                slot.renderTask = task;
                await task.promise;
                if (cancelled || slot.renderTask !== task) return;

                // Подменяем canvas только после того, как новый полностью нарисован - при
                // перерисовке по ресайзу страница не "мигает" белым.
                if (slot.canvas) {
                    slot.canvas.width = 0;
                    slot.canvas.height = 0;
                    slot.canvas.remove();
                }
                slot.canvas = canvas;
                slot.renderTask = null;
                slot.renderedForWidth = cssWidth;
                slot.wrapper.appendChild(canvas);
            } catch (err) {
                // Отмена рендера (страница уехала из кадра / ресайз) - штатная ситуация.
                if (err instanceof Error && err.name === "RenderingCancelledException") return;
                if (cancelled) return;
                console.warn(`PDF: не удалось отрисовать страницу ${slot.pageNumber}`, err);
                // Один битый лист не должен ронять показ всего документа - как и в
                // usePptxPreview, показываем заглушку только на его месте.
                slot.wrapper.dataset.failed = "true";
                slot.wrapper.textContent = "Не удалось отобразить эту страницу";
            }
        };

        const load = async () => {
            setLoading(true);
            setError(null);
            setPageCount(0);
            if (container) container.innerHTML = "";

            try {
                const [{blob}, pdfjs] = await Promise.all([
                    fetchFileBlob(fileId, undefined, controller.signal, endpoint, pathSuffix),
                    import("pdfjs-dist/legacy/build/pdf.mjs"),
                ]);
                if (cancelled) return;

                pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
                const assetsBase = `${import.meta.env.BASE_URL}assets/pdfjs-${pdfjs.version}/`;

                const loadingTask = pdfjs.getDocument({
                    data: new Uint8Array(await blob.arrayBuffer()),
                    wasmUrl: `${assetsBase}wasm/`,
                    iccUrl: `${assetsBase}iccs/`,
                    // Формы XFA (динамические формы Adobe LiveCycle) - редкость, а их разметка
                    // тяжёлая; обычные AcroForm-поля и так видны на canvas.
                    enableXfa: false,
                });
                destroyLoadingTask = () => loadingTask.destroy();

                const doc = await loadingTask.promise;
                pdfDoc = doc;
                if (cancelled || !container) return;

                // Размер первой страницы - как заглушка для остальных, пока их реальный
                // размер не известен: getPage() на все страницы сразу заставил бы воркер
                // разобрать весь документ до показа первой. Реальный размер каждой страницы
                // уточняется, когда она подъезжает к экрану (см. renderSlot/observer).
                const first = await doc.getPage(1);
                if (cancelled) return;
                const firstViewport = first.getViewport({scale: 1});

                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.alignItems = "center";
                container.style.gap = `${PAGE_GAP_PX}px`;

                for (let i = 1; i <= doc.numPages; i++) {
                    const wrapper = document.createElement("div");
                    wrapper.className =
                        "relative flex-none overflow-hidden rounded-[6px] border border-[#e3e8f0] bg-white " +
                        "shadow-[0_1px_3px_rgba(28,39,64,0.08)] data-[failed=true]:grid " +
                        "data-[failed=true]:place-items-center data-[failed=true]:text-[12px] " +
                        "data-[failed=true]:text-[#8b97ab]";
                    wrapper.dataset.page = String(i);
                    wrapper.setAttribute("aria-label", `Страница ${i}`);

                    const slot: PageSlot = {
                        pageNumber: i,
                        wrapper,
                        baseWidth: firstViewport.width,
                        baseHeight: firstViewport.height,
                        page: i === 1 ? first : null,
                        canvas: null,
                        renderTask: null,
                        renderedForWidth: 0,
                        visible: false,
                    };
                    slots.push(slot);
                    layoutSlot(slot);
                    container.appendChild(wrapper);
                }

                setPageCount(doc.numPages);
                setLoading(false);

                // Ищем прокручиваемого предка (тело модалки), чтобы "заранее" считалось от его
                // видимой области, а не от окна целиком.
                let scrollRoot: HTMLElement | null = container.parentElement;
                while (scrollRoot && !/(auto|scroll)/.test(getComputedStyle(scrollRoot).overflowY)) {
                    scrollRoot = scrollRoot.parentElement;
                }

                observer = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                        const slot = slots[Number((entry.target as HTMLElement).dataset.page) - 1];
                        if (!slot) continue;
                        slot.visible = entry.isIntersecting;
                        if (entry.isIntersecting) {
                            void (async () => {
                                // Уточняем реальный размер страницы (альбомные листы среди
                                // книжных и т.п.) до рендера.
                                if (!slot.page) {
                                    try {
                                        slot.page = await doc.getPage(slot.pageNumber);
                                    } catch {
                                        /* ошибку покажет renderSlot */
                                    }
                                }
                                if (slot.page) {
                                    const vp = slot.page.getViewport({scale: 1});
                                    if (vp.width !== slot.baseWidth || vp.height !== slot.baseHeight) {
                                        slot.baseWidth = vp.width;
                                        slot.baseHeight = vp.height;
                                        layoutSlot(slot);
                                    }
                                }
                                if (slot.visible) await renderSlot(slot);
                            })();
                        } else {
                            releaseSlot(slot);
                        }
                    }
                }, {root: scrollRoot, rootMargin: PRERENDER_MARGIN});

                slots.forEach((s) => observer!.observe(s.wrapper));

                // Изменилась ширина модалки/окна - пересчитываем размеры заглушек и
                // перерисовываем только страницы, которые сейчас рядом с экраном.
                let lastWidth = availableWidth();
                resizeObserver = new ResizeObserver(() => {
                    window.clearTimeout(resizeTimer);
                    resizeTimer = window.setTimeout(() => {
                        const w = availableWidth();
                        if (w === lastWidth || cancelled) return;
                        lastWidth = w;
                        slots.forEach((s) => {
                            layoutSlot(s);
                            if (s.visible) void renderSlot(s);
                        });
                    }, 150);
                });
                resizeObserver.observe(container);
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
                const name = err instanceof Error ? err.name : "";
                setError(
                    name === "PasswordException"
                        ? "Документ защищён паролем — предпросмотр недоступен, скачайте файл"
                        : name === "InvalidPDFException"
                            ? "Файл повреждён или не является PDF-документом"
                            : err instanceof Error ? err.message : "Ошибка загрузки документа",
                );
                setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            controller.abort();
            window.clearTimeout(resizeTimer);
            observer?.disconnect();
            resizeObserver?.disconnect();
            slots.forEach(releaseSlot);
            // destroy() останавливает воркер и освобождает всю память документа.
            void destroyLoadingTask?.();
            if (container) container.innerHTML = "";
        };
    }, [fileId, endpoint, pathSuffix]);

    return {containerRef, loading, error, pageCount};
}
