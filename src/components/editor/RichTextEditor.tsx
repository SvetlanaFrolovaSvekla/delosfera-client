import {useEffect} from "react";
import {EditorContent, useEditor, type Editor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {Color, FontFamily, FontSize, TextStyle} from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {Table, TableCell, TableHeader, TableRow} from "@tiptap/extension-table";
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
const ШРИФТЫ = [
    {label: "Как в системе", value: ""},
    {label: "Times New Roman", value: "'Times New Roman', Times, serif"},
    {label: "Arial", value: "Arial, Helvetica, sans-serif"},
    {label: "Calibri", value: "Calibri, Candara, sans-serif"},
    {label: "Georgia", value: "Georgia, serif"},
    {label: "Courier New", value: "'Courier New', Courier, monospace"},
];

const РАЗМЕРЫ = ["", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px"];

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
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || "", {emitUpdate: false});
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    return (
        <div>
            {label && <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">{label}</span>}

            <div className={`rounded-[9px] border ${disabled ? "border-[#e5e9f0] bg-[#fafbfd]" : "border-[#e5e9f0] bg-white"}`}>
                {!disabled && <Панель editor={editor}/>}

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

const кнопка = (активна: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-[6px] border-none cursor-pointer ${
        активна ? "bg-[#eaf0ff] text-[#2f68f5]" : "bg-transparent text-[#55617a] hover:bg-[#f2f5fa]"}`;

const селект =
    "h-7 rounded-[6px] border border-[#e5e9f0] bg-white px-1.5 text-[11.5px] text-[#55617a] outline-none";

function Панель({editor}: {editor: Editor}) {
    /**
     * Действия над таблицей собраны в одном меню, а не разложены кнопками:
     * их восемь, и в панели они заняли бы больше места, чем всё остальное
     * форматирование вместе взятое.
     */
    const таблица = (действие: string) => {
        const c = editor.chain().focus();

        switch (действие) {
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

    const вТаблице = editor.isActive("table");

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#eef2f7] px-2 py-1.5">
            <select className={селект} title="Шрифт"
                    value={editor.getAttributes("textStyle").fontFamily ?? ""}
                    onChange={(e) => {
                        const v = e.target.value;
                        const c = editor.chain().focus();
                        v ? c.setFontFamily(v).run() : c.unsetFontFamily().run();
                    }}>
                {ШРИФТЫ.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>

            <select className={селект} title="Размер"
                    value={editor.getAttributes("textStyle").fontSize ?? ""}
                    onChange={(e) => {
                        const v = e.target.value;
                        const c = editor.chain().focus();
                        v ? c.setFontSize(v).run() : c.unsetFontSize().run();
                    }}>
                {РАЗМЕРЫ.map((s) => (
                    <option key={s || "default"} value={s}>{s ? s.replace("px", "") : "размер"}</option>
                ))}
            </select>

            <select className={селект} title="Стиль абзаца"
                    value={
                        editor.isActive("heading", {level: 1}) ? "h1"
                        : editor.isActive("heading", {level: 2}) ? "h2"
                        : editor.isActive("heading", {level: 3}) ? "h3"
                        : "p"
                    }
                    onChange={(e) => {
                        const c = editor.chain().focus();
                        const v = e.target.value;
                        v === "p"
                            ? c.setParagraph().run()
                            : c.toggleHeading({level: Number(v.slice(1)) as 1 | 2 | 3}).run();
                    }}>
                <option value="p">Обычный</option>
                <option value="h1">Заголовок 1</option>
                <option value="h2">Заголовок 2</option>
                <option value="h3">Заголовок 3</option>
            </select>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title="Жирный" className={кнопка(editor.isActive("bold"))}
                    onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="Курсив" className={кнопка(editor.isActive("italic"))}
                    onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="Подчёркнутый" className={кнопка(editor.isActive("underline"))}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="Зачёркнутый" className={кнопка(editor.isActive("strike"))}
                    onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title="Маркированный список" className={кнопка(editor.isActive("bulletList"))}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="Нумерованный список" className={кнопка(editor.isActive("orderedList"))}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <button type="button" title="По левому краю" className={кнопка(editor.isActive({textAlign: "left"}))}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                <AlignLeft size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="По центру" className={кнопка(editor.isActive({textAlign: "center"}))}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                <AlignCenter size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="По правому краю" className={кнопка(editor.isActive({textAlign: "right"}))}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                <AlignRight size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="По ширине" className={кнопка(editor.isActive({textAlign: "justify"}))}
                    onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
                <AlignJustify size={14} strokeWidth={2.5}/>
            </button>

            <span className="mx-0.5 h-5 w-px bg-[#eef2f7]"/>

            <select className={`${селект} ${вТаблице ? "border-[#cbddff] text-[#2f68f5]" : ""}`}
                    title="Таблица" value=""
                    onChange={(e) => {
                        таблица(e.target.value);
                        e.target.value = "";
                    }}>
                <option value="">Таблица</option>
                <option value="insert">Вставить 3×3</option>
                {вТаблице && (
                    <>
                        <option value="rowAfter">Строка ниже</option>
                        <option value="rowBefore">Строка выше</option>
                        <option value="delRow">Удалить строку</option>
                        <option value="colAfter">Столбец справа</option>
                        <option value="colBefore">Столбец слева</option>
                        <option value="delCol">Удалить столбец</option>
                        <option value="merge">Объединить или разделить</option>
                        <option value="delTable">Удалить таблицу</option>
                    </>
                )}
            </select>

            <span className="flex-1"/>

            <button type="button" title="Отменить" className={кнопка(false)}
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 size={14} strokeWidth={2.5}/>
            </button>
            <button type="button" title="Повторить" className={кнопка(false)}
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 size={14} strokeWidth={2.5}/>
            </button>
        </div>
    );
}
