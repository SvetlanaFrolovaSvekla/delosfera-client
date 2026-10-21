// Расширенный поиск реестра доверенностей — тот же вид, что и в реестре служебных записок
// (componentsSz/componentsSzRegistry/SzAdvancedSearch.tsx): кнопка-переключатель с зелёной
// точкой и раскрывающаяся панель с черновиком, который применяется по «Найти».
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, ChevronUp, SlidersHorizontal} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {DateFilterGroup} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {UserMultiChipsField} from "@/components/componentsGeneral/userPicker/UserMultiChipsField.tsx";
import type {PoaHolderKind} from "@/service/poaService/poaService.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {ACCENT} from "@/constants/accent.ts";
import {EMPTY_POA_ADVANCED, type PoaAdvancedFilters} from "./poaRegistryModel.ts";

const A = ACCENT.violet;

interface ToggleProps {
    open: boolean;
    active: boolean;
    onToggle: () => void;
}

/** Кнопка «Расширенный поиск» для строки фильтров реестра. */
export function PoaAdvancedSearchToggle({open, active, onToggle}: ToggleProps) {
    const {t} = useTranslation();
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={`relative inline-flex flex-none items-center gap-2 h-10 px-3 rounded-[10px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                open
                    ? `${A.border} ring-[3px] ${A.ring} bg-[#f6f8fb]`
                    : "border-[#e5e9f0] bg-white"
            }`}
        >
            <SlidersHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8}/>
            {t("registry.filters.advancedSearch") /* Расширенный поиск */}
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
    value: PoaAdvancedFilters;
    onApply: (v: PoaAdvancedFilters) => void;
    onClose: () => void;
}

/** Раскрывающаяся панель расширенного поиска. Изменения применяются только по «Найти». */
export function PoaAdvancedSearchPanel({open, value, onApply, onClose}: PanelProps) {
    const {t} = useTranslation();
    const {users} = useUserLookup();
    const [draft, setDraft] = useState<PoaAdvancedFilters>(value);

    // Ресинхронизация черновика, если применённые значения поменялись извне (снятый чипс, сброс).
    const snapshot = JSON.stringify(value);
    const [prevSnapshot, setPrevSnapshot] = useState(snapshot);
    if (snapshot !== prevSnapshot) {
        setPrevSnapshot(snapshot);
        setDraft(value);
    }

    const update = <K extends keyof PoaAdvancedFilters>(key: K, v: PoaAdvancedFilters[K]) =>
        setDraft((prev) => ({...prev, [key]: v}));

    const apply = () => {
        onApply(draft);
        onClose();
    };

    const reset = () => {
        setDraft(EMPTY_POA_ADVANCED);
        onApply(EMPTY_POA_ADVANCED);
    };

    const holderKindOptions = [
        {value: "", label: t("poaRegistryPage.advanced.holderKindAll") /* Все */},
        ...(["Employee", "External"] as PoaHolderKind[]).map((kind) => ({
            value: kind,
            label: t(`poaCard.holderKinds.${kind}`), // Сотрудник банка / Стороннее лицо
        })),
    ];

    return (
        <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 -mt-4"
            }`}
            aria-hidden={!open}
        >
            <div className="overflow-hidden">
                <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                    <div className="flex flex-col gap-3.5 mb-[18px]">
                        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-x-[18px] gap-y-3.5">
                            <div className="flex flex-col gap-3.5">
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("poaRegistryPage.advanced.regNumber") /* Номер */}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="violet"
                                        value={draft.regNumber}
                                        onChange={(v) => update("regNumber", v)}
                                        onSubmit={apply}
                                        placeholder={t("poaRegistryPage.advanced.regNumberPlaceholder")}
                                    />
                                </label>
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("poaRegistryPage.advanced.powers") /* Полномочия */}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="violet"
                                        value={draft.powers}
                                        onChange={(v) => update("powers", v)}
                                        onSubmit={apply}
                                        placeholder={t("poaRegistryPage.advanced.powersPlaceholder")}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <UserMultiChipsField
                                    label={t("poaRegistryPage.advanced.grantor") /* Доверитель */}
                                    people={users}
                                    value={draft.grantorIds}
                                    onChange={(v) => update("grantorIds", v)}
                                />
                                <UserMultiChipsField
                                    label={t("poaRegistryPage.advanced.holder") /* Кому */}
                                    people={users}
                                    value={draft.holderIds}
                                    onChange={(v) => update("holderIds", v)}
                                />
                                {/* Стороннее лицо в справочнике не найти - ищем по ФИО из доверенности */}
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("poaRegistryPage.advanced.holderName") /* ФИО представителя */}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="violet"
                                        value={draft.holderName}
                                        onChange={(v) => update("holderName", v)}
                                        onSubmit={apply}
                                        placeholder={t("poaRegistryPage.advanced.holderNamePlaceholder")}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <SelectDropdown
                                    label={t("poaRegistryPage.advanced.holderKind") /* Представитель */}
                                    labelPosition="top"
                                    labelClassName="font-semibold"
                                    options={holderKindOptions}
                                    value={draft.holderKind}
                                    onChange={(v) => update("holderKind", v as PoaHolderKind | "")}
                                    minWidth="100%"
                                    accent="violet"
                                />
                                <div>
                                    <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                                        {t("poaRegistryPage.advanced.validOn") /* Действует на дату */}
                                    </span>
                                    <DatePickerInput
                                        value={draft.validOn}
                                        onChange={(v) => update("validOn", v)}
                                        accent="violet"
                                    />
                                </div>
                                <CheckBoxOne
                                    checked={draft.allowsDelegation}
                                    onChange={(v) => update("allowsDelegation", v)}
                                >
                                    {t("poaRegistryPage.advanced.allowsDelegation") /* С правом передоверия */}
                                </CheckBoxOne>
                            </div>
                        </div>

                        {/* Даты: конкретный день или период «с — по» */}
                        <div className="border border-[#eef2f7] rounded-xl p-3.5 overflow-x-auto">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                {t("poaRegistryPage.advanced.datesSection") /* Даты */}
                            </div>
                            <DateFilterGroup
                                accent="violet"
                                rows={[
                                    {
                                        key: "issued",
                                        label: t("poaRegistryPage.advanced.issuedDate"), /* Дата выдачи */
                                        value: draft.issuedDate,
                                        onChange: (v) => update("issuedDate", v),
                                    },
                                    {
                                        key: "validTo",
                                        label: t("poaRegistryPage.advanced.validToDate"), /* Окончание срока */
                                        value: draft.validToDate,
                                        onChange: (v) => update("validToDate", v),
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
                            {t("registry.filters.advanced.collapse") /* Свернуть */}
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            {t("registry.filters.advanced.reset") /* Сбросить */}
                        </button>
                        <button
                            type="button"
                            onClick={apply}
                            className="h-10 px-5 rounded-[10px] border-none bg-[#4e57d6] text-white shadow-[0_6px_16px_-8px_#4e57d6] font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {t("registry.filters.advanced.apply") /* Найти */}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
