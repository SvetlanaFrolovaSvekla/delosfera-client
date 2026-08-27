import {useEffect, useState} from "react";
import {fetchFileBlob} from "@/utils/downloadFile.ts";
import {extractDocxHeadings, type DocxHeadingItem} from "@/utils/docxHeadings.ts";

interface UseDocxHeadingsResult {
    headings: DocxHeadingItem[];
    loading: boolean;
    error: string | null;
}

/** Заголовки редакции для панели "Содержание" (RedactionContentsPanel) — строятся из настоящих
 * стилей Word (Заголовок 1/2/3...), а не из оглавления в начале документа: в редакциях ВНД
 * такого оглавления нет и не предполагается, содержание собирается по факту оформления текста
 * (см. utils/docxHeadings.ts). Файл разбирается отдельным проходом (JSZip), независимо от
 * рендера docx-preview в useDocxPreview — оба хука читают один и тот же fileId параллельно. */
export function useDocxHeadings(fileId: number | null): UseDocxHeadingsResult {
    const [headings, setHeadings] = useState<DocxHeadingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHeadings([]);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const {blob} = await fetchFileBlob(fileId);
                if (cancelled) return;
                const result = await extractDocxHeadings(blob);
                if (cancelled) return;
                setHeadings(result);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Не удалось разобрать содержание документа");
                setHeadings([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [fileId]);

    return {headings, loading, error};
}
