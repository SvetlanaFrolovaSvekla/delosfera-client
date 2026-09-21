// Просмотр .pptx в браузере — каждый слайд рендерится в SVG через @office-kit/pptx-preview
// (MIT-лицензия, github.com/office-kit/pptx). В отличие от прежнего варианта (текст слайдов,
// вытащенный вручную из XML через JSZip) библиотека реально рисует картинки, таблицы, диаграммы
// и форматирование текста — точность рендера авторы сверяют в CI с LibreOffice как эталоном.
// Не поддерживаются: SmartArt, 3D-объекты, анимации, WMF и большая часть EMF-графики (см. их
// README) — поэтому AttachmentDocxPreviewModal всё равно предупреждает рядом с превью и всегда
// даёт кнопку "Скачать" для оригинала.
import {useEffect, useState} from "react";
import {loadPresentation, getSlides} from "@office-kit/pptx";
import {renderSlideToSvg} from "@office-kit/pptx-preview";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

export interface PptxSlidePreview {
    index: number;
    svg: string;
}

interface UsePptxPreviewResult {
    slides: PptxSlidePreview[];
    loading: boolean;
    error: string | null;
}

interface UsePptxPreviewOptions {
    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}. */
    endpoint?: string;
}

export function usePptxPreview(
    fileId: number | null,
    options: UsePptxPreviewOptions = {},
): UsePptxPreviewResult {
    const {endpoint} = options;
    const [slides, setSlides] = useState<PptxSlidePreview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            setSlides([]);
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);
            setSlides([]);

            try {
                const {blob} = await fetchFileBlob(fileId, undefined, controller.signal, endpoint);
                if (cancelled) return;

                // loadPresentation принимает Blob напрямую - без ручного чтения в ArrayBuffer
                const presentation = await loadPresentation(blob);
                if (cancelled) return;

                const pptxSlides = getSlides(presentation);
                if (pptxSlides.length === 0) {
                    setError("Не удалось найти слайды в презентации");
                    return;
                }

                // renderSlideToSvg синхронный - возвращает готовую строку разметки SVG
                // (по умолчанию текст внутри <foreignObject>, поэтому переносы и шрифты
                // считает сам браузер, а не самодельный алгоритм раскладки текста)
                const result: PptxSlidePreview[] = pptxSlides.map((slide, i) => ({
                    index: i + 1,
                    svg: renderSlideToSvg(presentation, slide),
                }));

                if (!cancelled) setSlides(result);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Ошибка загрузки презентации");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [fileId, endpoint]);

    return {slides, loading, error};
}
