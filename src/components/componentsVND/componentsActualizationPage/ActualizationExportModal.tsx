// Модалка кнопки "Экспорт плана в Excel" на странице "Планирование актуализации".
//
// Открывается с теми же фильтрами и той же видимостью колонок, что сейчас применены на
// странице (initial*-пропсы) — то есть по умолчанию выгружает ровно то, что пользователь видит
// в таблице. Текстовый поиск (initialSearch) берётся как есть, со страницы, своего поля поиска
// в модалке нет. Внутри можно донастроить остальные фильтры (те же контролы, что и в
// ActualizationFilters — статус срока, вид/разработчик/орган, срок актуализации, "только ни разу
// не актуализированные") и выбрать нужные колонки, не трогая при этом саму страницу за модалкой:
// "Экспортировать" строит независимый VndSearchRequest и скачивает файл, ничего не применяя
// к отображаемой таблице.
import {useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Download, Loader2, X} from "lucide-react";

import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndActualizationSummaryResponse, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {ACTUALIZATION_COLUMNS} from "@/constants/actualizationColumns.ts";
import {ACTUALIZATION_PLANNING_STATUSES, toDateRangeFilter} from "@/utils/actualizationSearchRequest.ts";
import {toast} from "@/service/toastService.ts";

import {
    ActualizationFilterPills,
    type ActualizationFilterValue,
} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilterPills.tsx";
import {DateFilterGroup, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

interface ActualizationExportModalProps {
    onClose: () => void;

    initialSearch: string;
    initialBucketFilter: ActualizationFilterValue;
    initialTypeFilters: string[];
    initialDeveloperFilters: string[];
    initialOrganFilters: string[];
    initialDueDateFilter: DateFilterValue;
    initialNeverActualizedOnly: boolean;

    /** Видимость доп. колонок, как сейчас на странице (useVndActualizationColumnVisibility) —
     * модалка открывается с тем же набором колонок, что уже показан в таблице. */
    initialVisibleCols: Record<string, boolean>;

    summary: VndActualizationSummaryResponse | null;
}

const TOGGLEABLE_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
const FIXED_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => c.fixed);

export function ActualizationExportModal({
    onClose,
    initialSearch, initialBucketFilter, initialTypeFilters, initialDeveloperFilters, initialOrganFilters,
    initialDueDateFilter, initialNeverActualizedOnly, initialVisibleCols, summary,
}: ActualizationExportModalProps) {
    const {typeOptions, organOptions, orgUnitOptions} = useDictionaries();

    const [bucketFilter, setBucketFilter] = useState<ActualizationFilterValue>(initialBucketFilter);
    const [typeFilters, setTypeFilters] = useState(initialTypeFilters);
    const [developerFilters, setDeveloperFilters] = useState(initialDeveloperFilters);
    const [organFilters, setOrganFilters] = useState(initialOrganFilters);
    const [dueDateFilter, setDueDateFilter] = useState<DateFilterValue>(initialDueDateFilter);
    const [neverActualizedOnly, setNeverActualizedOnly] = useState(initialNeverActualizedOnly);

    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(initialVisibleCols);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleColumn = (key: string) =>
        setVisibleCols((prev) => ({...prev, [key]: !(prev[key] === true)}));
    const selectAllColumns = () =>
        setVisibleCols(Object.fromEntries(TOGGLEABLE_COLUMNS.map((c) => [c.key, true])));
    const deselectAllColumns = () =>
        setVisibleCols(Object.fromEntries(TOGGLEABLE_COLUMNS.map((c) => [c.key, false])));

    const selectedCount = TOGGLEABLE_COLUMNS.filter((c) => visibleCols[c.key] === true).length;

    const filter = useMemo<VndSearchRequest>(() => ({
        name: initialSearch || undefined,
        statuses: ACTUALIZATION_PLANNING_STATUSES,
        actualizationBuckets: bucketFilter === "all" ? [] : [bucketFilter],
        typeIds: typeFilters.length ? typeFilters.map(Number) : undefined,
        developerIds: developerFilters.length ? developerFilters.map(Number) : undefined,
        organIds: organFilters.length ? organFilters.map(Number) : undefined,
        dueActualizationDate: toDateRangeFilter(dueDateFilter),
    }), [initialSearch, bucketFilter, typeFilters, developerFilters, organFilters, dueDateFilter]);

    const handleExport = async () => {
        setSubmitting(true);
        setError(null);
        const toastId = toast.loading("Формируется файл…", "Экспорт плана в Excel");

        try {
            const columns = ACTUALIZATION_COLUMNS
                .filter((c) => c.fixed || visibleCols[c.key] === true)
                .map((c) => c.key);

            await vndService.exportActualizationPlan({filter, columns, neverActualizedOnly});

            toast.update(toastId, {
                variant: "success",
                title: "Готово",
                description: "Файл экспорта скачан",
                duration: 4500,
            });
            onClose();
        } catch (e) {
            const message = e instanceof Error ? e.message : "Не удалось сформировать файл";
            setError(message);
            toast.update(toastId, {
                variant: "error",
                title: "Не удалось сформировать файл",
                description: message,
                duration: 5500,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-[16px] bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-[#eef2f7] px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Download size={19} strokeWidth={1.8}/>
                        </span>
                        <div>
                            <h2 className="text-[16px] font-bold text-[#1c2740]">Экспорт плана в Excel</h2>
                            <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                                Настройте колонки и фильтры — файл соберётся из отфильтрованной таблицы
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                        Фильтры
                    </div>

                    <ActualizationFilterPills value={bucketFilter} onChange={setBucketFilter} summary={summary}/>

                    <label className="mb-4 inline-flex cursor-pointer select-none items-center gap-1.5 text-[12.5px] font-semibold text-[#3a4560]">
                        <input
                            type="checkbox"
                            checked={neverActualizedOnly}
                            onChange={(e) => setNeverActualizedOnly(e.target.checked)}
                            className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                        />
                        Только ни разу не актуализированные
                        <HelpTooltip content="Показывает документы только с одной (первой) редакцией — т.е. те, которые ещё ни разу не проходили актуализацию."/>
                    </label>

                    <div className="mb-4 grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[14px] gap-y-3">
                        <MultiSelectField
                            label="Вид документа"
                            modalTitle="Вид документа"
                            options={typeOptions}
                            selectedKeys={typeFilters}
                            onChange={setTypeFilters}
                            searchPlaceholder="Поиск вида документа…"
                        />
                        <MultiSelectField
                            label="Разработчик"
                            modalTitle="Разработчик (СП)"
                            options={orgUnitOptions}
                            selectedKeys={developerFilters}
                            onChange={setDeveloperFilters}
                            searchPlaceholder="Поиск подразделения…"
                            hierarchical
                        />
                        <MultiSelectField
                            label="Орган утверждения"
                            modalTitle="Орган утверждения"
                            options={organOptions}
                            selectedKeys={organFilters}
                            onChange={setOrganFilters}
                            searchPlaceholder="Поиск органа утверждения…"
                            hierarchical
                        />
                    </div>

                    <div className="mb-5 rounded-xl border border-[#eef2f7] p-3.5">
                        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            Срок актуализации
                        </div>
                        <DateFilterGroup
                            rows={[
                                {key: "dueActualization", label: "Срок актуализации", value: dueDateFilter, onChange: setDueDateFilter},
                            ]}
                        />
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                            Колонки
                        </div>
                        <div className="flex items-center gap-3 text-[12px]">
                            <span className="text-[#8b97ab]">Выбрано доп.: {selectedCount} из {TOGGLEABLE_COLUMNS.length}</span>
                            <button onClick={selectAllColumns} className="cursor-pointer font-semibold text-[#4e57d6] hover:underline">
                                Выбрать все
                            </button>
                            <button onClick={deselectAllColumns} className="cursor-pointer font-semibold text-[#4e57d6] hover:underline">
                                Снять всё
                            </button>
                        </div>
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {FIXED_COLUMNS.map((c) => (
                            <span key={c.key}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#e5e9f0] bg-[#f6f8fb] px-2.5 py-1 text-[11.5px] font-semibold text-[#8b97ab]">
                                {c.label}
                            </span>
                        ))}
                    </div>
                    <div className="mb-1 text-[11px] text-[#a3adbd]">
                        Колонки выше входят в файл всегда. Ниже — дополнительные, на выбор.
                    </div>

                    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-3 gap-y-1.5 rounded-xl border border-[#eef2f7] p-3.5">
                        {TOGGLEABLE_COLUMNS.map((c) => (
                            <label key={c.key}
                                   className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-[#3a4560] hover:bg-[#f6f8fb]">
                                <input
                                    type="checkbox"
                                    checked={visibleCols[c.key] === true}
                                    onChange={() => toggleColumn(c.key)}
                                    className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                                />
                                {c.label}
                            </label>
                        ))}
                    </div>

                    {error && (
                        <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[#eef2f7] px-6 py-4">
                    <button onClick={onClose} disabled={submitting}
                            className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50">
                        Отмена
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={submitting}
                        className="cursor-pointer inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                        Экспортировать
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
