import React, {useEffect, useRef, useState} from "react";
import {renderAsync} from "docx-preview";
import {fetchFileBlob} from "@/utils/downloadFile.ts";
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
}

export function useDocxPreview(
    fileId: number | null,
    options: UseDocxPreviewOptions = {},
): UseDocxPreviewResult {
    const {ignoreWidth = true} = options;
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

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const {blob} = await fetchFileBlob(fileId);

                if (cancelled || !containerRef.current) return;

                // Очищаем контейнер перед новым рендером (переключение редакции/языка)
                containerRef.current.innerHTML = "";

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
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Ошибка загрузки документа");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [fileId, ignoreWidth]);

    return {containerRef, loading, error};
}