// Общий разбор OOXML (word/document.xml + styles.xml + numbering.xml) для панели "Содержание"
// (docxHeadings.ts) и автоформирования строк ТИД (docxParagraphs.ts).
//
// ⚠ 06.10.2026: раньше каждый из них читал только текст w:t абзаца и стиль абзаца "как есть" —
// из-за этого:
//  - номер автонумерации Word ("1.", "1.1.", "а)" — список, привязанный к стилю "Заголовок N"
//    или к абзацу) в текст не попадал вообще: в одной редакции "1. Общие положения" набрано
//    текстом, в другой — тот же заголовок стилем с автонумерацией, и ТИД видел в них разные строки;
//  - "все прописные" (w:caps) из стиля не учитывались — "ОБЩИЕ ПОЛОЖЕНИЯ" против "Общие положения";
//  - скрытый текст (w:vanish, в т.ч. метки структуры isrib) попадал в сравнение;
//  - абзацы надписей (text box) считались дважды — Word пишет их и в mc:Choice (DrawingML), и в
//    mc:Fallback (VML); docx-preview рисует только Fallback.
// Здесь всё это вычисляется один раз, по правилам Word, для обоих потребителей.
import JSZip from "jszip";

/** OOXML-элементы всегда с префиксом "w:" в документах, реально созданных Word — но на всякий
 * случай (нестандартный экспорт без префикса) падаем на бестпрефиксный тег. */
export function elementsByAnyTag(root: Document | Element, localName: string): Element[] {
    const prefixed = root.getElementsByTagName(`w:${localName}`);
    if (prefixed.length > 0) return Array.from(prefixed);
    return Array.from(root.getElementsByTagName(localName));
}

export function directChild(parent: Element | null | undefined, localName: string): Element | null {
    if (!parent) return null;
    for (const child of Array.from(parent.children)) {
        if (child.tagName === `w:${localName}` || child.tagName === localName) return child;
    }
    return null;
}

export function attr(el: Element | null | undefined, name: string): string | null {
    if (!el) return null;
    return el.getAttribute(`w:${name}`) ?? el.getAttribute(name);
}

function localNameOf(el: Element): string {
    const idx = el.tagName.indexOf(":");
    return idx >= 0 ? el.tagName.slice(idx + 1) : el.tagName;
}

/** Значение "включённого" булева свойства OOXML (w:b, w:caps, w:vanish ...): элемент без w:val
 * или с val="1"/"true"/"on" — включено, val="0"/"false"/"off" — явно выключено. */
function toggleValue(el: Element | null): boolean | undefined {
    if (!el) return undefined;
    const v = attr(el, "val");
    if (v === null) return true;
    return !(v === "0" || v === "false" || v === "off");
}

// ─── Стили ──────────────────────────────────────────────────────────────────────────────────

export interface RunFormat {
    bold?: boolean;
    caps?: boolean;
    vanish?: boolean;
}

interface RawStyle {
    id: string;
    type: string;
    name: string;
    basedOn: string | null;
    numId: string | null;
    ilvl: number | null;
    /** outlineLvl, заданный в самом стиле (0..9; 9 — "основной текст") */
    outlineLvl: number | null;
    jc: string | null;
    run: RunFormat;
}

export interface ResolvedParagraphStyle {
    id: string;
    name: string;
    /** numId/ilvl по цепочке basedOn ("0" — нумерация явно снята) */
    numId: string | null;
    ilvl: number | null;
    outlineLvl: number | null;
    jc: string | null;
    run: RunFormat;
}

function parseRunFormat(rPr: Element | null): RunFormat {
    if (!rPr) return {};
    return {
        bold: toggleValue(directChild(rPr, "b")),
        caps: toggleValue(directChild(rPr, "caps")),
        vanish: toggleValue(directChild(rPr, "vanish")),
    };
}

function mergeRun(base: RunFormat, over: RunFormat): RunFormat {
    return {
        bold: over.bold ?? base.bold,
        caps: over.caps ?? base.caps,
        vanish: over.vanish ?? base.vanish,
    };
}

export class DocxStyles {
    private raw = new Map<string, RawStyle>();
    private resolvedCache = new Map<string, ResolvedParagraphStyle>();
    private runCache = new Map<string, RunFormat>();
    /** styleId абзацного стиля по умолчанию ("Обычный"/Normal) */
    readonly defaultParagraphStyleId: string | null;
    /** Значения по умолчанию документа (w:docDefaults/w:rPrDefault) */
    private readonly docDefaultsRun: RunFormat;

    constructor(stylesXml: Document | null) {
        let defaultId: string | null = null;
        let docDefaultsRun: RunFormat = {};
        if (stylesXml) {
            const rPrDefault = elementsByAnyTag(stylesXml, "rPrDefault")[0];
            if (rPrDefault) docDefaultsRun = parseRunFormat(directChild(rPrDefault, "rPr"));

            for (const styleEl of elementsByAnyTag(stylesXml, "style")) {
                const id = attr(styleEl, "styleId");
                if (!id) continue;
                const type = attr(styleEl, "type") ?? "paragraph";
                const pPr = directChild(styleEl, "pPr");
                const numPr = directChild(pPr, "numPr");
                const ilvlVal = attr(directChild(numPr, "ilvl"), "val");
                const outlineVal = attr(directChild(pPr, "outlineLvl"), "val");
                const style: RawStyle = {
                    id,
                    type,
                    name: (attr(directChild(styleEl, "name"), "val") ?? "").trim(),
                    basedOn: attr(directChild(styleEl, "basedOn"), "val"),
                    numId: attr(directChild(numPr, "numId"), "val"),
                    ilvl: ilvlVal !== null ? parseInt(ilvlVal, 10) : null,
                    outlineLvl: outlineVal !== null ? parseInt(outlineVal, 10) : null,
                    jc: attr(directChild(pPr, "jc"), "val"),
                    run: parseRunFormat(directChild(styleEl, "rPr")),
                };
                this.raw.set(id, style);
                const isDefault = attr(styleEl, "default");
                if (type === "paragraph" && (isDefault === "1" || isDefault === "true")) defaultId = id;
            }
        }
        this.defaultParagraphStyleId = defaultId;
        this.docDefaultsRun = docDefaultsRun;
    }

    /** Имя стиля (w:name), как оно записано в styles.xml */
    rawStyle(styleId: string): RawStyle | undefined {
        return this.raw.get(styleId);
    }

    /** Все абзацные стили документа (для разбора уровней заголовков). */
    paragraphStyleIds(): string[] {
        return Array.from(this.raw.values()).filter((s) => s.type === "paragraph").map((s) => s.id);
    }

    /** Цепочка basedOn от самого стиля к корню (без циклов). */
    chain(styleId: string): RawStyle[] {
        const result: RawStyle[] = [];
        const seen = new Set<string>();
        let cur: string | null = styleId;
        while (cur && !seen.has(cur) && result.length < 20) {
            seen.add(cur);
            const s = this.raw.get(cur);
            if (!s) break;
            result.push(s);
            cur = s.basedOn;
        }
        return result;
    }

    paragraphStyle(styleId: string | null): ResolvedParagraphStyle | null {
        const id = styleId ?? this.defaultParagraphStyleId;
        if (!id) return null;
        const cached = this.resolvedCache.get(id);
        if (cached) return cached;

        const chain = this.chain(id);
        let numId: string | null = null;
        let ilvl: number | null = null;
        let outlineLvl: number | null = null;
        let jc: string | null = null;
        let run: RunFormat = {};
        // от корня к самому стилю — более близкий стиль переопределяет
        for (let i = chain.length - 1; i >= 0; i--) {
            const s = chain[i];
            if (s.numId !== null) {
                numId = s.numId;
                ilvl = s.ilvl;
            } else if (s.ilvl !== null) {
                ilvl = s.ilvl;
            }
            if (s.outlineLvl !== null) outlineLvl = s.outlineLvl;
            if (s.jc !== null) jc = s.jc;
            run = mergeRun(run, s.run);
        }
        const resolved: ResolvedParagraphStyle = {
            id,
            name: chain[0]?.name ?? "",
            numId, ilvl, outlineLvl, jc, run,
        };
        this.resolvedCache.set(id, resolved);
        return resolved;
    }

    /** Форматирование символьного стиля (w:rStyle) по цепочке basedOn. */
    characterStyleRun(styleId: string | null): RunFormat {
        if (!styleId) return {};
        const cached = this.runCache.get(styleId);
        if (cached) return cached;
        const chain = this.chain(styleId);
        let run: RunFormat = {};
        for (let i = chain.length - 1; i >= 0; i--) run = mergeRun(run, chain[i].run);
        this.runCache.set(styleId, run);
        return run;
    }

    /** Итоговое форматирование прогона: docDefaults → стиль абзаца → символьный стиль → прямое. */
    effectiveRun(paragraphStyle: ResolvedParagraphStyle | null, rPr: Element | null): RunFormat {
        let run = this.docDefaultsRun;
        if (paragraphStyle) run = mergeRun(run, paragraphStyle.run);
        run = mergeRun(run, this.characterStyleRun(attr(directChild(rPr, "rStyle"), "val")));
        return mergeRun(run, parseRunFormat(rPr));
    }
}

// ─── Нумерация ──────────────────────────────────────────────────────────────────────────────

interface NumLevel {
    start: number;
    numFmt: string;
    lvlText: string;
    isLgl: boolean;
    /** w:pStyle внутри w:lvl — стиль, к которому привязан этот уровень (Заголовок N) */
    pStyle: string | null;
}

interface AbstractNum {
    id: string;
    levels: Map<number, NumLevel>;
    numStyleLink: string | null;
    styleLink: string | null;
}

interface NumInstance {
    abstractId: string;
    startOverrides: Map<number, number>;
    levelOverrides: Map<number, NumLevel>;
}

function parseNumLevel(lvl: Element): NumLevel {
    const startVal = attr(directChild(lvl, "start"), "val");
    return {
        start: startVal !== null ? parseInt(startVal, 10) : 0,
        numFmt: attr(directChild(lvl, "numFmt"), "val") ?? "decimal",
        lvlText: attr(directChild(lvl, "lvlText"), "val") ?? "",
        isLgl: !!directChild(lvl, "isLgl"),
        pStyle: attr(directChild(lvl, "pStyle"), "val"),
    };
}

const RUSSIAN_LETTERS = "абвгдежзиклмнопрстуфхцчшщэюя";

function toLetters(n: number, alphabet: string): string {
    if (n <= 0) return "";
    const len = alphabet.length;
    // как в Word: a..z, aa..zz, aaa..
    const repeat = Math.floor((n - 1) / len) + 1;
    const ch = alphabet[(n - 1) % len];
    return ch.repeat(repeat);
}

function toRoman(n: number): string {
    if (n <= 0 || n >= 4000) return String(n);
    const map: [number, string][] = [
        [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
        [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
    ];
    let res = "";
    for (const [v, s] of map) {
        while (n >= v) {
            res += s;
            n -= v;
        }
    }
    return res;
}

function formatNumber(n: number, fmt: string): string {
    switch (fmt) {
        case "decimalZero":
            return n < 10 ? `0${n}` : String(n);
        case "lowerLetter":
            return toLetters(n, "abcdefghijklmnopqrstuvwxyz");
        case "upperLetter":
            return toLetters(n, "abcdefghijklmnopqrstuvwxyz").toUpperCase();
        case "lowerRoman":
            return toRoman(n);
        case "upperRoman":
            return toRoman(n).toUpperCase();
        case "russianLower":
            return toLetters(n, RUSSIAN_LETTERS);
        case "russianUpper":
            return toLetters(n, RUSSIAN_LETTERS).toUpperCase();
        case "none":
            return "";
        default:
            return String(n);
    }
}

export interface ParagraphNumbering {
    /** Видимый номер абзаца, как его показывает Word ("1.", "1.2.", "а)"); null — маркер/без номера */
    label: string | null;
    /** Уровень списка (ilvl, 0..8) */
    ilvl: number;
}

/** Повторяет счётчики нумерации Word по ходу документа. Абзацы нужно передавать строго в порядке
 * документа (в т.ч. абзацы таблиц — у Word они тоже двигают счётчик). */
export class DocxNumbering {
    private abstracts = new Map<string, AbstractNum>();
    private nums = new Map<string, NumInstance>();
    private counters = new Map<string, (number | undefined)[]>();
    private startedOverrideNums = new Set<string>();
    private readonly styles: DocxStyles;

    constructor(numberingXml: Document | null, styles: DocxStyles) {
        this.styles = styles;
        if (!numberingXml) return;
        for (const absEl of elementsByAnyTag(numberingXml, "abstractNum")) {
            const id = attr(absEl, "abstractNumId");
            if (id === null) continue;
            const levels = new Map<number, NumLevel>();
            for (const lvl of Array.from(absEl.children).filter((c) => localNameOf(c) === "lvl")) {
                const ilvl = parseInt(attr(lvl, "ilvl") ?? "0", 10);
                levels.set(ilvl, parseNumLevel(lvl));
            }
            this.abstracts.set(id, {
                id,
                levels,
                numStyleLink: attr(directChild(absEl, "numStyleLink"), "val"),
                styleLink: attr(directChild(absEl, "styleLink"), "val"),
            });
        }
        for (const numEl of Array.from(numberingXml.documentElement.children).filter((c) => localNameOf(c) === "num")) {
            const numId = attr(numEl, "numId");
            const abstractId = attr(directChild(numEl, "abstractNumId"), "val");
            if (numId === null || abstractId === null) continue;
            const startOverrides = new Map<number, number>();
            const levelOverrides = new Map<number, NumLevel>();
            for (const ov of Array.from(numEl.children).filter((c) => localNameOf(c) === "lvlOverride")) {
                const ilvl = parseInt(attr(ov, "ilvl") ?? "0", 10);
                const so = attr(directChild(ov, "startOverride"), "val");
                if (so !== null) startOverrides.set(ilvl, parseInt(so, 10));
                const lvl = directChild(ov, "lvl");
                if (lvl) levelOverrides.set(ilvl, parseNumLevel(lvl));
            }
            this.nums.set(numId, {abstractId, startOverrides, levelOverrides});
        }
    }

    /** abstractNum c учётом numStyleLink (список, определённый через стиль списка). */
    private resolveAbstract(abstractId: string, depth = 0): AbstractNum | undefined {
        const abs = this.abstracts.get(abstractId);
        if (!abs || depth > 5) return abs;
        if (abs.levels.size === 0 && abs.numStyleLink) {
            const linkStyle = this.styles.paragraphStyle(abs.numStyleLink);
            const linkedNum = linkStyle?.numId ? this.nums.get(linkStyle.numId) : undefined;
            if (linkedNum) return this.resolveAbstract(linkedNum.abstractId, depth + 1) ?? abs;
        }
        return abs;
    }

    private levelOf(num: NumInstance, ilvl: number): NumLevel | undefined {
        return num.levelOverrides.get(ilvl) ?? this.resolveAbstract(num.abstractId)?.levels.get(ilvl);
    }

    /** numId/ilvl абзаца: прямое w:numPr абзаца, иначе — из стиля (ilvl для стиля — из w:lvl/w:pStyle
     * списка, как это делает Word для "Заголовок N" многоуровневого списка). */
    resolveParagraphNum(pPr: Element | null, style: ResolvedParagraphStyle | null): {numId: string; ilvl: number} | null {
        const numPr = directChild(pPr, "numPr");
        let numId = attr(directChild(numPr, "numId"), "val");
        const directIlvl = attr(directChild(numPr, "ilvl"), "val");
        let ilvl: number | null = directIlvl !== null ? parseInt(directIlvl, 10) : null;

        if (numId === null) numId = style?.numId ?? null;
        if (numId === null || numId === "0") return null;
        const num = this.nums.get(numId);
        if (!num) return null;

        if (ilvl === null) ilvl = style?.ilvl ?? null;
        if (ilvl === null && style) {
            const abs = this.resolveAbstract(num.abstractId);
            for (const [lvlIdx, lvl] of abs?.levels ?? []) {
                if (lvl.pStyle === style.id) {
                    ilvl = lvlIdx;
                    break;
                }
            }
        }
        return {numId, ilvl: ilvl ?? 0};
    }

    /** Двигает счётчик для абзаца и возвращает его номер. Вызывать для каждого абзаца по порядку. */
    next(pPr: Element | null, style: ResolvedParagraphStyle | null): ParagraphNumbering | null {
        const resolved = this.resolveParagraphNum(pPr, style);
        if (!resolved) return null;
        const {numId, ilvl} = resolved;
        const num = this.nums.get(numId)!;
        const level = this.levelOf(num, ilvl);
        if (!level) return null;

        // Word ведёт один общий счётчик на abstractNum: разные w:num одного абстрактного списка
        // продолжают нумерацию друг друга, если только у w:num нет startOverride ("Начать заново").
        const hasOverrides = num.startOverrides.size > 0;
        const key = hasOverrides ? `num:${numId}` : `abs:${num.abstractId}`;
        let counts = this.counters.get(key);
        if (!counts) {
            counts = new Array(9).fill(undefined);
            this.counters.set(key, counts);
        }
        if (hasOverrides && !this.startedOverrideNums.has(numId)) {
            this.startedOverrideNums.add(numId);
            counts.fill(undefined);
        }

        const startOf = (lvlIdx: number): number => {
            const ov = num.startOverrides.get(lvlIdx);
            if (ov !== undefined) return ov;
            return this.levelOf(num, lvlIdx)?.start ?? 1;
        };

        counts[ilvl] = counts[ilvl] === undefined ? startOf(ilvl) : counts[ilvl]! + 1;
        for (let i = ilvl + 1; i < counts.length; i++) counts[i] = undefined;
        for (let i = 0; i < ilvl; i++) if (counts[i] === undefined) counts[i] = startOf(i);

        if (level.numFmt === "bullet") return {label: null, ilvl};

        const label = level.lvlText.replace(/%(\d)/g, (_m, d: string) => {
            const idx = parseInt(d, 10) - 1;
            const lvl = this.levelOf(num, idx);
            const value = counts![idx] ?? startOf(idx);
            const fmt = level.isLgl ? "decimal" : (lvl?.numFmt ?? "decimal");
            return formatNumber(value, fmt);
        }).trim();
        return {label: label || null, ilvl};
    }
}

// ─── Абзацы документа ───────────────────────────────────────────────────────────────────────

export interface DocxParagraphInfo {
    el: Element;
    pPr: Element | null;
    /** styleId из w:pStyle (null — стиль по умолчанию) */
    styleId: string | null;
    style: ResolvedParagraphStyle | null;
    /** Видимый текст абзаца — без скрытого (w:vanish) текста, с учётом "все прописные" (w:caps) */
    visibleText: string;
    /** Текст всех w:t абзаца как есть (включая скрытый) — так его видит textContent в docx-preview */
    rawText: string;
    numbering: ParagraphNumbering | null;
    /** Все видимые непустые прогоны абзаца полужирные */
    allBold: boolean;
    /** Весь видимый текст набран/оформлен прописными */
    allCaps: boolean;
    /** Весь абзац скрыт (w:vanish у всех прогонов с текстом) */
    hidden: boolean;
    /** Абзац внутри таблицы */
    inTable: boolean;
    /** Прямой w:outlineLvl абзаца (0..9), если задан */
    directOutlineLvl: number | null;
    jc: string | null;
}

export interface DocxParsed {
    documentXml: Document;
    styles: DocxStyles;
    numbering: DocxNumbering;
}

export async function loadDocx(blob: Blob): Promise<DocxParsed | null> {
    const zip = await JSZip.loadAsync(blob);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) return null;
    const parser = new DOMParser();
    const parse = async (name: string): Promise<Document | null> => {
        const entry = zip.file(name);
        return entry ? parser.parseFromString(await entry.async("text"), "application/xml") : null;
    };
    const documentXml = parser.parseFromString(await documentEntry.async("text"), "application/xml");
    const styles = new DocxStyles(await parse("word/styles.xml"));
    const numbering = new DocxNumbering(await parse("word/numbering.xml"), styles);
    return {documentXml, styles, numbering};
}

function hasAncestor(el: Element, localNames: string[]): boolean {
    let cur = el.parentElement;
    while (cur) {
        if (localNames.includes(localNameOf(cur))) return true;
        cur = cur.parentElement;
    }
    return false;
}

/** Нормализация пробелов: табы/неразрывные/множественные пробелы — в один обычный пробел. */
export function normalizeSpaces(text: string): string {
    return text.replace(/[\t   \s]+/g, " ").trim();
}

/** Ключ для сопоставления текста абзаца из XML с textContent узла docx-preview: без любых
 * пробельных символов и без учёта регистра. */
export function textMatchKey(text: string): string {
    return text.replace(/[\s ​]+/g, "").toLowerCase();
}

/** Все абзацы тела документа в порядке документа (как их рисует docx-preview): без дублей
 * надписей из mc:Choice. Номера автонумерации считаются по ходу. */
export function collectParagraphs(parsed: DocxParsed): DocxParagraphInfo[] {
    const {documentXml, styles, numbering} = parsed;
    const result: DocxParagraphInfo[] = [];

    for (const p of elementsByAnyTag(documentXml, "p")) {
        if (hasAncestor(p, ["Choice"])) continue;

        const pPr = directChild(p, "pPr");
        const styleId = attr(directChild(pPr, "pStyle"), "val");
        const style = styles.paragraphStyle(styleId);

        let visible = "";
        let raw = "";
        let anyVisibleText = false;
        let allBold = true;
        let allCapsFormat = true;

        for (const r of elementsByAnyTag(p, "r")) {
            // прогоны вложенных абзацев (надписи внутри абзаца) обрабатываются как отдельные абзацы
            let owner = r.parentElement;
            while (owner && localNameOf(owner) !== "p") owner = owner.parentElement;
            if (owner !== p) continue;
            if (hasAncestor(r, ["Choice"]) && !hasAncestor(p, ["Choice"])) continue;

            const fmt = styles.effectiveRun(style, directChild(r, "rPr"));
            let runText = "";
            for (const child of Array.from(r.children)) {
                const ln = localNameOf(child);
                if (ln === "t") runText += child.textContent ?? "";
                else if (ln === "tab") runText += "\t";
                else if (ln === "br" || ln === "cr") runText += " ";
                else if (ln === "noBreakHyphen") runText += "-";
            }
            if (!runText) continue;
            raw += runText.replace(/\t/g, " ");
            if (fmt.vanish) continue;
            visible += fmt.caps ? runText.toUpperCase() : runText;
            if (runText.trim()) {
                anyVisibleText = true;
                if (!fmt.bold) allBold = false;
                if (!fmt.caps) allCapsFormat = false;
            }
        }

        const visibleText = normalizeSpaces(visible);
        const letters = visibleText.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
        const allCaps = anyVisibleText && letters.length > 0 && (allCapsFormat || letters === letters.toUpperCase());
        const outlineVal = attr(directChild(pPr, "outlineLvl"), "val");

        result.push({
            el: p,
            pPr,
            styleId,
            style,
            visibleText,
            rawText: normalizeSpaces(raw),
            numbering: numbering.next(pPr, style),
            allBold: anyVisibleText && allBold,
            allCaps,
            hidden: !anyVisibleText && raw.trim().length > 0,
            inTable: hasAncestor(p, ["tc"]),
            directOutlineLvl: outlineVal !== null ? parseInt(outlineVal, 10) : null,
            jc: attr(directChild(pPr, "jc"), "val") ?? style?.jc ?? null,
        });
    }
    return result;
}

/** Текст абзаца так, как его видит читатель Word: номер автонумерации + видимый текст. */
export function displayText(p: DocxParagraphInfo): string {
    const label = p.numbering?.label;
    if (!label) return p.visibleText;
    return p.visibleText ? `${label} ${p.visibleText}` : label;
}
