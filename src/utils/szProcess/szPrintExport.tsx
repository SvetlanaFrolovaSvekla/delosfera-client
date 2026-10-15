/**
 * Выгрузка служебной записки: PDF, Word (DOCX) и печать «сразу» — без перехода на
 * печатную форму. Источник один — печатная форма записки с листом согласования
 * (szPaperService.printForm), поэтому файл, бумага и экран совпадают.
 *
 *  - PDF собирается из того же листа, что и печатная форма (SzPrintSheet): лист
 *    рисуется вне экрана, снимается в изображение и раскладывается по страницам A4.
 *    Страницы режутся по границам абзацев и строк таблиц, а не посреди строки.
 *  - DOCX собирается вручную (OOXML в zip через JSZip — как выгрузка ТИД): обычный
 *    редактируемый документ Word с текстом, таблицами и листом согласования.
 *  - Печать: печатная форма грузится в скрытом окне и сама открывает диалог печати.
 */
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
import JSZip from "jszip";
import {
    PRINT_RESOLUTION_LABEL,
    szPrintUrl,
    type SzPrintApproval,
    type SzPrintForm,
    type SzPrintMode,
} from "@/service/szService/szPaperService.ts";
import {
    SZ_PRINT_LOGO_URL,
    SZ_PRINT_STYLES,
    SzPrintSheet,
} from "@/components/componentsSz/componentsPrint/SzPrintSheet.tsx";
import {
    chunkHex,
    formatCertDate,
    formatPrintDate,
    formatPrintTime,
    shortenHex,
} from "@/utils/szProcess/szPrintFormat.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {saveBlob} from "@/utils/downloadFiles/downloadFile.ts";
import {sanitizeFileName} from "@/utils/downloadFiles/fileNaming.ts";

// ─────────────────────────────── общее ───────────────────────────────

/** Имя файла: «СЗ-2026-0012 — Тема записки (с ЭЦП)». */
export function szExportFileName(form: SzPrintForm, mode: SzPrintMode, ext: "pdf" | "docx"): string {
    const number = form.regNumber ?? "СЗ без номера";
    const title = sanitizeFileName(form.title ?? "").slice(0, 80);
    const suffix = mode === "signed" ? "с ЭЦП" : "для подписи";
    return `${sanitizeFileName(number)}${title ? ` — ${title}` : ""} (${suffix}).${ext}`;
}

/** Дождаться картинок (логотип бланка) и шрифтов — иначе лист снимется/напечатается без них. */
export async function waitForSheetAssets(root: HTMLElement): Promise<void> {
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(images.map((img) => img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), {once: true});
            img.addEventListener("error", () => resolve(), {once: true});
        })));
    try {
        await document.fonts?.ready;
    } catch {
        // шрифты не критичны — снимаем как есть
    }
}

// ─────────────────────────────── PDF ───────────────────────────────

const PDF_PAGE_W = 210;
const PDF_PAGE_H = 297;
const PDF_MARGIN_X = 16;
const PDF_MARGIN_Y = 15;
const PDF_CONTENT_W = PDF_PAGE_W - PDF_MARGIN_X * 2; // 178 мм — ширина листа в режиме capture

/** Нарисовать лист вне экрана (режим capture) и вернуть его элемент. */
async function mountCaptureSheet(form: SzPrintForm, mode: SzPrintMode) {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none;background:#fff;";
    document.body.appendChild(host);

    const root = createRoot(host);
    flushSync(() => {
        root.render(
            <>
                <style>{SZ_PRINT_STYLES}</style>
                <SzPrintSheet form={form} mode={mode} variant="capture"/>
            </>,
        );
    });

    const sheet = host.querySelector<HTMLElement>(".sz-print-sheet");
    if (!sheet) {
        root.unmount();
        host.remove();
        throw new Error("Печатная форма не отрисовалась");
    }
    await waitForSheetAssets(sheet);

    return {
        sheet,
        dispose: () => {
            root.unmount();
            host.remove();
        },
    };
}

/**
 * Места, где страницу можно разрезать, не задев строку текста: верх и низ абзацев,
 * пунктов списков, строк таблиц, заголовков, штампов. Внутри ячеек таблицы режем
 * только по границе строки — ячейка не должна разъезжаться по двум листам.
 */
function collectBreakpoints(sheet: HTMLElement): number[] {
    const origin = sheet.getBoundingClientRect().top;
    const points = new Set<number>();
    sheet.querySelectorAll<HTMLElement>("p, li, tr, h1, h2, h3, h4, blockquote, table, .sz-stamp, div")
        .forEach((el) => {
            if (el.tagName !== "TR" && el.closest("td, th")) return;
            const r = el.getBoundingClientRect();
            if (r.height === 0) return;
            points.add(Math.round(r.top - origin));
            points.add(Math.round(r.bottom - origin));
        });
    return [...points].sort((a, b) => a - b);
}

export async function downloadSzPdf(form: SzPrintForm, mode: SzPrintMode): Promise<void> {
    // Библиотеки тяжёлые и нужны только здесь — грузим по требованию.
    const [{default: html2canvas}, {jsPDF}] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
    ]);

    const {sheet, dispose} = await mountCaptureSheet(form, mode);
    try {
        const cssWidth = sheet.offsetWidth;
        const cssHeight = sheet.scrollHeight;
        const breakpoints = collectBreakpoints(sheet);

        const canvas = await html2canvas(sheet, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
        });

        const pxPerMm = cssWidth / PDF_CONTENT_W;
        const pageCss = (PDF_PAGE_H - PDF_MARGIN_Y * 2) * pxPerMm;
        const ratio = canvas.width / cssWidth;

        // Раскладка по страницам: конец страницы — ближайшая граница блока, но
        // страница не короче 40% высоты (иначе один длинный блок дал бы пустые листы).
        const slices: Array<[number, number]> = [];
        let top = 0;
        while (top < cssHeight - 1) {
            let end = Math.min(top + pageCss, cssHeight);
            if (end < cssHeight) {
                const fit = breakpoints.filter((b) => b > top + pageCss * 0.4 && b <= end);
                if (fit.length > 0) end = fit[fit.length - 1];
            }
            slices.push([top, end]);
            top = end;
        }

        const pdf = new jsPDF({unit: "mm", format: "a4", orientation: "portrait", compress: true});
        slices.forEach(([from, to], index) => {
            const part = document.createElement("canvas");
            part.width = canvas.width;
            part.height = Math.max(1, Math.round((to - from) * ratio));
            const ctx = part.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, part.width, part.height);
            ctx.drawImage(canvas, 0, Math.round(from * ratio), part.width, part.height, 0, 0, part.width, part.height);

            if (index > 0) pdf.addPage();
            pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG",
                PDF_MARGIN_X, PDF_MARGIN_Y, PDF_CONTENT_W, (to - from) / pxPerMm);

            // Номер страницы — цифрами: встроенные шрифты PDF без кириллицы.
            if (slices.length > 1) {
                pdf.setFontSize(8);
                pdf.setTextColor(139, 151, 171);
                pdf.text(`${index + 1} / ${slices.length}`, PDF_PAGE_W - PDF_MARGIN_X, PDF_PAGE_H - 7, {align: "right"});
            }
        });

        pdf.setProperties({title: form.title ?? "Служебная записка", subject: form.regNumber ?? ""});
        saveBlob(pdf.output("blob"), szExportFileName(form, mode, "pdf"));
    } finally {
        dispose();
    }
}

// ─────────────────────────────── печать ───────────────────────────────

/**
 * Распечатать записку, не уходя со страницы: печатная форма грузится в скрытом окне
 * и сама открывает диалог печати (?autoprint=1). Промис завершается, когда диалог
 * открылся, — до этого кнопка показывает «Готовим…».
 */
export function printSz(szId: number, mode: SzPrintMode): Promise<void> {
    return new Promise<void>((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.tabIndex = -1;
        iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        iframe.src = `${szPrintUrl(szId, mode)}&autoprint=1`;

        let settled = false;
        const ready = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const cleanup = () => {
            ready();
            // Небольшая пауза: часть браузеров досылает печать уже после afterprint.
            window.setTimeout(() => iframe.remove(), 1000);
        };

        iframe.addEventListener("load", () => {
            const win = iframe.contentWindow;
            win?.addEventListener("beforeprint", ready);
            win?.addEventListener("afterprint", cleanup);
        });

        // Страховка: форма не загрузилась или браузер не шлёт события печати.
        window.setTimeout(ready, 20_000);
        window.setTimeout(() => iframe.isConnected && iframe.remove(), 10 * 60_000);

        document.body.appendChild(iframe);
    });
}

// ─────────────────────────────── DOCX ───────────────────────────────

const TW_PER_MM = 56.7;
const PAGE_W_TW = 11906; // A4
const PAGE_H_TW = 16838;
const MARGIN_X_TW = Math.round(16 * TW_PER_MM);
const MARGIN_Y_TW = Math.round(18 * TW_PER_MM);
const CONTENT_W_TW = PAGE_W_TW - MARGIN_X_TW * 2;

const GREY = "55617A";
const LIGHT_GREY = "7A869A";
const STAMP = "1F3A93";
const STAMP_FILL = "F2F5FD";

function esc(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

interface RunStyle {
    b?: boolean;
    i?: boolean;
    u?: boolean;
    strike?: boolean;
    color?: string;
    /** Кегль в пунктах. */
    size?: number;
    font?: string;
}

function rPr(st: RunStyle): string {
    const parts: string[] = [];
    if (st.font) parts.push(`<w:rFonts w:ascii="${st.font}" w:hAnsi="${st.font}" w:cs="${st.font}"/>`);
    if (st.b) parts.push("<w:b/><w:bCs/>");
    if (st.i) parts.push("<w:i/><w:iCs/>");
    if (st.strike) parts.push("<w:strike/>");
    if (st.color) parts.push(`<w:color w:val="${st.color}"/>`);
    if (st.size) parts.push(`<w:sz w:val="${Math.round(st.size * 2)}"/><w:szCs w:val="${Math.round(st.size * 2)}"/>`);
    if (st.u) parts.push(`<w:u w:val="single"/>`);
    return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

function run(text: string, st: RunStyle = {}): string {
    if (!text) return "";
    return `<w:r>${rPr(st)}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

const BREAK_RUN = "<w:r><w:br/></w:r>";
const TAB_RUN = "<w:r><w:tab/></w:r>";

interface ParaProps {
    align?: "left" | "center" | "right" | "both";
    /** Отступ слева, твипы. */
    indent?: number;
    hanging?: number;
    before?: number;
    after?: number;
    keepNext?: boolean;
    borderLeft?: boolean;
    borderBottom?: boolean;
    /** Линия сверху (цвет hex) — разделитель внутри штампа ЭЦП. */
    borderTopColor?: string;
    /** Заливка абзаца (hex). */
    shade?: string;
    /** Кегль «пустого» абзаца — чтобы пустая строка не была выше текста вокруг. */
    size?: number;
}

function para(runs: string, pp: ParaProps = {}): string {
    const p: string[] = [];
    if (pp.keepNext) p.push("<w:keepNext/>");
    if (pp.borderLeft || pp.borderBottom || pp.borderTopColor) {
        p.push("<w:pBdr>"
            + (pp.borderTopColor ? `<w:top w:val="single" w:sz="4" w:space="2" w:color="${pp.borderTopColor}"/>` : "")
            + (pp.borderLeft ? `<w:left w:val="single" w:sz="12" w:space="6" w:color="999999"/>` : "")
            + (pp.borderBottom ? `<w:bottom w:val="single" w:sz="6" w:space="4" w:color="0F1B2D"/>` : "")
            + "</w:pBdr>");
    }
    if (pp.shade) p.push(`<w:shd w:val="clear" w:color="auto" w:fill="${pp.shade}"/>`);
    p.push(`<w:spacing w:before="${pp.before ?? 0}" w:after="${pp.after ?? 0}"/>`);
    if (pp.indent || pp.hanging) {
        p.push(`<w:ind w:left="${pp.indent ?? 0}"${pp.hanging ? ` w:hanging="${pp.hanging}"` : ""}/>`);
    }
    if (pp.align && pp.align !== "left") p.push(`<w:jc w:val="${pp.align}"/>`);
    if (pp.size) p.push(`<w:rPr><w:sz w:val="${pp.size * 2}"/></w:rPr>`);
    return `<w:p><w:pPr>${p.join("")}</w:pPr>${runs}</w:p>`;
}

interface Cell {
    /** Готовые блоки (абзацы, таблицы); пустая ячейка всё равно получает абзац. */
    blocks: string[];
    width: number;
    span?: number;
    shade?: string;
}

interface TableOpts {
    widths: number[];
    borders?: boolean;
    /** Первая строка — шапка, повторяется на каждом листе. */
    header?: boolean;
    /** Минимальная высота строк (твипы), кроме шапки. */
    rowHeight?: number;
    cellMargin?: number;
    /** Своя рамка вместо обычной тонкой: штамп ЭЦП — двойная синяя. */
    frame?: { val: "single" | "double"; sz: number; color: string };
}

function table(rows: Cell[][], opts: TableOpts): string {
    const border = opts.borders === false
        ? `<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>`
        : `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
            .map((side) => opts.frame
                ? `<w:${side} w:val="${opts.frame.val}" w:sz="${opts.frame.sz}" w:space="0" w:color="${opts.frame.color}"/>`
                : `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="0F1B2D"/>`).join("")}</w:tblBorders>`;
    const margin = opts.cellMargin ?? 85;
    const total = opts.widths.reduce((a, b) => a + b, 0);

    const tr = rows.map((cells, rowIndex) => {
        const isHeader = opts.header && rowIndex === 0;
        const trPr = [
            "<w:cantSplit/>",
            isHeader ? "<w:tblHeader/>" : "",
            !isHeader && opts.rowHeight ? `<w:trHeight w:val="${opts.rowHeight}" w:hRule="atLeast"/>` : "",
        ].join("");
        const tc = cells.map((c) => {
            const tcPr = `<w:tcPr><w:tcW w:w="${c.width}" w:type="dxa"/>${c.span && c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : ""}${c.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.shade}"/>` : ""}</w:tcPr>`;
            const content = c.blocks.length > 0 && c.blocks[c.blocks.length - 1].startsWith("<w:p")
                ? c.blocks.join("")
                : c.blocks.join("") + para("", {size: 1});
            return `<w:tc>${tcPr}${content}</w:tc>`;
        }).join("");
        return `<w:tr><w:trPr>${trPr}</w:trPr>${tc}</w:tr>`;
    }).join("");

    return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${border}<w:tblLayout w:type="fixed"/>`
        + `<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="${margin}" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="${margin}" w:type="dxa"/></w:tblCellMar>`
        + `</w:tblPr><w:tblGrid>${opts.widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${tr}</w:tbl>`;
}

// ── HTML текста записки → OOXML ──

function cssColor(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) return rgb.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase();
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    if (hex) return hex[1].toUpperCase();
    const short = value.match(/^#([0-9a-f]{3})$/i);
    if (short) return short[1].split("").map((c) => c + c).join("").toUpperCase();
    return undefined;
}

function cssAlign(el: HTMLElement): ParaProps["align"] {
    const a = (el.style?.textAlign || el.getAttribute("align") || "").toLowerCase();
    if (a === "center" || a === "right") return a;
    if (a === "justify") return "both";
    return undefined;
}

const HEADING_SIZE: Record<string, number> = {H1: 15, H2: 13.5, H3: 12.5, H4: 12, H5: 12, H6: 12};

/** Разбор HTML из редактора записки в абзацы и таблицы Word. */
class HtmlToOoxml {
    private out: string[] = [];
    private runs: string[] = [];
    private prefix: string | null = null;

    private readonly width: number;

    constructor(width: number) {
        this.width = width;
    }

    static convert(html: string, width: number, base: RunStyle): string[] {
        const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
        const conv = new HtmlToOoxml(width);
        conv.children(doc.body, base, {after: 100});
        conv.flush({after: 100});
        return conv.out;
    }

    private flush(pp: ParaProps) {
        if (this.runs.length === 0) return;
        const prefix = this.prefix ?? "";
        this.prefix = null;
        this.out.push(para(prefix + this.runs.join(""), pp));
        this.runs = [];
    }

    private children(node: Node, st: RunStyle, pp: ParaProps, list?: { level: number }) {
        node.childNodes.forEach((child) => this.node(child, st, pp, list));
    }

    private node(node: Node, st: RunStyle, pp: ParaProps, list?: { level: number }) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent ?? "").replace(/\s+/g, " ");
            if (this.runs.length === 0 && !text.trim()) return;
            this.runs.push(run(this.runs.length === 0 ? text.trimStart() : text, st));
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName;

        switch (tag) {
            case "BR":
                this.runs.push(BREAK_RUN);
                return;
            case "B":
            case "STRONG":
                return this.children(el, {...st, b: true}, pp, list);
            case "I":
            case "EM":
                return this.children(el, {...st, i: true}, pp, list);
            case "U":
            case "INS":
                return this.children(el, {...st, u: true}, pp, list);
            case "S":
            case "STRIKE":
            case "DEL":
                return this.children(el, {...st, strike: true}, pp, list);
            case "SPAN":
            case "FONT":
            case "MARK":
            case "A":
            case "CODE":
            case "SUB":
            case "SUP": {
                const color = cssColor(el.style?.color) ?? cssColor(el.getAttribute("color"));
                const bold = el.style?.fontWeight === "bold" || Number(el.style?.fontWeight) >= 600;
                return this.children(el, {...st, color: color ?? st.color, b: st.b || bold}, pp, list);
            }
            case "IMG":
            case "SCRIPT":
            case "STYLE":
                return;
            case "HR":
                this.flush(pp);
                this.out.push(para("", {...pp, borderBottom: true, after: 120}));
                return;
            case "UL":
            case "OL": {
                this.flush(pp);
                const level = (list?.level ?? -1) + 1;
                let index = 0;
                el.childNodes.forEach((li) => {
                    if (li.nodeType !== Node.ELEMENT_NODE || (li as HTMLElement).tagName !== "LI") return;
                    index += 1;
                    const liPp: ParaProps = {...pp, indent: 360 * (level + 1), hanging: 360, after: 40};
                    this.flush(liPp);
                    const marker = tag === "OL" ? `${index}.` : (level === 0 ? "•" : "◦");
                    this.prefix = run(marker, st) + TAB_RUN;
                    this.children(li, st, liPp, {level});
                    this.flush(liPp);
                    this.prefix = null;
                });
                if (level === 0) this.out.push(para("", {size: 4}));
                return;
            }
            case "BLOCKQUOTE": {
                this.flush(pp);
                const bq: ParaProps = {...pp, indent: (pp.indent ?? 0) + 200, borderLeft: true, after: 60};
                this.children(el, st, bq, list);
                this.flush(bq);
                return;
            }
            case "TABLE":
                this.flush(pp);
                this.out.push(this.table(el, st));
                this.out.push(para("", {size: 4, after: 60}));
                return;
            case "P":
            case "DIV":
            case "H1":
            case "H2":
            case "H3":
            case "H4":
            case "H5":
            case "H6":
            case "LI":
            case "SECTION":
            case "ARTICLE": {
                this.flush(pp);
                const heading = HEADING_SIZE[tag];
                const own: ParaProps = {
                    ...pp,
                    align: cssAlign(el) ?? pp.align,
                    ...(heading ? {before: 120, after: 80, keepNext: true} : {}),
                };
                const ownSt: RunStyle = heading ? {...st, b: true, size: heading} : st;
                this.children(el, ownSt, own, list);
                // Пустой абзац из редактора — это пустая строка, её надо сохранить.
                if (this.runs.length === 0 && !this.prefix && (tag === "P") && !el.textContent?.trim()) {
                    this.out.push(para("", own));
                    return;
                }
                this.flush(own);
                return;
            }
            default:
                this.children(el, st, pp, list);
        }
    }

    private table(el: HTMLElement, st: RunStyle): string {
        const rows = Array.from(el.querySelectorAll("tr")).filter((tr) => tr.closest("table") === el);
        const cols = Math.max(1, ...rows.map((tr) => Array.from(tr.children)
            .reduce((n, td) => n + Math.max(1, Number((td as HTMLElement).getAttribute("colspan") ?? 1)), 0)));
        const colW = Math.floor(this.width / cols);
        const widths = Array.from({length: cols}, () => colW);

        const cells: Cell[][] = rows.map((tr) => Array.from(tr.children)
            .filter((td) => td.tagName === "TD" || td.tagName === "TH")
            .map((td) => {
                const span = Math.max(1, Number(td.getAttribute("colspan") ?? 1));
                const width = colW * span;
                const cellSt = td.tagName === "TH" ? {...st, b: true} : st;
                const conv = new HtmlToOoxml(width - 170);
                conv.children(td, cellSt, {});
                conv.flush({});
                return {blocks: conv.out, width, span};
            }));
        return table(cells, {widths, borders: true});
    }
}

// ── Лист записки ──

/**
 * Штамп ЭЦП в рамке — как «оттиск» на печатной форме: двойная синяя рамка и светлая
 * заливка. В Word это таблица из одной ячейки внутри ячейки «Подпись».
 */
function stampFrame(blocks: string[], width: number): string[] {
    return [table([[{blocks, width, shade: STAMP_FILL}]], {
        widths: [width],
        frame: {val: "double", sz: 6, color: STAMP},
        cellMargin: 85,
    })];
}

function signatureBlocks(a: SzPrintApproval, mode: SzPrintMode, width: number): string[] {
    if (mode === "paper") return [];
    const s = a.signature;
    const small: RunStyle = {size: 8, color: LIGHT_GREY, i: true};
    if (s?.revoked) return [para(run(`Подпись аннулирована: ${s.revokedReason ?? ""}`, {size: 8, i: true, color: "C0392B"}))];
    if (!s) return [para(run(a.resolution ? "Без ЭЦП" : "—", small))];

    if (!s.isEcp) {
        return [
            para(run("Без ЭЦП", small)),
            para(run(s.levelTitle, {size: 8, b: true})),
            ...(s.fullName ? [para(run(s.fullName, {size: 8}))] : []),
            para(run(formatDateTime(s.at), {size: 8})),
            ...(s.fingerprint ? [para(run(`отпечаток ${s.fingerprint}`, {size: 8, color: GREY}))] : []),
        ];
    }

    const st: RunStyle = {size: 7.5, color: STAMP};
    const mono: RunStyle = {size: 6.5, color: STAMP, font: "Consolas"};
    const blocks: string[] = [];
    if (s.isTest) blocks.push(para(run("ТЕСТОВАЯ ИМИТАЦИЯ ЭЦП — НЕ ЯВЛЯЕТСЯ ПОДПИСЬЮ", {size: 7, b: true, color: "FFFFFF"}), {align: "center", shade: "C0392B", after: 20}));
    blocks.push(para(run("ПОДПИСАНО С ПОМОЩЬЮ ЭЦП", {...st, b: true, size: 8}), {align: "center"}));
    blocks.push(para(run(s.isTest
        ? "тестовый режим · у ГП «Инфоком» не проверялась"
        : "облачная ЭЦП ГП «Инфоком» · подпись проверена", {size: 6.5, color: LIGHT_GREY}), {align: "center", after: 40}));
    if (s.fullName) blocks.push(para(run(`Владелец: ${s.fullName}`, {...st, b: true})));
    if (s.organizationName) blocks.push(para(run(`Организация: ${s.organizationName}`, st)));
    const cert = formatCertDate(s.certValidNotAfter);
    if (cert) blocks.push(para(run(`Сертификат действителен до: ${cert}`, st)));
    if (s.issuerName) blocks.push(para(run(`Издатель: ${s.issuerName}`, st)));
    blocks.push(para(run(`Подписано: ${formatDateTime(s.at)}`, st)));
    if (s.documentHash) {
        blocks.push(para(run("Хэш документа (SHA-256):", {size: 6.5, color: LIGHT_GREY})));
        chunkHex(s.documentHash, 32).forEach((part) => blocks.push(para(run(part, mono))));
    }
    if (s.signatureSha256) blocks.push(para(run(`Отпечаток подписи: ${shortenHex(s.signatureSha256)}`, {...mono, color: LIGHT_GREY})));
    if (s.matchesCurrentContent === false) {
        blocks.push(para(run("Подписано под предыдущей версией текста записки", {size: 7, b: true, color: "8A5A00"}), {before: 40, borderTopColor: "D9A441"}));
    }
    return stampFrame(blocks, width);
}

function buildDocumentXml(form: SzPrintForm, mode: SzPrintMode, logo: LogoImage | null): string {
    const signed = mode === "signed";
    const body: string[] = [];
    const base: RunStyle = {size: 12};
    const grey: RunStyle = {size: 10, color: GREY};

    // Бланк: логотип слева, название Банка справа, под ними линейка.
    const logoRun = logo
        ? `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${logo.cx}" cy="${logo.cy}"/><wp:docPr id="1" name="Логотип"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${logo.cx}" cy="${logo.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
        : run("Керемет Банк", {b: true, size: 14});
    const half = Math.round(CONTENT_W_TW / 2);
    body.push(table([[
        {blocks: [para(logoRun)], width: half},
        {blocks: [para(run("ОАО «КЕРЕМЕТ БАНК»", {size: 8, color: GREY}), {align: "right"})], width: CONTENT_W_TW - half},
    ]], {widths: [half, CONTENT_W_TW - half], borders: false, cellMargin: 0}));
    body.push(para("", {borderBottom: true, size: 4, after: 240}));

    // № и дата — справа.
    body.push(para(run(
        `${form.regNumber ? `№ ${form.regNumber}` : "без номера"}${form.registeredOn ? ` от ${formatPrintDate(form.registeredOn)}` : ""}`,
        {size: 10, color: GREY}), {align: "right", after: 200}));

    // Шапка: Кому / От / Дата / Тема.
    const addressee = [form.addresseeName ?? form.correspondentUnit ?? "—",
        form.addresseeName && form.correspondentUnit ? form.correspondentUnit : null].filter(Boolean).join(", ");
    const author = [form.authorName ?? "—", form.authorUnit].filter(Boolean).join(", ");
    const labelW = Math.round(24 * TW_PER_MM);
    const head: Array<[string, string, boolean]> = [
        ["Кому:", addressee, false],
        ["От:", author, false],
        ["Дата:", form.registeredOn ? formatPrintDate(form.registeredOn) : "—", false],
        ["Тема:", form.title, true],
    ];
    body.push(table(head.map(([label, value, bold]) => [
        {blocks: [para(run(label, {...base, b: true}))], width: labelW},
        {blocks: [para(run(value, {...base, b: bold}))], width: CONTENT_W_TW - labelW},
    ]), {widths: [labelW, CONTENT_W_TW - labelW], borders: false, cellMargin: 0}));

    // Реквизиты СЭД мелким.
    const details: Array<[string, string]> = [
        ["Вид записки", `${form.kind ?? "—"}${form.hrKind ? ` · ${form.hrKind}` : ""}`],
        ...(form.dueDate ? [["Срок исполнения", formatPrintDate(form.dueDate)] as [string, string]] : []),
        ...form.fields.map((f) => [f.label, f.value] as [string, string]),
    ];
    const detW = Math.round(38 * TW_PER_MM);
    body.push(para("", {size: 4, after: 120}));
    body.push(table(details.map(([label, value]) => [
        {blocks: [para(run(label, grey))], width: detW},
        {blocks: [para(run(value, grey))], width: CONTENT_W_TW - detW},
    ]), {widths: [detW, CONTENT_W_TW - detW], borders: false, cellMargin: 0}));
    body.push(para("", {size: 6, after: 160}));

    // Текст записки.
    if (form.body) body.push(...HtmlToOoxml.convert(form.body, CONTENT_W_TW, base));

    const sectionTitle = (text: string) =>
        para(run(text.toUpperCase(), {size: 9, b: true, color: GREY}), {before: 300, after: 60, keepNext: true});

    if (form.addresseeDecision) {
        body.push(sectionTitle("Решение адресата"));
        form.addresseeDecision.split(/\r?\n/).forEach((line) => body.push(para(run(line, base))));
        body.push(para(run(`${form.addresseeName ?? "—"}${form.addresseeDecisionAt ? `, ${formatPrintDate(form.addresseeDecisionAt)}` : ""}`, grey), {before: 60}));
    }

    if (form.executionResolution) {
        body.push(sectionTitle("Резолюция"));
        body.push(para(run(form.executionResolution, base)));
        form.assignments.forEach((a) => {
            const text = `${a.assigneeName ?? "—"} — ${a.text}${a.dueDate ? ` (до ${formatPrintDate(a.dueDate)})` : ""}${a.isPrimary ? " · ответственный" : ""}`;
            body.push(para(run("•", base) + TAB_RUN + run(text, base), {indent: 360, hanging: 360, before: 40}));
        });
    }

    // Лист согласования.
    body.push(para(run("ЛИСТ СОГЛАСОВАНИЯ", {size: 12, b: true}), {align: "center", before: 480, keepNext: true}));
    body.push(para(run(`${signed ? "с подписями ЭЦП" : "для подписи согласующими"}${form.regNumber ? ` · к служебной записке № ${form.regNumber}` : ""}`,
        {size: 9, i: true, color: GREY}), {align: "center", after: 120, keepNext: true}));

    const mm = (v: number) => Math.round(v * TW_PER_MM);
    const fixed = signed ? [8, 28, 25, 21, 60] : [8, 34, 30, 22, 38];
    const fixedSum = fixed.reduce((a, b) => a + b, 0);
    const positionW = CONTENT_W_TW - mm(fixedSum);
    const widths = [mm(fixed[0]), positionW, mm(fixed[1]), mm(fixed[2]), mm(fixed[3]), mm(fixed[4])];
    const th = (text: string, i: number): Cell => ({blocks: [para(run(text, {size: 9, b: true}))], width: widths[i], shade: "F6F8FB"});
    const cell = (blocks: string[], i: number): Cell => ({blocks, width: widths[i]});
    const small: RunStyle = {size: 9};

    const rows: Cell[][] = [["№", "Должность, подразделение", "ФИО", "Решение", "Дата", "Подпись"].map(th)];
    if (form.approvals.length === 0) {
        rows.push([{
            blocks: [para(run("Маршрут согласования не запускался", {size: 9, color: "8B97AB"}), {align: "center"})],
            width: CONTENT_W_TW,
            span: 6,
        }]);
    } else {
        form.approvals.forEach((a, i) => {
            rows.push([
                cell([para(run(String(i + 1), small))], 0),
                cell([para(run(a.position ?? "—", small)),
                    ...(a.unit ? [para(run(a.unit, {size: 9, color: GREY}))] : [])], 1),
                cell([para(run(a.userName ?? "—", small)),
                    // Этап подписания: участник подписывает записку, а не согласует.
                    ...(a.stepKind === "Signing" ? [para(run("подписант", {size: 8, color: GREY}))] : [])], 2),
                cell([
                    para(a.resolution
                        ? run(PRINT_RESOLUTION_LABEL[a.resolution] ?? a.resolution, {size: 9, b: true})
                        : run("Ожидает решения", {size: 9, color: LIGHT_GREY})),
                    ...(a.comment ? [para(run(a.comment, {size: 8, color: GREY}), {before: 20})] : []),
                ], 3),
                cell(a.resolvedAt
                    ? [para(run(formatPrintDate(a.resolvedAt), small)), para(run(formatPrintTime(a.resolvedAt), {size: 8, color: LIGHT_GREY}))]
                    : [para(run("—", {size: 9, color: LIGHT_GREY}))], 4),
                // Ячейка «Подпись» минус её поля — ширина рамки штампа.
                cell(signatureBlocks(a, mode, widths[5] - 2 * 57), 5),
            ]);
        });
    }
    body.push(table(rows, {widths, borders: true, header: true, rowHeight: signed ? undefined : mm(14), cellMargin: 57}));

    // Пояснения под листом.
    const note: RunStyle = {size: 8, i: true, color: LIGHT_GREY};
    if (signed) {
        const ecpCount = form.approvals.filter((a) => a.signature?.isEcp && !a.signature.revoked).length;
        const otherVersion = form.approvals.filter((a) => a.signature?.isEcp && a.signature.matchesCurrentContent === false).length;
        if (otherVersion > 0) {
            body.push(para(run(`Внимание: подписей ЭЦП под предыдущей версией текста записки — ${otherVersion}.`, {size: 8, b: true, color: "8A5A00"}), {before: 120}));
        } else if (ecpCount > 0) {
            body.push(para(run(`Подписей ЭЦП в листе: ${ecpCount}, все — под текущей версией текста записки.`, note), {before: 120}));
        }
        body.push(para(run("Подписи ЭЦП поставлены согласующими через облачную ЭЦП ГП «Инфоком» и проверены системой «Делосфера» у провайдера при сохранении резолюций. Хэш документа — SHA-256 подписанного содержимого: решения, текста резолюции и отпечатка записки (текст, реквизиты, вложения).", note), {before: 60}));
        if (form.contentDigest) {
            body.push(para(run(`Отпечаток текущего текста записки (SHA-256): ${form.contentDigest}`, {size: 7, color: LIGHT_GREY, font: "Consolas"}), {before: 40}));
        }
    } else {
        body.push(para(run(`Состояние на ${formatDateTime(new Date().toISOString())}. Решения и даты — из системы «Делосфера»; подписи согласующие ставят на бумаге.`, note), {before: 120}));
    }

    if (form.isPaperCarrier) {
        body.push(para(run("Записка ведётся на бумажном носителе. Оригинал подлежит возврату в дело.", {size: 9, color: GREY}), {before: 360}));
    }

    const sect = `<w:sectPr><w:pgSz w:w="${PAGE_W_TW}" w:h="${PAGE_H_TW}"/><w:pgMar w:top="${MARGIN_Y_TW}" w:right="${MARGIN_X_TW}" w:bottom="${MARGIN_Y_TW}" w:left="${MARGIN_X_TW}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`
        + `<w:body>${body.join("")}${sect}</w:body></w:document>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
    + `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ru-RU" w:eastAsia="ru-RU" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>`
    + `<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
    + `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`
    + `</w:styles>`;

interface LogoImage {
    data: ArrayBuffer;
    cx: number;
    cy: number;
}

/** Логотип бланка для Word: сам файл и размер (высота как на печатной форме — 7 мм). */
async function loadLogo(): Promise<LogoImage | null> {
    try {
        const response = await fetch(SZ_PRINT_LOGO_URL);
        if (!response.ok) return null;
        const data = await response.arrayBuffer();
        const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({w: img.naturalWidth, h: img.naturalHeight});
            img.onerror = reject;
            img.src = SZ_PRINT_LOGO_URL;
        });
        const EMU_PER_MM = 36000;
        const cy = Math.round(7 * EMU_PER_MM);
        const cx = Math.round(cy * (size.w / Math.max(1, size.h)));
        return {data, cx, cy};
    } catch {
        return null;
    }
}

export async function buildSzDocx(form: SzPrintForm, mode: SzPrintMode): Promise<Blob> {
    const logo = await loadLogo();
    const zip = new JSZip();

    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
        + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
        + `<Default Extension="xml" ContentType="application/xml"/>`
        + `<Default Extension="png" ContentType="image/png"/>`
        + `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`
        + `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`
        + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`
        + `</Types>`);

    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>`
        + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`
        + `</Relationships>`);

    const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
        + `<dc:title>${esc(form.title ?? "Служебная записка")}</dc:title>`
        + `<dc:subject>${esc(form.regNumber ?? "")}</dc:subject>`
        + `<dc:creator>${esc(form.authorName ?? "Делосфера")}</dc:creator>`
        + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>`
        + `</cp:coreProperties>`);

    zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
        + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
        + (logo ? `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>` : "")
        + `</Relationships>`);

    zip.file("word/styles.xml", STYLES_XML);
    zip.file("word/document.xml", buildDocumentXml(form, mode, logo));
    if (logo) zip.file("word/media/logo.png", logo.data);

    return zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

export async function downloadSzDocx(form: SzPrintForm, mode: SzPrintMode): Promise<void> {
    const blob = await buildSzDocx(form, mode);
    saveBlob(blob, szExportFileName(form, mode, "docx"));
}
