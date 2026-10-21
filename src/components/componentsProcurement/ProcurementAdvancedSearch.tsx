// Панель расширенного поиска реестра «Заявки и закупки» — тот же вид, что и в реестре
// служебных записок (SzAdvancedSearch.tsx): черновик условий применяется по «Найти».
// Кнопка-переключатель — общая с реестром СЗ (SzAdvancedSearchToggle).
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronUp} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {DateFilterGroup} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {UserMultiChipsField} from "@/components/componentsGeneral/userPicker/UserMultiChipsField.tsx";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {
    procurementService,
    type ProcurementMethodOption,
    type SubjectKind,
} from "@/service/procurementService/procurementService.ts";
import {
    EMPTY_PROCUREMENT_ADVANCED,
    SUBJECT_KINDS,
    type ProcurementAdvancedFilters,
} from "./procurementRegistryModel.ts";

interface Props {
    open: boolean;
    /** Применённые значения — из них заполняется черновик. */
    value: ProcurementAdvancedFilters;
    onApply: (v: ProcurementAdvancedFilters) => void;
    onClose: () => void;
    /** Способы закупки — грузит страница (нужны и для подписи чипса). */
    methods: ProcurementMethodOption[];
}

const AMOUNT_INPUT =
    "h-10 w-full min-w-0 rounded-[10px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] focus:border-[#2f68f5]";

export function ProcurementAdvancedSearchPanel({open, value, onApply, onClose, methods}: Props) {
    const {t} = useTranslation();
    const {users} = useUserLookup();
    const [draft, setDraft] = useState<ProcurementAdvancedFilters>(value);

    // Ресинхронизация черновика, если применённые значения поменялись извне (чипс, сохранённый фильтр).
    const snapshot = JSON.stringify(value);
    const [prevSnapshot, setPrevSnapshot] = useState(snapshot);
    if (snapshot !== prevSnapshot) {
        setPrevSnapshot(snapshot);
        setDraft(value);
    }

    const update = <K extends keyof ProcurementAdvancedFilters>(key: K, v: ProcurementAdvancedFilters[K]) =>
        setDraft((prev) => ({...prev, [key]: v}));

    const apply = () => {
        onApply(draft);
        onClose();
    };

    const reset = () => {
        setDraft(EMPTY_PROCUREMENT_ADVANCED);
        onApply(EMPTY_PROCUREMENT_ADVANCED);
    };

    return (
        <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out ${
                open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
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
                                        {t("procurementRegistry.advanced.regNumber") /* Номер */}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="blue"
                                        value={draft.regNumber}
                                        onChange={(v) => update("regNumber", v)}
                                        onSubmit={apply}
                                        placeholder={t("procurementRegistry.advanced.regNumberPlaceholder")}
                                    />
                                </label>
                                <label>
                                    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                                        {t("procurementRegistry.advanced.subject") /* Предмет закупки */}
                                    </span>
                                    <SearchBar
                                        variant="white"
                                        accent="blue"
                                        value={draft.subject}
                                        onChange={(v) => update("subject", v)}
                                        onSubmit={apply}
                                        placeholder={t("procurementRegistry.advanced.subjectPlaceholder")}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <UserMultiChipsField
                                    label={t("procurementRegistry.advanced.initiator") /* Инициатор */}
                                    people={users}
                                    value={draft.initiatorIds}
                                    onChange={(v) => update("initiatorIds", v)}
                                    accent="blue"
                                />
                                <UserMultiChipsField
                                    label={t("procurementRegistry.advanced.curator") /* Куратор */}
                                    people={users}
                                    value={draft.curatorIds}
                                    onChange={(v) => update("curatorIds", v)}
                                    accent="blue"
                                />
                            </div>

                            <div className="flex flex-col gap-3.5">
                                <SelectDropdown
                                    label={t("procurementRegistry.advanced.method") /* Способ закупки */}
                                    labelPosition="top"
                                    labelClassName="font-semibold"
                                    options={[
                                        {value: "", label: t("procurementRegistry.advanced.any") /* Любой */},
                                        ...methods.map((m) => ({value: String(m.id), label: m.shortTitle})),
                                    ]}
                                    value={draft.methodId}
                                    onChange={(v) => update("methodId", v)}
                                    minWidth="100%"
                                    accent="blue"
                                />
                                <SelectDropdown
                                    label={t("procurementRegistry.advanced.subjectKind") /* Вид предмета */}
                                    labelPosition="top"
                                    labelClassName="font-semibold"
                                    options={[
                                        {value: "", label: t("procurementRegistry.advanced.any") /* Любой */},
                                        ...SUBJECT_KINDS.map((k) => ({value: k, label: t(`procurementNew.subjectKinds.${k}`)})),
                                    ]}
                                    value={draft.subjectKind}
                                    onChange={(v) => update("subjectKind", v as SubjectKind | "")}
                                    minWidth="100%"
                                    accent="blue"
                                />
                                <div>
                                    <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                                        {t("procurementRegistry.advanced.amount") /* Сумма, сом */}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={draft.amountFrom}
                                            onChange={(e) => update("amountFrom", e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && apply()}
                                            inputMode="decimal"
                                            placeholder={t("procurementRegistry.advanced.from") /* от */}
                                            className={AMOUNT_INPUT}
                                        />
                                        <span className="text-[#a3adbd]">–</span>
                                        <input
                                            value={draft.amountTo}
                                            onChange={(e) => update("amountTo", e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && apply()}
                                            inputMode="decimal"
                                            placeholder={t("procurementRegistry.advanced.to") /* до */}
                                            className={AMOUNT_INPUT}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <CheckBoxOne
                                checked={draft.affiliatedOnly}
                                onChange={(v) => update("affiliatedOnly", v)}
                                tone="brand"
                            >
                                {t("procurementRegistry.advanced.affiliatedOnly") /* С аффилированным лицом */}
                            </CheckBoxOne>
                            <CheckBoxOne
                                checked={draft.offBudgetOnly}
                                onChange={(v) => update("offBudgetOnly", v)}
                                tone="brand"
                            >
                                {t("procurementRegistry.advanced.offBudgetOnly") /* Вне бюджета */}
                            </CheckBoxOne>
                        </div>

                        <div className="border border-[#eef2f7] rounded-xl p-3.5 overflow-x-auto">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                {t("procurementRegistry.advanced.datesSection") /* Даты */}
                            </div>
                            <DateFilterGroup
                                accent="blue"
                                rows={[
                                    {
                                        key: "created",
                                        label: t("procurementRegistry.advanced.createdDate"), /* Дата создания */
                                        value: draft.createdDate,
                                        onChange: (v) => update("createdDate", v),
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
                            className="h-10 px-5 rounded-[10px] border-none bg-[#2f68f5] text-white shadow-[0_6px_16px_-8px_#2f68f5] font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {t("registry.filters.advanced.apply") /* Найти */}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Способы закупки для фильтра: грузятся один раз на страницу. */
export function useProcurementMethods(): ProcurementMethodOption[] {
    const [methods, setMethods] = useState<ProcurementMethodOption[]>([]);
    useEffect(() => {
        let cancelled = false;
        procurementService.methodOptions()
            .then((data) => !cancelled && setMethods(data))
            .catch(() => undefined); // без списка способов фильтр просто пустой
        return () => {
            cancelled = true;
        };
    }, []);
    return methods;
}
