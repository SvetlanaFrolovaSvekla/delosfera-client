import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft, Check} from "lucide-react";
import {
    TYPE_VND,
    ORGANS_APPROVAL,
    KEYWORDS,
    RUBRICS,
    SECURITY_LEVELS,
    USER_GROUPS,
} from "@/service/mockData/DictionaryData.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/SelectDropdown.tsx";
import {SelectListField} from "@/components/componentsGeneral/SelectListField.tsx";
import {TreeSelectField} from "@/components/componentsGeneral/TreeSelectField.tsx";
import {formatDDMMYYYY, parseDDMMYYYY} from "@/utils/dateFilterMatch.ts";
import {DatePickerInput} from "@/components/componentsGeneral/DatePickerInput.tsx";
import {vndService} from "@/service/vndService/vndService.ts";
import type {ActualizationPeriod, CreateVndRequest} from "@/service/vndService/vndServiceType.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc] box-border";

type ActualizationMode = "halfYear" | "year" | "twoYears" | "threeYears" | "date";

const PERIOD_MONTHS: Record<Exclude<ActualizationMode, "date">, number> = {
    halfYear: 6,
    year: 12,
    twoYears: 24,
    threeYears: 36,
};

// Соответствие UI-режима периода бэковому enum ActualizationPeriod
const PERIOD_TO_BACKEND: Record<ActualizationMode, ActualizationPeriod> = {
    halfYear: "HalfYear",
    year: "Annual",
    twoYears: "Biennial",
    threeYears: "Triennial",
    date: "Custom",
};

const ACTUALIZATION_MODE_OPTIONS: { key: ActualizationMode; label: string }[] = [
    {key: "halfYear", label: "Раз в полгода"},
    {key: "year", label: "Раз в год"},
    {key: "twoYears", label: "Раз в два года"},
    {key: "threeYears", label: "Раз в три года"},
    {key: "date", label: "Ввод даты"},
];

function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function formatISO(date: Date): string {
    return date.toISOString().slice(0, 10);
}

// Разница между сегодня и датой в готовую периодичность (с допуском ±8%,
// чтобы "365 дней" и "370 дней" одинаково читались как "раз в год").
function describeManualPeriod(manualDateISO: string, todayISO: string): string {
    if (!manualDateISO) return "укажите дату";

    const from = new Date(todayISO);
    const to = new Date(manualDateISO);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) return "дата должна быть в будущем";

    const approxMonths = days / 30.44;
    const buckets = [
        {months: 6, label: "раз в полгода"},
        {months: 12, label: "раз в год"},
        {months: 24, label: "раз в два года"},
        {months: 36, label: "раз в три года"},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.08);
    if (closest) return closest.label;

    return approxMonths < 1 ? `${days} дн.` : `≈ ${Math.round(approxMonths)} мес.`;
}

export function CreateVndPage() {
    const navigate = useNavigate();

    const typeOptions = useMemo(
        () => TYPE_VND.map((t) => ({value: t.id, label: t.name})),
        []
    );
    const organOptions = useMemo(
        () => ORGANS_APPROVAL.map((o) => ({key: o.id, label: o.name, parentId: o.parentId})),
        []
    );
    const secrecyOptions = useMemo(
        () => SECURITY_LEVELS.map((s) => ({key: s.id, label: s.name})),
        []
    );

    const [typeId, setTypeId] = useState("");
    const [organId, setOrganId] = useState<string | null>(null);
    const [titleRu, setTitleRu] = useState("");
    const [titleKy, setTitleKy] = useState("");
    const [titleEn, setTitleEn] = useState("");

    const [keywordIds, setKeywordIds] = useState<string[]>([]);
    const [rubricIds, setRubricIds] = useState<string[]>([]);
    const [secrecyLevelId, setSecrecyLevelId] = useState("");
    const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
    const today = useMemo(() => new Date(), []);
    const todayISO = useMemo(() => formatISO(today), [today]);

    const [actualizationMode, setActualizationMode] = useState<ActualizationMode>("year");
    const [manualDueDate, setManualDueDate] = useState(""); // дд.мм.гггг — используется только в режиме "Ввод даты"

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ISO-версия введённой вручную даты (или "" если ещё не введена / некорректна) — то, что уйдёт на бэк
    const manualDueDateISO = useMemo(() => {
        const parsed = parseDDMMYYYY(manualDueDate);
        return parsed ? formatISO(parsed) : "";
    }, [manualDueDate]);

    // Если выбран пресет — дата считается от сегодня и не редактируется вручную.
    // Если выбран "Ввод даты" — используется то, что ввёл пользователь.
    const computedDueDate = actualizationMode === "date" ? manualDueDateISO : formatISO(addMonths(today, PERIOD_MONTHS[actualizationMode]));

    // То же самое, но в формате дд.мм.гггг — для отображения в DatePickerInput
    const computedDueDateDisplay =
        actualizationMode === "date" ? manualDueDate : formatDDMMYYYY(addMonths(today, PERIOD_MONTHS[actualizationMode]));

    const periodicityLabel =
        actualizationMode === "date"
            ? describeManualPeriod(manualDueDateISO, todayISO)
            : ACTUALIZATION_MODE_OPTIONS.find((o) => o.key === actualizationMode)?.label.toLowerCase() ?? "";

    const isValid =
        typeId !== "" &&
        organId !== null &&
        titleRu.trim() !== "" &&
        (actualizationMode !== "date" || manualDueDateISO !== "");

    const handleSubmit = async () => {
        if (!isValid || isSubmitting) return;

        setSubmitError(null);
        setIsSubmitting(true);

        const payload: CreateVndRequest = {
            typeId: Number(typeId),
            organId: Number(organId),
            titleRu: titleRu.trim(),
            titleEn: titleEn.trim() || null,
            titleKg: titleKy.trim() || null,
            keywordIds: keywordIds.map(Number),
            rubricIds: rubricIds.map(Number),
            secrecyLevelId: secrecyLevelId ? Number(secrecyLevelId) : null,
            userGroupIds: userGroupIds.map(Number),
            period: PERIOD_TO_BACKEND[actualizationMode],
            dueActualizationDate: actualizationMode === "date" ? computedDueDate : null,
            // developerId / responsibleExecutorIds не передаём — бэк подставит их
            // из текущего пользователя (его СП / начальника СП)
        };

        try {
            const created = await vndService.create(payload);
            navigate("/vnd/new/success", {state: {draft: created}});
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Не удалось создать ВНД");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
            <button
                onClick={() => navigate("/basevnd")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            <h1 className="m-0 mb-1 text-[23px] font-bold tracking-[-0.02em]">
                Разработка нового ВНД
            </h1>
            <p className="mt-0 mb-[13px] text-[#8b97ab] text-[13px]">
                Заполните карточку — код присваивается автоматически, редакция добавляется позже
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5">
                {/* Основная карточка */}
                <div className="bg-white border border-[#e9edf3] rounded-2xl px-6 py-[22px]">
                    <h2 className="m-0 mb-4 text-[15px] font-semibold">Карточка ВНД</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                                Вид документа <span className="text-[#c0392b]">*</span>
                            </label>
                            <SelectDropdown
                                value={typeId}
                                onChange={setTypeId}
                                searchable
                                searchPlaceholder="Поиск вида документа…"
                                placeholder="Вид ВНД"
                                options={typeOptions}
                                minWidth="100%"
                                className="w-full"
                            />
                        </div>

                        <TreeSelectField
                            label="Орган утверждения"
                            required={true}
                            modalTitle="Орган утверждения"
                            options={organOptions}
                            selectedKey={organId}
                            onChange={setOrganId}
                            searchPlaceholder="Поиск органа утверждения…"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                                Разработчик (СП)
                                <span className="text-[#c0392b]">{' '}*</span>
                            </label>
                            <div
                                className="h-10 px-3 rounded-[9px] border border-dashed border-[#dfe6ef] bg-[#fafbfd] flex items-center text-[12.5px] text-[#8b97ab]">
                                Определяется автоматически (текущий пользователь)
                            </div>
                        </div>
                        <div>
                            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                                Ответственные исполнители
                                <span className="text-[#c0392b]">{' '}*</span>
                            </label>
                            <div
                                className="h-10 px-3 rounded-[9px] border border-dashed border-[#dfe6ef] bg-[#fafbfd] flex items-center text-[12.5px] text-[#8b97ab]">
                                Начальники СП разработчика (авто)
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Заголовки
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                                    Заголовок (рус) <span className="text-[#c0392b]">*</span>
                                </label>
                                <input
                                    value={titleRu}
                                    onChange={(e) => setTitleRu(e.target.value)}
                                    placeholder="Наименование документа"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-[#3a4560] mb-1.5">
                                    Заголовок (кырг)
                                </label>
                                <input
                                    value={titleKy}
                                    onChange={(e) => setTitleKy(e.target.value)}
                                    placeholder="Документтин аталышы"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                                    Заголовок (англ)
                                </label>
                                <input
                                    value={titleEn}
                                    onChange={(e) => setTitleEn(e.target.value)}
                                    placeholder="Document title"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Классификаторы — на всю ширину под основной карточкой */}
                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mt-5">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Классификаторы
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <SelectListField
                                label="Ключевые слова"
                                modalTitle="Ключевые слова"
                                options={KEYWORDS.map((k) => ({key: k.id, label: k.name, parentId: k.parentId}))}
                                selectedKeys={keywordIds}
                                onChange={setKeywordIds}
                                searchPlaceholder="Поиск ключевых слов…"
                                hierarchical
                                boldLabel={false}
                            />
                            <SelectListField
                                label="Рубрикатор"
                                modalTitle="Рубрикатор"
                                options={RUBRICS.map((r) => ({key: r.id, label: r.name, parentId: r.parentId}))}
                                selectedKeys={rubricIds}
                                onChange={setRubricIds}
                                searchPlaceholder="Поиск рубрики…"
                                hierarchical
                                boldLabel={false}
                            />
                            <TreeSelectField
                                label="Уровень секретности"
                                modalTitle="Уровень секретности"
                                options={secrecyOptions}
                                selectedKey={secrecyLevelId || null}
                                onChange={(key) => setSecrecyLevelId(key ?? "")}
                                searchPlaceholder="Поиск уровня…"
                                boldLabel={false}
                            />
                            <SelectListField
                                label="Группы доступа"
                                modalTitle="Группы доступа"
                                options={USER_GROUPS.map((g) => ({key: g.id, label: g.name}))}
                                selectedKeys={userGroupIds}
                                onChange={setUserGroupIds}
                                searchPlaceholder="Поиск группы…"
                                boldLabel={false}
                            />
                        </div>
                    </div>

                    {submitError && (
                        <div className="mt-4 px-4 py-3 rounded-[9px] bg-[#fdecec] border border-[#f4c7c3] text-[#c0392b] text-[13px]">
                            {submitError}
                        </div>
                    )}
                </div>

                {/* Правая колонка: код + доп. реквизиты */}
                <div className="flex flex-col gap-4 h-full">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl p-5">
                        <div className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            Код документа
                        </div>
                        <div className="font-mono text-[26px] font-bold text-[#4e57d6] mt-2">
                            —
                        </div>
                        <div className="text-[11.5px] text-[#8b97ab] mt-1">
                            Код документа присваивается системой после сохранения
                        </div>
                        <div
                            className="mt-3.5 pt-3.5 border-t border-[#eef2f7] text-[12px] text-[#55617a] leading-[1.55]">
                            После утверждения временный идентификатор трансформируется в постоянный номер документа.
                        </div>
                    </div>

                    <div className="bg-white border border-[#e9edf3] rounded-2xl p-5 flex-1 flex flex-col">
                        <div className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            Срок актуализации
                        </div>
                        <p className="mt-2 mb-3 text-[11.5px] text-[#8b97ab] leading-[1.5]">
                            До какого числа нужно актуализировать ВНД. Выберите готовую периодичность (считается от даты
                            создания) — или задайте дату вручную, тогда периодичность посчитается сама.
                        </p>

                        <div className="flex flex-col gap-1 mb-3">
                            {ACTUALIZATION_MODE_OPTIONS.map((opt) => {
                                const isActive = actualizationMode === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setActualizationMode(opt.key)}
                                        className="w-full flex items-center gap-[9px] px-2.5 py-[7px] rounded-lg hover:bg-[#f6f8fb] text-left cursor-pointer"
                                    >
                    <span
                        className={`w-[18px] h-[18px] flex-none rounded-full border-[1.5px] grid place-items-center ${
                            isActive ? "border-[#4e57d6]" : "border-[#cbd3df]"
                        }`}
                    >
                        {isActive && <span className="w-[8px] h-[8px] rounded-full bg-[#4e57d6]"/>}
                    </span>
                                        <span
                                            className={`text-[12.5px] ${
                                                isActive ? "text-[#1c2740] font-semibold" : "text-[#3a4560]"
                                            }`}
                                        >
                        {opt.label}
                    </span>
                                    </button>
                                );
                            })}
                        </div>

                        <DatePickerInput
                            value={computedDueDateDisplay}
                            onChange={setManualDueDate}
                            disabled={actualizationMode !== "date"}
                            modal
                            modalTitle="Срок актуализации"
                        />

                        <div className="mt-3 pt-3 border-t border-[#eef2f7] text-[12px] text-[#55617a] leading-[1.55]">
                            Периодичность: <b className="text-[#1c2740]">{periodicityLabel}</b>
                        </div>
                    </div>
                </div>
            </div>


            {/* Навигация */}
            <div className="flex items-center gap-3 mt-4">
                <div className="flex-1"/>
                <button
                    onClick={() => navigate("/basevnd")}
                    disabled={isSubmitting}
                    className="h-11 px-[18px] rounded-[11px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[13.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    Отмена
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className={`inline-flex items-center gap-2 h-11 px-[22px] rounded-[11px] border-none font-semibold text-[14px] ${
                        isValid && !isSubmitting
                            ? "bg-[#4e57d6] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_8px_20px_-8px_#4e57d6]"
                            : "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                    }`}
                >
                    <Check className="w-[18px] h-[18px]" strokeWidth={2}/>
                    {isSubmitting ? "Создание…" : "Создать черновик-карточку"}
                </button>
            </div>
        </div>
    );
}