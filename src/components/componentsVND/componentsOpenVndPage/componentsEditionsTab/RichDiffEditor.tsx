// Редактируемая ("rich text") ячейка для таблицы изменений ТИД (см. TidChangesTable) —
// в отличие от обычного textarea, поддерживает частичную покраску текста (красным/зелёным),
// как в подсветке различий редакций, но именно цветом текста, а не подсветкой фона/зачёркиванием.
// Автоматически сформированный текст (из diff) можно свободно редактировать; выделив кусок текста
// и нажав кнопку над полем — он тоже красится нужным цветом. Это касается и черновых полей формы
// "Добавить строку" — до добавления строки в таблицу текст там так же можно писать и красить.
import {useEffect, useRef} from "react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

// Обычный текстовый цвет приложения ("чёрный" в терминах кнопок покраски) - на случай, если
// нужно вернуть кусок ранее покрашенного текста обратно к обычному цвету.
const BLACK_COLOR = "#1c2740";

interface RichDiffEditorProps {
    /** HTML начального содержимого (напр. авто-diff, уже с покрашенными <span>) — применяется
     * только один раз при монтировании; дальше содержимое полностью под контролем
     * contentEditable, чтобы не сбрасывать курсор/правки пользователя при ре-рендерах. */
    initialHtml?: string;
    placeholder?: string;
    /** Цвет, которым красится выделенный текст по нажатию кнопки - разный для колонок
     * "Действующая"/"Новая редакция" (красный/зелёный). */
    highlightColor: string;
    /** Подпись кнопки покраски, напр. "Красным" / "Зелёным". */
    highlightLabel: string;
    disabled?: boolean;
    /** Фиксированная высота блока (с прокруткой внутри, если текст не помещается) - чтобы одна
     * длинная строка не растягивала всю таблицу. */
    heightClass?: string;
    /** Вызывается при любом изменении содержимого - для черновых полей формы "Добавить строку",
     * чтобы проверять "есть ли текст" и сохранить итоговый HTML при добавлении строки. */
    onChangeText?: (plainText: string, html: string) => void;
}

/** Красит текущее выделение внутри root в цвет color. Возвращает false, если выделять нечего
 * (пустое выделение или оно вне этого поля). */
function applyColorToSelection(root: HTMLElement, color: string): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return false;

    const span = document.createElement("span");
    span.style.color = color;
    try {
        range.surroundContents(span);
    } catch {
        // Выделение частично затрагивает границы существующих узлов (напр. уже покрашенный
        // кусок) - surroundContents в таких случаях бросает исключение, извлекаем и
        // оборачиваем содержимое вручную.
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
    }
    sel.removeAllRanges();
    return true;
}

export function RichDiffEditor({
                                    initialHtml, placeholder, highlightColor, highlightLabel, disabled,
                                    heightClass = "h-[200px]", onChangeText,
                                }: RichDiffEditorProps) {
    const ref = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!ref.current || initializedRef.current) return;
        ref.current.innerHTML = initialHtml ?? "";
        initializedRef.current = true;
    }, [initialHtml]);

    const emitChange = () => {
        if (!ref.current) return;
        // Некоторые браузеры оставляют пустой <br> или текстовый узел в contentEditable после
        // удаления всего текста - div тогда не попадает под CSS-селектор :empty, и плейсхолдер
        // (data-placeholder) не показывается, хотя текста реально не осталось. Принудительно
        // чистим innerHTML в этом случае, чтобы плейсхолдер всегда возвращался после стирания.
        if (!ref.current.textContent?.trim() && ref.current.innerHTML !== "") {
            ref.current.innerHTML = "";
        }
        if (!onChangeText) return;
        onChangeText(ref.current.textContent ?? "", ref.current.innerHTML);
    };

    const handleHighlight = (color: string) => {
        if (!ref.current || disabled) return;
        if (applyColorToSelection(ref.current, color)) emitChange();
    };

    return (
        <div>
            {!disabled && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                    <Tooltip content={`Выделить отмеченный ${highlightLabel.toLowerCase()} цветом`} side="top">
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleHighlight(highlightColor)}
                            className="cursor-pointer rounded-[6px] border px-[7px] py-[2px] text-[10.5px] font-semibold transition-colors"
                            style={{borderColor: `${highlightColor}55`, color: highlightColor, background: `${highlightColor}0f`}}
                        >
                            Выделить {highlightLabel.toLowerCase()}
                        </button>
                    </Tooltip>
                    <Tooltip content="Выделить отмеченный чёрным цветом" side="top">
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleHighlight(BLACK_COLOR)}
                            className="cursor-pointer rounded-[6px] border px-[7px] py-[2px] text-[10.5px] font-semibold transition-colors"
                            style={{borderColor: `${BLACK_COLOR}55`, color: BLACK_COLOR, background: `${BLACK_COLOR}0f`}}
                        >
                            Выделить чёрным
                        </button>
                    </Tooltip>
                </div>
            )}
            <div
                ref={ref}
                contentEditable={!disabled}
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onInput={emitChange}
                onBlur={emitChange}
                className={`rd-editor w-full ${heightClass} overflow-y-auto whitespace-pre-wrap break-words rounded-[8px] border border-[#e0e5ee] bg-white px-2 py-[6px] text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] ${disabled ? "cursor-default bg-[#f6f8fb]" : ""}`}
            />
        </div>
    );
}
