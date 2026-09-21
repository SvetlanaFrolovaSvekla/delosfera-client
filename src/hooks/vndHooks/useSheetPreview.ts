// Просмотр .xlsx в браузере - строим обычную HTML-таблицу (по одной на лист) вручную по
// содержимому листа, а не через готовый XLSX.utils.sheet_to_html: он отдаёт голый текст без
// цвета заливки/шрифта ячеек, а именно это в первую очередь узнаваемо на глаз при сравнении с
// оригиналом в Excel. Формулы как таковые (сами вычисления) всё равно не воспроизводятся - берём
// уже посчитанный Excel'ем результат (cell.w/cell.v), поэтому AttachmentDocxPreviewModal по-
// прежнему показывает рядом с этим превью предупреждение и кнопку "Скачать".
//
// Используются ДВЕ библиотеки одновременно, а не одна - и это не случайность:
//  - xlsx (SheetJS) даёт готовый отформатированный текст ячейки (числа/даты как в самом Excel,
//    с учётом числового формата), тип ячейки и объединения (!merges), а из стилей - только
//    заливку (fgColor), причём с корректным разбором цветов темы.
//  - у неё же, при разборе .xlsx, цвет ШРИФТА ячейки при чтении в принципе не сохраняется (это
//    видно по исходникам библиотеки - при парсинге стилей она вытаскивает только Fill, шрифт
//    отбрасывается ещё на этапе разбора styles.xml), даже с опцией cellStyles: true.
//  - поэтому цвет/жирность/курсив шрифта отдельно достаём через exceljs - она читает стили
//    полностью. Импортируем её динамически (import()), чтобы её ~930 КБ подгружались только при
//    реальном открытии превью .xlsx, а не тянулись в основной бандл приложения.
import React, {useEffect, useRef, useState} from "react";
import * as XLSX from "xlsx";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

interface UseSheetPreviewResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    loading: boolean;
    error: string | null;
}

interface UseSheetPreviewOptions {
    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}. */
    endpoint?: string;

    /** См. fetchFileBlob: хвост URL после {fileId}, если конечная точка не сам /{id}
     * (например, "/download" для вложений документа, см. DocumentsController). */
    pathSuffix?: string;
}

// Минимальная форма стиля заливки, которую xlsx (SheetJS) кладёт в cell.s при чтении с опцией
// cellStyles: true. Полноценных типов под неё в самом пакете нет (сама библиотека объявляет
// cell.s как any), поэтому описываем только то, что реально используем.
interface XlsxFillStyle {
    fgColor?: {rgb?: string};
}

interface FontStyle {
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

/** address ("A1", "B2"...) -> стиль шрифта этой ячейки. По одной карте на лист. */
type SheetFontStyles = Record<string, FontStyle>;

// И xlsx, и exceljs отдают цвет как ARGB-строку ("FF00B050") - альфа-байт спереди Excel'ем для
// заливки/шрифта ячеек фактически не используется, отбрасываем его и получаем обычный CSS-цвет.
// Изредка (в основном у xlsx-заливок) альфа-байт вообще отсутствует - тогда строка уже 6 знаков.
function argbToCss(rgb: string | undefined): string | null {
    if (!rgb) return null;
    const hex = rgb.length === 8 ? rgb.slice(2) : rgb;
    return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : null;
}

// Читает цвет/жирность/курсив/подчёркивание шрифта из файла через exceljs - см. комментарий
// в шапке файла про то, почему это не может сделать xlsx. Если exceljs не смог загрузиться или
// разобрать файл (сеть, повреждённый файл и т.п.) - молча остаёмся без цвета шрифта: это
// декоративное дополнение поверх уже рабочего предпросмотра (текст, заливка, объединения), а не
// критичная часть.
async function loadFontStyles(buffer: ArrayBuffer): Promise<Record<string, SheetFontStyles> | null> {
    try {
        // exceljs - CJS-пакет; его .d.ts объявляет только именованные экспорты (export class
        // Workbook...), но фактически (проверено и в Node, и это стандартное поведение esbuild/
        // Rollup-интеропа для CJS) сам объект модуля лежит в default, а не в именованных полях -
        // деструктуризация { Workbook } из await import(...) в рантайме падает с "Workbook is
        // not a constructor". default.Workbook работает всегда независимо от бандлера.
        type ExceljsModule = typeof import("exceljs");
        const {default: ExcelJS} = (await import("exceljs")) as unknown as {default: ExceljsModule};
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const bySheet: Record<string, SheetFontStyles> = {};
        workbook.worksheets.forEach((worksheet) => {
            const styles: SheetFontStyles = {};
            worksheet.eachRow({includeEmpty: false}, (row, rowNumber) => {
                row.eachCell({includeEmpty: false}, (cell, colNumber) => {
                    const font = cell.font;
                    if (!font) return;

                    const color = argbToCss(font.color?.argb) ?? undefined;
                    const underline = !!font.underline && font.underline !== "none";
                    if (!color && !font.bold && !font.italic && !underline) return;

                    // exceljs нумерует строки/столбцы с 1, xlsx (и наш рендер таблицы ниже) - с
                    // 0 - переводим адрес в общий вид ("A1"), чтобы дальше искать по одному ключу.
                    const address = XLSX.utils.encode_cell({r: rowNumber - 1, c: colNumber - 1});
                    styles[address] = {color, bold: font.bold || undefined, italic: font.italic || undefined, underline: underline || undefined};
                });
            });
            bySheet[worksheet.name] = styles;
        });
        return bySheet;
    } catch {
        return null;
    }
}

function applyCellColors(cell: HTMLTableCellElement, fill: XlsxFillStyle | undefined, font: FontStyle | undefined) {
    // fgColor - это и есть видимый цвет заливки для обычной сплошной закраски ячейки (bgColor в
    // модели Excel/OOXML - это "подложка" под узор штриховки, для сплошной заливки не видна).
    const fillColor = argbToCss(fill?.fgColor?.rgb);
    if (fillColor) cell.style.backgroundColor = fillColor;

    if (!font) return;
    if (font.color) cell.style.color = font.color;
    if (font.bold) cell.style.fontWeight = "700";
    if (font.italic) cell.style.fontStyle = "italic";
    if (font.underline) cell.style.textDecoration = "underline";
}

function buildSheetTable(sheet: XLSX.WorkSheet, fontStyles: SheetFontStyles | undefined): HTMLTableElement {
    const table = document.createElement("table");
    table.className = "w-full border-collapse text-[12.5px] text-[#3c4356]";

    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
    const merges = sheet["!merges"] ?? [];

    // Ячейка, "накрытая" объединением, но не являющаяся его левым верхним углом - её вообще не
    // рендерим (сам объединённый диапазон рисует одна td с colSpan/rowSpan).
    const isMergeOrigin = (r: number, c: number) =>
        merges.find((m) => m.s.r === r && m.s.c === c);
    const isMergeCovered = (r: number, c: number) =>
        merges.some((m) => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c && !(m.s.r === r && m.s.c === c));

    for (let r = range.s.r; r <= range.e.r; r++) {
        const row = document.createElement("tr");
        row.classList.add("hover:bg-[#f1f4fb]");

        const isHeaderRow = r === range.s.r;
        // Строка-«зебра» на чётных строках данных - только пока конкретная ячейка не принесла
        // свой явный цвет заливки из файла (applyCellColors ниже перекроет этот фон инлайн-
        // стилем, инлайн-стиль всегда сильнее класса).
        const zebra = !isHeaderRow && (r - range.s.r) % 2 === 0;

        for (let c = range.s.c; c <= range.e.c; c++) {
            if (isMergeCovered(r, c)) continue;

            const address = XLSX.utils.encode_cell({r, c});
            const cellData = sheet[address] as (XLSX.CellObject & {s?: XlsxFillStyle}) | undefined;

            const cell = document.createElement("td");
            cell.classList.add(
                "border", "border-[#e9edf3]", "px-2.5", "py-1.5",
                "align-top", "whitespace-pre-wrap", "break-words",
            );

            const merge = isMergeOrigin(r, c);
            if (merge) {
                const colSpan = merge.e.c - merge.s.c + 1;
                const rowSpan = merge.e.r - merge.s.r + 1;
                if (colSpan > 1) cell.colSpan = colSpan;
                if (rowSpan > 1) cell.rowSpan = rowSpan;
            }

            cell.textContent = cellData?.w ?? (cellData?.v !== undefined ? String(cellData.v) : "");

            // Числа и даты Excel по умолчанию выравнивает по правому краю, текст - по левому;
            // cell.t (тип значения) надёжнее регулярки по итоговому тексту, т.к. в тексте может
            // быть добавка вроде "(просрочено на 40 дн.)".
            if (cellData?.t === "n") cell.classList.add("text-right", "tabular-nums");

            if (isHeaderRow) {
                // Первую строку закрепляем сверху (position: sticky) внутри прокручиваемой
                // рамки - большинство таблиц начинают с заголовков столбцов, и так они не
                // уезжают из виду при скролле вниз, как замороженная верхняя строка в Excel.
                // Фон/цвет ниже - лишь заготовка на случай, если у заголовка в самом файле нет
                // своей заливки/цвета шрифта; если есть - applyCellColors перекроет их инлайн-
                // стилем (он всегда сильнее класса).
                cell.classList.add("sticky", "top-0", "z-10", "bg-[#f3f5fa]", "font-semibold", "text-[#1c2740]");
            } else if (zebra) {
                cell.classList.add("bg-[#fafbfd]");
            }

            applyCellColors(cell, cellData?.s, fontStyles?.[address]);
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    return table;
}

export function useSheetPreview(
    fileId: number | null,
    options: UseSheetPreviewOptions = {},
): UseSheetPreviewResult {
    const {endpoint, pathSuffix} = options;
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
        // См. аналогичный комментарий в useDocxPreview.ts - без явного отзыва предыдущий fetch
        // может проиграть гонку за контейнер уже после того, как компонент показывает другой файл.
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const {blob} = await fetchFileBlob(fileId, undefined, controller.signal, endpoint, pathSuffix);
                if (cancelled || !containerRef.current) return;

                const buffer = await blob.arrayBuffer();
                if (cancelled || !containerRef.current) return;

                // XLSX.read с type: "array" ждёт именно Uint8Array (индексируемый по байтам) -
                // "сырой" ArrayBuffer молча даёт пустую/битую книгу, т.к. у него нет числового
                // индекса. cellStyles: true просит SheetJS распарсить заливку ячеек в cell.s
                // (цвет шрифта она всё равно не отдаёт - см. loadFontStyles выше).
                const workbook = XLSX.read(new Uint8Array(buffer), {type: "array", cellStyles: true});
                if (cancelled || !containerRef.current) return;

                // Отдельно, через exceljs, читаем цвет/жирность/курсив шрифта из ТОГО ЖЕ буфера.
                // Обе библиотеки только читают буфер и не изменяют/не "забирают" его, поэтому
                // безопасно скормить один и тот же ArrayBuffer обеим.
                const fontStylesBySheet = await loadFontStyles(buffer);
                if (cancelled || !containerRef.current) return;

                containerRef.current.innerHTML = "";

                if (workbook.SheetNames.length === 0) {
                    setError("В файле нет листов для отображения");
                    return;
                }

                workbook.SheetNames.forEach((sheetName, i) => {
                    const sheet = workbook.Sheets[sheetName];
                    if (!sheet || !containerRef.current) return;

                    const section = document.createElement("div");
                    section.className = i > 0 ? "mt-6" : "";

                    // Название листа показываем, только если их больше одного - для файла с
                    // единственным листом ("Лист1" и т.п.) это просто лишний шум над таблицей.
                    // Оформляем как вкладку-«таб», похожую на ярлычки листов внизу окна Excel,
                    // чтобы сразу было видно, что это переключение между листами, а не заголовок
                    // данных.
                    if (workbook.SheetNames.length > 1) {
                        const heading = document.createElement("div");
                        heading.className =
                            "mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ececfc] " +
                            "px-2.5 py-1 text-[11px] font-semibold text-[#4e57d6]";
                        heading.textContent = sheetName;
                        section.appendChild(heading);
                    }

                    // Ограничиваем высоту области таблицы и даём ей свой собственный скролл (а
                    // не overflow-x-auto без ограничения по высоте, как раньше) - иначе для
                    // длинной таблицы горизонтальный скроллбар оказывался внизу ВСЕЙ таблицы, и
                    // чтобы прокрутить вправо, нужно было сначала долистать вниз до последней
                    // строки. Теперь и вертикальный, и горизонтальный скролл живут в одной
                    // видимой рамке фиксированной высоты - как в самом Excel.
                    const wrap = document.createElement("div");
                    wrap.className =
                        "max-h-[70vh] overflow-auto rounded-[10px] border border-[#e9edf3]";
                    wrap.appendChild(buildSheetTable(sheet, fontStylesBySheet?.[sheetName]));
                    section.appendChild(wrap);

                    containerRef.current.appendChild(section);
                });
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
                setError(err instanceof Error ? err.message : "Ошибка загрузки таблицы");
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

    return {containerRef, loading, error};
}
