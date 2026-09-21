// Просмотр .pptx в браузере — каждый слайд рендерится в SVG через @office-kit/pptx-preview
// (MIT-лицензия, github.com/office-kit/pptx). В отличие от прежнего варианта (текст слайдов,
// вытащенный вручную из XML через JSZip) библиотека реально рисует картинки, таблицы, диаграммы
// и форматирование текста — точность рендера авторы сверяют в CI с LibreOffice как эталоном.
// Не поддерживаются: SmartArt, 3D-объекты, анимации, WMF и большая часть EMF-графики (см. их
// README) — поэтому AttachmentDocxPreviewModal всё равно предупреждает рядом с превью и всегда
// даёт кнопку "Скачать" для оригинала.
//
// @office-kit/pptx и @office-kit/pptx-preview подгружаются динамическим import() — как exceljs в
// useSheetPreview.ts — вместе они весят ~1 МБ до минификации, и до открытия .pptx-превью это не
// должно попадать ни в основной бандл, ни в чанк страницы ВНД.
//
// 21.09.2026: слайды рендерятся по одному с "отдачей" браузеру между ними (см. yieldToBrowser) —
// раньше renderSlideToSvg для ВСЕХ слайдов считался одним .map() внутри одной синхронной задачи:
// для презентации из полутора-двух десятков слайдов это ощущалось как зависание страницы (даже
// спиннер загрузки переставал анимироваться — событийный цикл был занят). Теперь после разбора
// презентации спиннер сразу убирается, и слайды появляются в сетке по мере готовности, а не все
// разом в конце.
import {useEffect, useState} from "react";
import JSZip from "jszip";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

export interface PptxSlidePreview {
    index: number;
    /** null - для этого конкретного слайда renderSlideToSvg упал (см. цикл в load() ниже): один
     * битый слайд не должен обрушивать показ всей презентации, остальные рендерятся независимо. */
    svg: string | null;
}

/** @office-kit/pptx падает на "Strict" варианте OOXML (ISO/IEC 29500 Strict — редкий формат
 * сохранения "PowerPoint Strict Open XML Presentation") с невнятным
 * "expected <p:presentation>, got <p:presentation>": сообщение об ошибке в самой библиотеке не
 * печатает URL пространства имён, только префикс с локальным именем тега — они у Strict и
 * Transitional совпадают (оба "p:presentation"), реально различается лишь namespaceURI
 * (http://purl.oclc.org/ooxml/presentationml/main вместо .../2006/main), поэтому "expected" и
 * "got" в сообщении выглядят как будто это одно и то же. См. исходники library (readPresentationPart
 * и аналогичные ей readShapeTreeFromCsldRoot/readGroupChildren) — библиотека вообще не знает про
 * Strict-пространства имён, только про Transitional (NS.pml и т.п. жёстко зашиты на
 * schemas.openxmlformats.org). Та же проблема подтверждена автором и в соседней библиотеке
 * office-kit/xlsx (issue #166 "Strict Open XML Spreadsheet").
 *
 * Чиним сами: при такой ошибке распаковываем архив, заменяем Strict-пространства имён на
 * Transitional во всех *.xml/*.rels записях и пробуем открыть ещё раз. Схема Strict — это, по
 * сути, Transitional с URL пространств имён вида "purl.oclc.org/ooxml/X/Y" вместо
 * "schemas.openxmlformats.org/X/2006/Y" (см. официальный список соответствий в том же issue
 * office-kit/xlsx#166) — для PresentationML/DrawingML этого простого переименования достаточно,
 * не воспроизводя различия в самом содержимом, специфичные для SpreadsheetML (даты, VML).
 */
const STRICT_NS_MISMATCH = /^expected <[\w:]+>, got <[\w:]+>$/;

/** Strict->Transitional: "http://purl.oclc.org/ooxml/X/Y" -> "http://schemas.openxmlformats.org/X/2006/Y"
 * для всех пространств имён, кроме двух docProps-исключений — там Transitional по историческим
 * причинам называется иначе (extended-properties/custom-properties, а не
 * extendedProperties/customProperties). */
function convertStrictNamespacesToTransitional(xml: string): string {
    return xml
        .replace(
            /http:\/\/purl\.oclc\.org\/ooxml\/officeDocument\/extendedProperties/g,
            "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
        )
        .replace(
            /http:\/\/purl\.oclc\.org\/ooxml\/officeDocument\/customProperties/g,
            "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
        )
        .replace(
            /http:\/\/purl\.oclc\.org\/ooxml\/([\w-]+)\/([\w-]+)/g,
            "http://schemas.openxmlformats.org/$1/2006/$2",
        );
}

/** Переписывает пространства имён во всех xml-частях архива и возвращает новый Blob того же
 * .pptx, но уже в Transitional-виде — сам архив (имена файлов, содержимое картинок и т.п.)
 * не трогаем, меняем только текст XML-записей. */
async function repairStrictOoxmlPackage(blob: Blob): Promise<Blob> {
    const zip = await JSZip.loadAsync(blob);
    const xmlEntries = Object.values(zip.files).filter(
        (entry) => !entry.dir && (entry.name.endsWith(".xml") || entry.name.endsWith(".rels")),
    );
    await Promise.all(xmlEntries.map(async (entry) => {
        const xml = await entry.async("string");
        zip.file(entry.name, convertStrictNamespacesToTransitional(xml));
    }));
    return zip.generateAsync({type: "blob"});
}

type OfficeKitPptx = typeof import("@office-kit/pptx");

/** loadPresentation с одной повторной попыткой после починки Strict-пространств имён (см. выше).
 * Если ошибка не похожа на STRICT_NS_MISMATCH — просто пробрасываем её как есть, без лишней
 * распаковки архива на файлах, которые всё равно не откроются по другой причине.
 * Принимает уже загруженный модуль @office-kit/pptx (см. dynamic import в load() ниже) вместо
 * статического импорта наверху файла. */
async function loadPresentationRepairingStrictOoxml(pptx: OfficeKitPptx, blob: Blob) {
    try {
        return await pptx.loadPresentation(blob);
    } catch (err) {
        if (!(err instanceof Error) || !STRICT_NS_MISMATCH.test(err.message)) throw err;
        const repaired = await repairStrictOoxmlPackage(blob);
        return await pptx.loadPresentation(repaired);
    }
}

/** Отдаёт управление браузеру между слайдами. requestAnimationFrame планирует колбэк перед
 * следующей отрисовкой кадра — то есть браузер реально успевает перерисовать то, что уже готово
 * (спиннер, уже добавленные слайды), а не просто "теоретически может". setTimeout(0) — подстраховка
 * на случай окружения без rAF (SSR/тесты), в браузере вкладки всегда есть requestAnimationFrame. */
function yieldToBrowser(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
    });
}

interface UsePptxPreviewResult {
    slides: PptxSlidePreview[];
    /** true, только пока идёт сетевая загрузка файла и разбор презентации (fetch + loadPresentation) —
     * до этого момента показывать всё равно нечего, слайдов ещё нет. Как только известно число
     * слайдов, спиннер убирается и дальше они дорисовываются в сетке по одному (см. totalSlides). */
    loading: boolean;
    /** Общее число слайдов — известно сразу после разбора презентации, раньше, чем они все
     * дорендерятся в SVG. 0, пока не разобрано (или во время loading). Нужно, чтобы показать
     * "Рендерим слайд 3 из 24" вместо голого счётчика уже готовых слайдов. */
    totalSlides: number;
    error: string | null;
}

interface UsePptxPreviewOptions {
    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}. */
    endpoint?: string;

    /** См. fetchFileBlob: хвост URL после {fileId}, если конечная точка не сам /{id}
     * (например, "/download" для вложений документа, см. DocumentsController). */
    pathSuffix?: string;
}

export function usePptxPreview(
    fileId: number | null,
    options: UsePptxPreviewOptions = {},
): UsePptxPreviewResult {
    const {endpoint, pathSuffix} = options;
    const [slides, setSlides] = useState<PptxSlidePreview[]>([]);
    const [totalSlides, setTotalSlides] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            setSlides([]);
            setTotalSlides(0);
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);
            setSlides([]);
            setTotalSlides(0);

            try {
                // Файл и обе office-kit-библиотеки грузим параллельно — сеть и разбор/динамический
                // import() друг другу не мешают, нет смысла ждать по очереди.
                const [{blob}, pptx, pptxPreview] = await Promise.all([
                    fetchFileBlob(fileId, undefined, controller.signal, endpoint, pathSuffix),
                    import("@office-kit/pptx"),
                    import("@office-kit/pptx-preview"),
                ]);
                if (cancelled) return;

                // loadPresentation принимает Blob напрямую - без ручного чтения в ArrayBuffer.
                // Обёртка ниже сама переоткрывает Strict OOXML (см. комментарий над ней) - для
                // обычных (Transitional) файлов, то есть почти всегда, ничего лишнего не делает.
                const presentation = await loadPresentationRepairingStrictOoxml(pptx, blob);
                if (cancelled) return;

                const pptxSlides = pptx.getSlides(presentation);
                if (pptxSlides.length === 0) {
                    setError("Не удалось найти слайды в презентации");
                    return;
                }

                // Дальше есть что показывать - убираем полноэкранный спиннер уже здесь, а не после
                // рендера ВСЕХ слайдов: сам рендер теперь идёт по одному слайду с отдачей браузеру
                // (см. yieldToBrowser ниже), поэтому и показывать его лучше прогрессивно.
                setTotalSlides(pptxSlides.length);
                setLoading(false);

                // renderSlideToSvg синхронный - возвращает готовую строку разметки SVG (по
                // умолчанию текст внутри <foreignObject>, поэтому переносы и шрифты считает сам
                // браузер, а не самодельный алгоритм раскладки текста). Раньше все слайды строились
                // одним .map() - для презентации из 15-20+ слайдов это была одна блокирующая
                // синхронная задача на весь их суммарный рендер (даже анимация спиннера
                // "зависала" - событийный цикл браузера не получал ни одного тика на перерисовку).
                // Теперь после каждого слайда - explicit yieldToBrowser(), так что браузер успевает
                // и перерисовать кадр, и обработать клик "Скачать"/"Закрыть", пока рендерятся
                // оставшиеся слайды.
                for (let i = 0; i < pptxSlides.length; i++) {
                    if (cancelled) return;
                    // Каждый слайд рендерится из своего независимого узла XML - падение на одном
                    // (повреждённые данные конкретного слайда, неподдержанный элемент и т.п.) не
                    // должно прятать уже показанные и ещё не показанные соседние слайды за одной
                    // общей ошибкой на всю презентацию.
                    let svg: string | null;
                    try {
                        svg = pptxPreview.renderSlideToSvg(presentation, pptxSlides[i]);
                    } catch {
                        svg = null;
                    }
                    if (cancelled) return;
                    setSlides((prev) => [...prev, {index: i + 1, svg}]);
                    await yieldToBrowser();
                }
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : "Ошибка загрузки презентации";
                // Если и после попытки починки Strict OOXML вылезла та же по виду ошибка (либо
                // файл действительно битый, либо это какой-то третий, ещё не понятный вариант
                // формата) - сырой текст "expected <...>, got <...>" пользователю ничего не
                // скажет, показываем понятную фразу вместо него.
                setError(
                    STRICT_NS_MISMATCH.test(message)
                        ? "Не удалось разобрать презентацию: файл использует вариант формата PPTX, который предпросмотр пока не понимает. Скачайте файл и откройте его в PowerPoint."
                        : message,
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [fileId, endpoint, pathSuffix]);

    return {slides, loading, totalSlides, error};
}
