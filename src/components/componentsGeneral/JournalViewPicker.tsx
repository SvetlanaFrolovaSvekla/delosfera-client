import {useRef, useState} from "react";
import {Check, ChevronDown, Save, Trash2, Users} from "lucide-react";
import type {JournalView} from "@/service/journalViewService/journalViewService.ts";
import {useClickOutside} from "@/hooks/useClickOutside.ts";

/**
 * Выбор представления журнала — сохранённого набора колонок.
 *
 * Стоит рядом с переключателем колонок, а не вместо него: колонки по-прежнему
 * отмечают галочками, а представление лишь запоминает получившийся набор под
 * именем.
 *
 * Кнопка «Сохранить» появляется только когда показанное разошлось с выбранным
 * представлением. Висящая всегда, она приучает не замечать её.
 */

interface Props {
    views: JournalView[];
    active: JournalView | null;
    /** Показанное разошлось с выбранным представлением. */
    изменено: boolean;
    onApply: (view: JournalView) => void;
    onReset: () => void;
    onSaveNew: (name: string, isShared: boolean, isDefault: boolean) => void;
    onUpdate: (view: JournalView) => void;
    onRemove: (view: JournalView) => void;
    /** Может ли заводить общие представления — право на системные настройки. */
    canShare: boolean;
    error?: string | null;
}

export function JournalViewPicker({
    views, active, изменено, onApply, onReset, onSaveNew, onUpdate, onRemove, canShare, error,
}: Props) {
    const [open, setOpen] = useState(false);
    const [форма, setФорма] = useState(false);
    const [имя, setИмя] = useState("");
    const [общее, setОбщее] = useState(false);
    const [поУмолчанию, setПоУмолчанию] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const закрыть = () => {
        setOpen(false);
        setФорма(false);
    };

    useClickOutside(ref, open, закрыть);

    const свои = views.filter((v) => !v.isShared);
    const общие = views.filter((v) => v.isShared);

    const завести = () => {
        if (!имя.trim()) return;

        onSaveNew(имя.trim(), общее, поУмолчанию);
        setИмя("");
        setОбщее(false);
        setПоУмолчанию(false);
        закрыть();
    };

    return (
        <div ref={ref} className="relative flex items-center gap-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-[9px] border border-[#e1e7ef] bg-white
                           px-3 py-1.5 text-[13px] text-[#4d5a72] transition
                           hover:border-[#2f68f5] hover:text-[#2f68f5]"
            >
                <span className="max-w-[190px] truncate">
                    {active ? active.name : "Представление"}
                </span>
                {active?.isShared && <Users size={13} className="flex-none opacity-60"/>}
                <ChevronDown size={14} className={`flex-none transition-transform ${open ? "rotate-180" : ""}`}/>
            </button>

            {изменено && active && active.canEdit && (
                <button
                    type="button"
                    onClick={() => onUpdate(active)}
                    title={`Запомнить показанные колонки в «${active.name}»`}
                    className="flex items-center gap-1.5 rounded-[9px] bg-[#eaf0ff] px-3 py-1.5
                               text-[13px] text-[#2f68f5] transition hover:bg-[#dbe6ff]"
                >
                    <Save size={13}/>
                    Сохранить
                </button>
            )}

            {open && (
                <div className="absolute left-0 top-full z-30 mt-1.5 w-[320px] overflow-hidden
                                rounded-[11px] border border-[#e1e7ef] bg-white shadow-lg">

                    {error && (
                        <p className="border-b border-[#f2f5f9] bg-[#fbe8e5] px-3.5 py-2
                                      text-[12.5px] text-[#b3372a]">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => { onReset(); закрыть(); }}
                        className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px]
                                    transition hover:bg-[#f6f8fb]
                                    ${active === null ? "font-semibold text-[#101a2c]" : "text-[#4d5a72]"}`}
                    >
                        {active === null
                            ? <Check size={14} className="flex-none text-[#2f68f5]"/>
                            : <span className="w-3.5 flex-none"/>}
                        Колонки по умолчанию
                    </button>

                    <Группа title="Мои" views={свои} active={active}
                            onApply={(v) => { onApply(v); закрыть(); }} onRemove={onRemove}/>

                    <Группа title="Общие" views={общие} active={active}
                            onApply={(v) => { onApply(v); закрыть(); }} onRemove={onRemove}/>

                    {!форма ? (
                        <button
                            type="button"
                            onClick={() => setФорма(true)}
                            className="w-full border-t border-[#f2f5f9] px-3.5 py-2.5 text-left
                                       text-[13px] text-[#2f68f5] transition hover:bg-[#f6f8fb]"
                        >
                            Сохранить показанные колонки как представление…
                        </button>
                    ) : (
                        <div className="border-t border-[#f2f5f9] bg-[#fafbfd] px-3.5 py-3">
                            <input
                                autoFocus
                                value={имя}
                                onChange={(e) => setИмя(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") завести();
                                    if (e.key === "Escape") setФорма(false);
                                }}
                                placeholder="Название представления"
                                className="w-full rounded-[8px] border border-[#e1e7ef] bg-white px-2.5 py-1.5
                                           text-[13px] outline-none focus:border-[#2f68f5]"
                            />

                            {canShare && (
                                <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[12.5px] text-[#4d5a72]">
                                    <input type="checkbox" checked={общее} className="mt-0.5"
                                           onChange={(e) => setОбщее(e.target.checked)}/>
                                    <span>
                                        Общее — видят все
                                        <span className="block text-[11px] text-[#8593a8]">
                                            Иначе представление останется только у вас
                                        </span>
                                    </span>
                                </label>
                            )}

                            <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12.5px] text-[#4d5a72]">
                                <input type="checkbox" checked={поУмолчанию} className="mt-0.5"
                                       onChange={(e) => setПоУмолчанию(e.target.checked)}/>
                                <span>Открывать журнал с ним</span>
                            </label>

                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={завести}
                                    disabled={!имя.trim()}
                                    className="rounded-[8px] bg-[#2f68f5] px-3 py-1.5 text-[12.5px] text-white
                                               transition hover:bg-[#2557d6] disabled:bg-[#c3cbdb]"
                                >
                                    Сохранить
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setФорма(false)}
                                    className="rounded-[8px] px-3 py-1.5 text-[12.5px] text-[#8593a8]
                                               transition hover:text-[#4d5a72]"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Группа({title, views, active, onApply, onRemove}: {
    title: string;
    views: JournalView[];
    active: JournalView | null;
    onApply: (v: JournalView) => void;
    onRemove: (v: JournalView) => void;
}) {
    if (views.length === 0) return null;

    return (
        <div className="border-t border-[#f2f5f9]">
            <div className="px-3.5 pb-1 pt-2 text-[10.5px] font-bold uppercase
                            tracking-wider text-[#a3adbd]">
                {title}
            </div>

            {views.map((view) => (
                <div key={view.id} className="group flex items-center transition hover:bg-[#f6f8fb]">
                    <button
                        type="button"
                        onClick={() => onApply(view)}
                        className={`flex min-w-0 flex-1 items-center gap-2 px-3.5 py-2 text-left text-[13px]
                                    ${active?.id === view.id
                                        ? "font-semibold text-[#101a2c]"
                                        : "text-[#4d5a72]"}`}
                    >
                        {active?.id === view.id
                            ? <Check size={14} className="flex-none text-[#2f68f5]"/>
                            : <span className="w-3.5 flex-none"/>}

                        <span className="min-w-0">
                            <span className="block truncate">{view.name}</span>
                            <span className="block truncate text-[11px] text-[#8593a8]">
                                {view.columns.length} колонок
                                {view.isDefault && " · по умолчанию"}
                                {view.orgUnitTitle && ` · ${view.orgUnitTitle}`}
                            </span>
                        </span>
                    </button>

                    {view.canEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm(`Удалить представление «${view.name}»?`)) onRemove(view);
                            }}
                            aria-label={`Удалить ${view.name}`}
                            className="mr-2 rounded p-1 text-[#c3cbdb] opacity-0 transition
                                       hover:bg-[#fbe8e5] hover:text-[#b3372a]
                                       group-hover:opacity-100"
                        >
                            <Trash2 size={13}/>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
