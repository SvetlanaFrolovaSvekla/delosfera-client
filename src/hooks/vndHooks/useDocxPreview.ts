import React, {useEffect, useRef, useState} from "react";
import {renderAsync} from "docx-preview";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";
import {DOCX_PREVIEW_CLASS_NAME} from "@/constants/docxPreview.ts";

interface UseDocxPreviewResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    loading: boolean;
    error: string | null;
}

interface UseDocxPreviewOptions {
    /** По умолчанию true - контент подстраивается под ширину контейнера (страница A4
     * игнорируется). Передайте false, чтобы сохранить реальную ширину документа/таблиц
     * (например, для широких таблиц ТИД, которые должны скроллиться по горизонтали, а не
     * сжиматься). */
    ignoreWidth?: boolean;

    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}
     * (например, "help/files" для вложений статьи инструкции). */
    endpoint?: string;

    /** См. fetchFileBlob: хвост URL после {fileId}, если конечная точка не сам /{id}
     * (например, "/download" для вложений документа, см. DocumentsController). */
    pathSuffix?: string;
}

/**
 * ⚠ 06.10.2026: изолирует счётчики автонумерации Word внутри одного контейнера.
 *
 * docx-preview рисует номера списков ("1.", "1.1.") CSS-счётчиками, а сбрасывает их правилом
 * `:root { counter-reset: ... }` — то есть счётчики ОБЩИЕ на всю страницу. Если на странице
 * отрендерено больше одного документа (вкладка "Редакции" под модалкой "Масштабный просмотр" /
 * "Сравнение редакций", две колонки сравнения), нумерация второго документа продолжала
 * первую: редакция с двумя разделами под модалкой → в модалке та же редакция начиналась с
 * "3. ОБЩИЕ ПОЛОЖЕНИЯ", "3.1." и т.д. Плюс у двух документов правило `:root` одно на двоих,
 * и стартовые значения брались из того, что отрендерен последним.
 *
 * counter-reset на самом контейнере создаёт для его потомков собственные экземпляры этих
 * счётчиков (CSS counters scoping) — нумерация считается строго внутри документа.
 */
function scopeNumberingCounters(container: HTMLElement): void {
    const resets: string[] = [];
    for (const styleEl of Array.from(container.querySelectorAll("style"))) {
        const css = styleEl.textContent ?? "";
        const re = /:root\s*\{[^}]*?counter-reset\s*:\s*([^;}]+)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(css)) !== null) resets.push(m[1].trim());
    }
    container.style.counterReset = resets.join(" ");
}

export function useDocxPreview(
    fileId: number | null,
    options: UseDocxPreviewOptions = {},
): UseDocxPreviewResult {
    const {ignoreWidth = true, endpoint, pathSuffix} = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            if (containerRef.current) containerRef.current.innerHTML = "";
            return;
        }

        let cancelled = false;
        // ⚠ 08.09.2026 (документ 7031, ERR_FAILED в консоли): StrictMode в dev монтирует эффект
        // дважды (mount → cleanup → remount) — без AbortController старый fetch оставался висеть
        // в фоне (флаг cancelled его не останавливает, это всего лишь отметка "не применяй
        // результат"), и браузер обрывал его как проигравший гонку за то же URL — то самое
        // "net::ERR_FAILED 200 (OK)". В проде эффект не дублируется, но то же самое реально
        // происходит при быстром переключении редакции/языка — обрываем явно.
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const {blob} = await fetchFileBlob(fileId, undefined, controller.signal, endpoint, pathSuffix);

                if (cancelled || !containerRef.current) return;

                // Очищаем контейнер перед новым рендером (переключение редакции/языка)
                containerRef.current.innerHTML = "";
                containerRef.current.style.counterReset = "";

                await renderAsync(blob, containerRef.current, undefined, {
                    className: DOCX_PREVIEW_CLASS_NAME,
                    inWrapper: false,
                    ignoreWidth,   // true — не навязываем ширину страницы A4, подстраиваемся под контейнер
                    ignoreHeight: true,
                    breakPages: false,   // не рвём на "страницы" внутри веб-панели
                    ignoreLastRenderedPageBreak: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    experimental: true,
                });
                if (!cancelled && containerRef.current) scopeNumberingCounters(containerRef.current);
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
                setError(err instanceof Error ? err.message : "Ошибка загрузки документа");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [fileId, ignoreWidth, endpoint, pathSuffix]);

    return {containerRef, loading, error};
}