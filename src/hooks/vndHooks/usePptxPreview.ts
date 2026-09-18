// Просмотр .pptx в браузере. У нас нет полноценного рендерера презентаций (положить сюда
// готовую библиотеку для точной отрисовки слайдов — значит притащить движок разметки/канвас
// уровня самого PowerPoint), поэтому показываем приближение: текст каждого слайда, вытащенный
// прямо из XML внутри pptx (тот же приём, что и в utils/docxWork - JSZip уже в зависимостях
// проекта именно для такого разбора OOXML). Картинки, таблицы, расположение и оформление
// текста при этом теряются - AttachmentDocxPreviewModal явно предупреждает об этом рядом с
// превью и всегда даёт кнопку "Скачать" для оригинала.
import {useEffect, useState} from "react";
import JSZip from "jszip";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

export interface PptxSlidePreview {
    index: number;
    paragraphs: string[];
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

const NS = {
    p: "http://schemas.openxmlformats.org/presentationml/2006/main",
    a: "http://schemas.openxmlformats.org/drawingml/2006/main",
    r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
};

function parseXml(text: string): Document {
    return new DOMParser().parseFromString(text, "application/xml");
}

/** Порядок слайдов задаётся списком <p:sldId> в presentation.xml (каждый - через r:id ссылается
 * на файл в presentation.xml.rels). Порядок файлов slideN.xml в самом архиве это НЕ гарантирует -
 * PowerPoint не обязан переименовывать файлы при перестановке слайдов местами. */
async function resolveSlideOrder(zip: JSZip): Promise<string[]> {
    const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
    const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")?.async("text");
    if (!presentationXml || !relsXml) return [];

    const relsDoc = parseXml(relsXml);
    const ridToTarget = new Map<string, string>();
    relsDoc.querySelectorAll("Relationship").forEach((rel) => {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        if (id && target) ridToTarget.set(id, target.replace(/^\.?\//, ""));
    });

    const presentationDoc = parseXml(presentationXml);
    const rIds = Array.from(presentationDoc.getElementsByTagNameNS(NS.p, "sldId"))
        .map((el) => el.getAttributeNS(NS.r, "id"))
        .filter((id): id is string => !!id);

    return rIds
        .map((id) => ridToTarget.get(id))
        .filter((target): target is string => !!target)
        .map((target) => (target.startsWith("slides/") ? `ppt/${target}` : target));
}

// Резервный путь, если presentation.xml почему-то не прочитать - берём все slideN.xml из
// архива и сортируем по номеру в имени файла (в подавляющем большинстве презентаций он и так
// совпадает с порядком показа).
function fallbackSlideOrder(zip: JSZip): string[] {
    return Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
            const na = Number(/(\d+)/.exec(a)?.[1] ?? 0);
            const nb = Number(/(\d+)/.exec(b)?.[1] ?? 0);
            return na - nb;
        });
}

function extractParagraphs(slideXml: string): string[] {
    const doc = parseXml(slideXml);
    const paragraphs: string[] = [];

    Array.from(doc.getElementsByTagNameNS(NS.a, "p")).forEach((p) => {
        const text = Array.from(p.getElementsByTagNameNS(NS.a, "t"))
            .map((t) => t.textContent ?? "")
            .join("");
        if (text.trim()) paragraphs.push(text);
    });

    return paragraphs;
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

                const zip = await JSZip.loadAsync(blob);
                if (cancelled) return;

                let slidePaths = await resolveSlideOrder(zip);
                if (slidePaths.length === 0) slidePaths = fallbackSlideOrder(zip);
                if (cancelled) return;

                if (slidePaths.length === 0) {
                    setError("Не удалось найти слайды в презентации");
                    return;
                }

                const result: PptxSlidePreview[] = [];
                for (let i = 0; i < slidePaths.length; i++) {
                    const xml = await zip.file(slidePaths[i])?.async("text");
                    if (cancelled) return;
                    if (xml) result.push({index: i + 1, paragraphs: extractParagraphs(xml)});
                }

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
