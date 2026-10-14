import {useEffect} from "react";
import {useTranslation} from "react-i18next";
import {EditorContent, useEditor, type Editor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {Color, FontFamily, FontSize, TextStyle} from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {Table, TableCell, TableHeader, TableRow} from "@tiptap/extension-table";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {
    AlignCenter, AlignJustify, AlignLeft, AlignRight,
    Bold, Italic, List, ListOrdered, Redo2,
    Strikethrough, Underline as UnderlineIcon, Undo2,
} from "lucide-react";

/**
 * Редактор текста документа.
 *
 * Текст записки — не заметка, а часть документа, который печатают и подписывают:
 * в нём бывают таблицы расчётов, выделенные условия, перечни. Обычное поле ввода
 * заставляло всё это или терять, или прикладывать отдельным файлом, и тогда
 * подписанным оказывался не текст, а вложение к нему.
 *
 * Размеченный текст меняет три вещи, и все три учтены снаружи: печатная форма
 * выводит разметку, поиск ищет по тексту без тегов, а отпечаток подписи считается
 * по содержимому карточки вместе с ней — правка форматирования тоже меняет
 * документ, и подпись под старой версией не должна выглядеть подписью под новой.
 */

interface Props {
    value: string;
    onChange: (html: string) => void;
    disabled?: boolean;

    /** Подпись над полем. */
    label?: string;

    placeholder?: string;
}

/** Шрифты, которые точно есть на рабочих местах банка. */
const FONT_FAMILIES = [
    {labelKey: "richTextEditor.fontSystem", label: "", value: ""},
    {labelKey: "", label: "Times New Roman", value: "'Times New Roman', Times, serif"},
    {labelKey: "", label: "Arial", value: "Arial, Helvetica, sans-serif"},
    {labelKey: "", label: "Calibri", value: "Calibri, Candara, sans-serif"},
    {labelKey: "", label: "Georgia", value: "Georgia, serif"},
    {labelKey: "", label: "Courier New", value: "'Courier New', Courier, monospace"},
];

const FONT_SIZES = ["", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px"];

export function RichTextEditor({value, onChange, disabled = false, label, placeholder}: Props) {
    const editor = useEditor({
        editable: !disabled,
        extensions: [
            StarterKit,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Underline,
            TextAlign.configure({types: ["heading", "paragraph"]}),

            // resizable даёт колонкам тянуться мышью: в таблице расчёта колонка
            // с суммой всегда шире колонки с номером, и подгонять её вручную
            // в разметке никто не станет.
            Table.configure({resizable: true}),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: value || "",
        onUpdate: ({editor}) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: "prose-sz outline-none min-h-[220px] px-3.5 py-3",
            },
        },
    });

    // Карточка перечитывается после действий — текст мог смениться снаружи.
    // Сравниваем перед установкой: setContent на каждый рендер сбрасывал бы курсор.
    useEffect(() => {
        // isDestroyed: при перезагрузке страницы/HMR/StrictMode эффект успевает увидеть уже
        // уничтоженный редактор — у него схема обнулена, и getHTML() падает (белый экран).
        if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
            editor.commands.setContent(value || "", {emitUpdate: false});
        }
    }, [value, editor]);

    useEffect(() => {
        if (editor && !editor.isDestroyed) editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    return (
        <div>
            {label && <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">{label}</span>}

            <div className={`rounded-[9px] border ${disabled ? "border-[#e5e9f0] bg-[#fafbfd]" : "border-[#e5e9f0] bg-white"}`}>
                {!disabled && <Toolbar editor={editor}/>}

                <EditorContent editor={editor} placeholder={placeholder}/>
            </div>

            <style>{`
                .prose-sz { font-size: 13.5px; line-height: 1.7; color: #1c2740; }
                .prose-sz p { margin: 0 0 8px; }
                .prose-sz p:last-child { margin-bottom: 0; }
                .prose-sz h1 { font-size: 19px; font-weight: 700; margin: 12px 0 8px; }
                .prose-sz h2 { font-size: 16px; font-weight: 700; margin: 12px 0 6px; }
                .prose-sz h3 { font-size: 14.5px; font-weight: 700; margin: 10px 0 6px; }
                .prose-sz ul, .prose-sz ol { margin: 0 0 8px; padding-left: 22px; }
                .prose-sz li { margin: 2px 0; }
                .prose-sz blockquote {
                    margin: 8px 0; padding-left: 12px;
                    border-left: 3px solid #e5e9f0; color: #55617a;
                }
                .prose-sz table {
                    border-collapse: collapse; width: 100%; margin: 10px 0;
                    table-layout: fixed; overflow: hidden;
                }
                .prose-sz th, .prose-sz td {
                    border: 1px solid #d6dded; padding: 6px 9px;
                    vertical-align: top; position: relative;
                }
                .prose-sz th { background: #f2f5fa; font-weight: 600; text-align: left; }
                .prose-sz .selectedCell:after {
                    content: ""; position: absolute; inset: 0;
                    background: rgba(47,104,245,0.12); pointer-events: none;
                }
                .prose-sz .column-resize-handle {
                    position: absolute; right: -2px; top: 0; bottom: 0; width: 4px;
                    background: #2f68f5; pointer-events: none;
                }
            `}</style>
        </div>
    );
}

// ── панель ───────────────────────────────────────────────────────────────────

const buttonClass = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-[6px] border-none cursor-pointer ${
        active ? "bg-[#eaf0ff] text-[#2f68f5]" : "bg-transparent text-[#55617a] hover:bg-[#f2f5fa]"}`;


function Toolbar({editor}: {editor: Editor}) {
    const {t} = useTranslation();

    /**
     * Действия над таблицей собраны в одном меню, а не разложены кнопками:
     * их восемь, и в панели они заняли бы больше места, чем всё остальное
     * форматирование вместе взятое.
     */
    const runTableAction = (action: string) => {
        const c = editor.chain().focus();

        switch (action) {
            case "insert": c.insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(); break;
            case "rowBefore": c.addRowBefore().run(); break;
            case "rowAfter": c.addRowAfter().run(); break;
            case "delRow": c.deleteRow().run(); break;
            case "colBefore": c.addColumnBefore().run(); break;
            case "colAfter": c.addColumnAfter().run(); break;
            case "delCol": c.deleteColumn().run(); break;
            case "merge": c.mergeOrSplit().run(); break;
            case "delTable": c.deleteTable().run(); break;
        }
    };

    const inTable = editor.isActive("table");

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#eef2f7] px-2 py-1.5">
            <div title={t("richTextEditor.font")}>
                <SelectDropdown
                    size="sm"
                    minWidth="150px"
                    value={editor.getAttributes("textStyle").fontFamily ?? ""}
                    options={FONT_FAMILIES.map((f) => ({value: f.value, label: f.labelKey ? t(f.labelKey) : f.label}))}
                    onChange={(v) => {
                        const c = editor.chain().focus();
                        v ? c.setFontFamily(v).run() : c.unsetFontFamily().run();
                    }}
                />
            </div>

            <div title={t("richTextEditor.size")}>
                <SelectDropdown
                    size="sm"
                    minWidth="80px"
                    value={editor.getAttributes("textStyle").fontSize ?? ""}
                    options={FONT_SIZES.map((s) => ({
                        value: s,
                        label: s ? s.replace("px", "") : t("richTextEditor.sizeDefault"),
                    }))}
                    onChange={(v) => {
                        const c = editor.chain().focus();
                        v ? c.setFontSize(v).run() : c.unsetFontSize().run();
                    }}
                />
            </div>

            <div title={t("richTextEditor.paragraphStyle")}>
                <SelectDropdown
                    size="sm"
                    minWidth="120px"
                    value={
                        editor.isActive("heading", {level: 1}) ? "h1"
                        : editor.isActive("heading", {level: 2}) ? "h2"
                        : editor.isActive("heading", {level: 3}) ? "h3"
                        : "p"
                    }
                    options={[
                        {value: "p", label: t("richTextEditor.paragraph")},
                        {value: "h1", label: t("richTextEditor.heading1")},
                        {value: "h2", label: t("richTextEditor.heading2")},
                        {value: "h3", label: t("richTextEditor.heading3")},
                    ]}
                    onChange={(v) => {
                        const c = editor.chain().focus();
                        v === "p"
                            ? c.setParagraph().run()
                            : c.toggleHeading({level: Number(v.slice(1)) as 1 | 2 | 3}).run();
                    }}
                />
            </div>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title={t("richTextEditor.bold")} className={buttonClass(editor.isActive("bold"))}
                    onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.italic")} className={buttonClass(editor.isActive("italic"))}
                    onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.underline")} className={buttonClass(editor.isActive("underline"))}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.strike")} className={buttonClass(editor.isActive("strike"))}
                    onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title={t("richTextEditor.bulletList")} className={buttonClass(editor.isActive("bulletList"))}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.orderedList")} className={buttonClass(editor.isActive("orderedList"))}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title={t("richTextEditor.alignLeft")} className={buttonClass(editor.isActive({textAlign: "left"}))}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                <AlignLeft size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.alignCenter")} className={buttonClass(editor.isActive({textAlign: "center"}))}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                <AlignCenter size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.alignRight")} className={buttonClass(editor.isActive({textAlign: "right"}))}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                <AlignRight size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.alignJustify")} className={buttonClass(editor.isActive({textAlign: "justify"}))}
                    onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
                <AlignJustify size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <div title={t("richTextEditor.table")}>
                <SelectDropdown
                    size="sm"
                    minWidth="190px"
                    active={inTable}
                    value=""
                    placeholder={t("richTextEditor.table")}
                    options={[
                        {value: "insert", label: t("richTextEditor.tableInsert")},
                        ...(inTable ? [
                            {value: "rowAfter", label: t("richTextEditor.tableRowAfter")},
                            {value: "rowBefore", label: t("richTextEditor.tableRowBefore")},
                            {value: "delRow", label: t("richTextEditor.tableDelRow")},
                            {value: "colAfter", label: t("richTextEditor.tableColAfter")},
                            {value: "colBefore", label: t("richTextEditor.tableColBefore")},
                            {value: "delCol", label: t("richTextEditor.tableDelCol")},
                            {value: "merge", label: t("richTextEditor.tableMerge")},
                            {value: "delTable", label: t("richTextEditor.tableDelTable")},
                        ] : []),
                    ]}
                    onChange={runTableAction}
                />
            </div>

            <span className="flex-1"/>

            <button type="button" title={t("richTextEditor.undo")} className={buttonClass(false)}
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title={t("richTextEditor.redo")} className={buttonClass(false)}
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 size={14} strokeWidth={2.5}/>
            </button>
        </div>
    );
}
