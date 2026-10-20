// Расширенный поиск реестра служебных записок — тот же вид, что и в реестре ВНД
// (см. componentsVND/componentsBaseVndPage/VndFilters.tsx): кнопка-переключатель
// с зелёной точкой и раскрывающаяся панель с черновиком, который применяется по «Найти».
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, ChevronUp, SlidersHorizontal, X} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SzUserMultiPickerModal} from "@/components/componentsSz/componentsSzCard/controls/SzUserMultiPickerModal.tsx";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {DateFilterGroup} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {useSzUsers} from "@/hooks/sz/useSzUsers.ts";
import {EMPTY_SZ_ADVANCED, type SzAdvancedFilters} from "./registryModel.ts";

interface ToggleProps {
    open: boolean;
    active: boolean;
    onToggle: () => void;
}

/** Кнопка «Расширенный поиск» для строки фильтров реестра. */
export function SzAdvancedSearchToggle({open, active, onToggle}: ToggleProps) {
    const {t} = useTranslation();
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                open
                    ? "border-[#2f68f5] ring-[3px] ring-[#e9f0ff] bg-[#f6f8fb]"
                    : "border-[#e5e9f0] bg-white"
            }`}
        >
            <SlidersHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8}/>
            {t("registry.filters.advancedSearch")}
            <ChevronDown
                className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                strokeWidth={2}
            />
            {active && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3fb36c] ring-2 ring-white"/>
            )}
        </button>
    );
}

interface PanelProps {
    open: boolean;
    /** Применённые значения — из них заполняется черновик. */
    value: SzAdvancedFilters;
    onApply: (v: SzAdvancedFilters) => void;
    onClose: () => void;
}

/** Раскрывающаяся панель расширенного поиска. Изменения применяются только по «Найти». */
export function SzAdvancedSearchPanel({open, value, onApply, onClose}: PanelProps) {
    const {t} = useTranslation();
    // Тот же справочник пользователей, что и в карточке СЗ (доступен всем, кто работает с записками).
    const {userList} = useSzUsers();
    const [draft, setDraft] = useState<SzAdvancedFilters>(value);

    // Ресинхронизация черновика, если применённые значения поменялись извне
    // (сохранённый фильтр, сброс). Сравниваем по содержимому, как в реестре ВНД.
    const snapshot = JSON.stringify(value);
    const [prevSnapshot, setPrevSnapshot] = useState(snapshot);
    if (snapshot !== prevSnapshot) {
        setPrevSnapshot(snapshot);
        setDraft(value);
    }

    const update = <K extends keyof SzAdvancedFilters>(key: K, v: SzAdvancedFilters[K]) =>
        setDraft((prev) => ({...prev, [key]: v}));

    const apply = () => {
        onApply(draft);
        onClose();
    };

    const reset = () => {
        setDraft(EMPTY_SZ_ADVANCED);
        onApply(EMPTY_SZ_ADVANCED);
    };

    return (
        <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out ${
                open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
            }`}
        >
            <div className="overflow-hidden">
                <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                    <div className="flex flex-col gap-3.5 mb-[18px]">
                        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] gap-x-[18px] gap-y-3.5">
                            <div className="flex flex-col gap-3.5">
                                {/* Код (регистрационный номер) */}
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("szRegistry.advanced.code")}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="blue"
                                        value={draft.regNumber}
                                        onChange={(v) => update("regNumber", v)}
                                        placeholder={t("szRegistry.advanced.codePlaceholder")}
                                    />
                                </label>

                                {/* Тема */}
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("szRegistry.advanced.title")}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="blue"
                                        value={draft.title}
                                        onChange={(v) => update("title", v)}
                                        placeholder={t("szRegistry.advanced.titlePlaceholder")}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-3.5">
                                {/* Автор */}
                                <SzAuthorsField
                                    people={userList}
                                    value={draft.authorIds}
                                    onChange={(v) => update("authorIds", v)}
                                />

                                {/* Бумажный носитель: записки, оригинал которых живёт на бумаге */}
                                <CheckBoxOne
                                    checked={draft.paperOnly}
                                    onChange={(v) => update("paperOnly", v)}
                                    tone="brand"
                                >
                                    {t("szRegistry.advanced.paperCarrier")}
                                </CheckBoxOne>
                            </div>
                        </div>

                        {/* Даты: конкретный день или период «с — по» */}
                        <div className="border border-[#eef2f7] rounded-xl p-3.5 overflow-x-auto">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                {t("szRegistry.advanced.datesSection")}
                            </div>
                            <DateFilterGroup
                                accent="blue"
                                rows={[
                                    {
                                        key: "registered",
                                        label: t("szRegistry.advanced.registeredDate"),
                                        value: draft.registeredDate,
                                        onChange: (v) => update("registeredDate", v),
                                    },
                                    {
                                        key: "due",
                                        label: t("szRegistry.advanced.dueDate"),
                                        value: draft.dueDate,
                                        onChange: (v) => update("dueDate", v),
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2}/>
                            {t("registry.filters.advanced.collapse")}
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            {t("registry.filters.advanced.reset")}
                        </button>
                        <button
                            type="button"
                            onClick={apply}
                            className="h-10 px-5 rounded-[10px] border-none bg-[#2f68f5] text-white shadow-[0_6px_16px_-8px_#2f68f5] font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {t("registry.filters.advanced.apply")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MAX_VISIBLE_AUTHORS = 5;

interface AuthorsFieldProps {
    people: PickableUser[];
    /** id выбранных авторов (строками — так они хранятся в фильтре и сохранённых фильтрах). */
    value: string[];
    onChange: (ids: string[]) => void;
}

/**
 * Поле «Автор»: выглядит как MultiSelectField (подпись + чипсы), но выбор идёт через
 * SzUserMultiPickerModal — ту же модалку, что и у согласующих в карточке СЗ:
 * поиск по ФИО/должности и фильтр по СП.
 */
function SzAuthorsField({people, value, onChange}: AuthorsFieldProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    const byId = useMemo(() => new Map(people.map((p) => [String(p.id), p.fullName])), [people]);
    const selected = value.map((id) => ({id, name: byId.get(id) ?? `#${id}`}));
    const visible = selected.slice(0, MAX_VISIBLE_AUTHORS);
    const hidden = selected.slice(MAX_VISIBLE_AUTHORS);

    return (
        <>
            <div className="min-w-0">
                <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                    {t("szRegistry.advanced.author")}
                </span>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpen(true);
                        }
                    }}
                    className="w-full min-w-0 min-h-[38px] px-2.5 py-[6px] rounded-[9px] border border-[#e5e9f0] bg-white box-border cursor-pointer flex items-center gap-[6px] hover:bg-[#f6f8fb] outline-none focus:border-[#2f68f5]"
                >
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-[6px]">
                        {selected.length === 0 && (
                            <span className="text-[13px] text-[#a3adbd] px-[3px]">{t("general.openList")}</span>
                        )}
                        {visible.map((a) => (
                            <span
                                key={a.id}
                                className="inline-flex min-w-0 max-w-full items-center gap-[6px] pl-[9px] pr-[6px] py-[3px] rounded-full bg-[#f2f5f9] text-[12px] text-[#3a4560] font-medium"
                            >
                                <span className="block truncate min-w-0" title={a.name}>{a.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(value.filter((x) => x !== a.id));
                                    }}
                                    className="w-[16px] h-[16px] flex-none grid place-items-center rounded-full text-[#8b97ab] hover:bg-[#e5e9f0] hover:text-[#55617a] cursor-pointer"
                                >
                                    <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                                </button>
                            </span>
                        ))}
                        {hidden.length > 0 && (
                            <span
                                title={hidden.map((a) => a.name).join(", ")}
                                className="inline-flex flex-none cursor-default items-center px-[9px] py-[3px] rounded-full bg-[#e9f0ff] text-[12px] font-semibold text-[#2f68f5]"
                            >
                                +{hidden.length}
                            </span>
                        )}
                    </div>
                    <ChevronDown className="w-[15px] h-[15px] flex-none text-[#a3adbd]" strokeWidth={2}/>
                </div>
            </div>

            {open && (
                <SzUserMultiPickerModal
                    people={people}
                    value={value.map(Number)}
                    onChange={(ids) => onChange(ids.map(String))}
                    title={t("szRegistry.advanced.author")}
                    onClose={() => setOpen(false)}
                    accent="blue"
                />
            )}
        </>
    );
}
