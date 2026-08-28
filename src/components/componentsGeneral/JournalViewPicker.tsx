import {useRef, useState} from "react";
import {Check, ChevronDown, Save, Trash2, Users} from "lucide-react";
import type {JournalView} from "@/service/journalViewService/journalViewService.ts";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

/**
 * Выбор представления журнала — сохранённого набора колонок.
 *
 * Стоит рядом с переключателем колонок («Отображение колонок» —
 * MultiSelectDropdown), а не вместо него: колонки по-прежнему отмечают
 * галочками, а представление лишь запоминает получившийся набор под именем.
 * Поэтому и выглядит как его прямой сосед: тот же триггер, та же панель.
 *
 * Кнопка «Сохранить» появляется только когда показанное разошлось с выбранным
 * представлением. Висящая всегда, она приучает не замечать её.
 */

interface Props {
    views: JournalView[];
    active: JournalView | null;
    /** Показанное разошлось с выбранным представлением. */
    isDirty: boolean;
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
    views, active, isDirty, onApply, onReset, onSaveNew, onUpdate, onRemove, canShare, error,
}: Props) {
    const [open, setOpen] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [shared, setShared] = useState(false);
    const [asDefault, setAsDefault] = useState(false);
    const [pendingRemove, setPendingRemove] = useState<JournalView | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const close = () => {
        setOpen(false);
        setShowForm(false);
    };

    useClickOutside(ref, open, close);

    const ownViews = views.filter((v) => !v.isShared);
    const sharedViews = views.filter((v) => v.isShared);

    const handleCreate = () => {
        if (!name.trim()) return;

        onSaveNew(name.trim(), shared, asDefault);
        setName("");
        setShared(false);
        setAsDefault(false);
        close();
    };

    return (
        <div ref={ref} className="relative flex items-center gap-2">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-[9px] border px-3 text-[12.5px]
                            cursor-pointer hover:bg-[#f6f8fb] ${
                                open
                                    ? "border-[#4e57d6] bg-[#f6f8fb] ring-[3px] ring-[#ececfc]"
                                    : "border-[#e5e9f0] bg-white"
                            }`}
            >
                {active ? (
                    <span className="max-w-[160px] truncate rounded-full bg-[#ececfc] px-2 py-[2px]
                                     text-[11px] font-semibold text-[#4e57d6]">
                        {active.name}
                    </span>
                ) : (
                    <span className="font-normal text-[#8b97ab]">Представление…</span>
                )}
                {active?.isShared && <Users className="h-[13px] w-[13px] flex-none text-[#8b97ab]" strokeWidth={2}/>}
                <ChevronDown
                    className={`h-[15px] w-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                    strokeWidth={2}
                />
            </button>

            {isDirty && active && active.canEdit && (
                <button
                    type="button"
                    onClick={() => onUpdate(active)}
                    title={`Запомнить показанные колонки в «${active.name}»`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[#ececfc] px-3
                               text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#e0e4fb]"
                >
                    <Save className="h-[14px] w-[14px]" strokeWidth={2}/>
                    Сохранить
                </button>
            )}

            {open && (
                <div
                    style={{width: "300px"}}
                    className="absolute left-0 top-[42px] z-30 overflow-hidden rounded-xl border
                              border-[#e5e9f0] bg-white shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)]"
                >
                    {error && (
                        <p className="border-b border-[#eef2f7] bg-[#fbeae7] px-3 py-2 text-[12px] text-[#c0392b]">
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-[#a3adbd]">
                            Представление журнала
                        </span>
                        <HelpTooltip
                            content="Представление — сохранённый набор видимых колонок под именем. Своё видите только вы, общее — все, кто открывает этот журнал."
                            className="!h-6 !w-6"
                        />
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-1">
                        <button
                            type="button"
                            onClick={() => { onReset(); close(); }}
                            className="flex w-full items-center gap-[11px] rounded-lg px-2.5 py-[9px]
                                      text-left cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            <Marker active={active === null}/>
                            <span className="text-[13px] text-[#26324a]">Колонки по умолчанию</span>
                        </button>

                        <Group title="Мои" views={ownViews} active={active}
                               onApply={(v) => { onApply(v); close(); }} onRequestRemove={setPendingRemove}/>

                        <Group title="Общие" views={sharedViews} active={active}
                               onApply={(v) => { onApply(v); close(); }} onRequestRemove={setPendingRemove}/>
                    </div>

                    {!showForm ? (
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="w-full border-t border-[#eef2f7] px-3 py-2.5 text-left
                                       text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            Сохранить показанные колонки как представление…
                        </button>
                    ) : (
                        <div className="border-t border-[#eef2f7] bg-[#fafbfd] px-3 py-3">
                            <input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                    if (e.key === "Escape") setShowForm(false);
                                }}
                                placeholder="Название представления"
                                className="h-8 w-full rounded-[7px] border border-[#e5e9f0] bg-[#f6f8fb]
                                           px-2.5 text-[12.5px] text-[#1c2740] outline-none
                                           focus:border-[#4e57d6] focus:bg-white"
                            />

                            {canShare && (
                                <button
                                    type="button"
                                    onClick={() => setShared((v) => !v)}
                                    className="mt-2.5 flex w-full items-start gap-2 rounded-lg py-1 text-left
                                               cursor-pointer hover:bg-[#f6f8fb]"
                                >
                                    <Marker active={shared}/>
                                    <span className="text-[12px] text-[#26324a]">
                                        Общее — видят все
                                        <span className="block text-[11px] text-[#8b97ab]">
                                            Иначе представление останется только у вас
                                        </span>
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setAsDefault((v) => !v)}
                                className="mt-1 flex w-full items-start gap-2 rounded-lg py-1 text-left
                                           cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <Marker active={asDefault}/>
                                <span className="text-[12px] text-[#26324a]">Открывать журнал с ним</span>
                            </button>

                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={!name.trim()}
                                    className="rounded-[7px] bg-[#4e57d6] px-3 py-1.5 text-[12.5px] font-semibold
                                               text-white cursor-pointer hover:brightness-[1.06]
                                               disabled:cursor-not-allowed disabled:bg-[#c3ccd8]"
                                >
                                    Сохранить
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold text-[#8b97ab]
                                               cursor-pointer hover:text-[#26324a]"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ConfirmActionModal
                open={pendingRemove !== null}
                onClose={() => setPendingRemove(null)}
                onConfirm={() => {
                    if (pendingRemove) onRemove(pendingRemove);
                    setPendingRemove(null);
                }}
                title="Удалить представление?"
                message={pendingRemove ? `«${pendingRemove.name}» пропадёт из списка без возможности отменить.` : ""}
                confirmLabel="Удалить"
                variant="danger"
                icon={Trash2}
            />
        </div>
    );
}

/** Индикатор выбора — тот же квадрат с галочкой, что и в MultiSelectDropdown. */
function Marker({active}: {active: boolean}) {
    return (
        <span
            className={`grid h-5 w-5 flex-none place-items-center rounded-md ${
                active
                    ? "border-[1.5px] border-[#4e57d6] bg-[#4e57d6]"
                    : "border-[1.5px] border-[#cbd3df] bg-white"
            }`}
        >
            <Check className="h-[13px] w-[13px] text-white" strokeWidth={3} style={{opacity: active ? 1 : 0}}/>
        </span>
    );
}

function Group({title, views, active, onApply, onRequestRemove}: {
    title: string;
    views: JournalView[];
    active: JournalView | null;
    onApply: (v: JournalView) => void;
    onRequestRemove: (v: JournalView) => void;
}) {
    if (views.length === 0) return null;

    return (
        <div className="mt-1 border-t border-[#eef2f7] pt-1">
            <div className="px-2.5 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#a3adbd]">
                {title}
            </div>

            {views.map((view) => (
                <div key={view.id} className="group flex items-center rounded-lg hover:bg-[#f6f8fb]">
                    <button
                        type="button"
                        onClick={() => onApply(view)}
                        className="flex min-w-0 flex-1 items-center gap-[11px] px-2.5 py-[9px] text-left cursor-pointer"
                    >
                        <Marker active={active?.id === view.id}/>

                        <span className="min-w-0">
                            <span className="block truncate text-[13px] text-[#26324a]">{view.name}</span>
                            <span className="block truncate text-[11px] text-[#8b97ab]">
                                {view.columns.length} колонок
                                {view.isDefault && " · по умолчанию"}
                                {view.orgUnitTitle && ` · ${view.orgUnitTitle}`}
                            </span>
                        </span>
                    </button>

                    {view.canEdit && (
                        <button
                            type="button"
                            onClick={() => onRequestRemove(view)}
                            aria-label={`Удалить ${view.name}`}
                            className="mr-1.5 grid h-6 w-6 flex-none cursor-pointer place-items-center rounded-md
                                       text-[#c3ccd8] opacity-0 transition hover:bg-[#fbeae7] hover:text-[#c0392b]
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
