import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {describePeriod, formatDate} from "@/utils/dateUtils.ts";
import { useVndDictionaryResolvers } from "@/hooks/vndHooks/useVndDictionaryResolvers.ts";
import {useVndRequisitesForm} from "@/hooks/useVndRequisitesForm.ts";
import {ACTUALIZATION_MODE_OPTIONS} from "@/hooks/useVndRequisitesForm.ts";

import {Section} from "@/components/componentsGeneral/Section.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ReadOnlyChipsField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyChipsField.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {
    ParentMultiSelectField
} from "@/components/componentsGeneral/selects/MultiSelects/ParentMultiSelectField.tsx";
import {
    EditableCheckboxField,
    EditableDateField, EditableTextAreaField,
    EditableTextField
} from "@/components/componentsGeneral/RequisitesEditFields.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

import {Archive, CalendarCheck, FileText, History, Pencil, RotateCw, Tags, Type, X, Loader2} from "lucide-react";

interface DictOption {
    key: string;
    label: string;
}

interface VndPassportTabProps {
    vnd: VndResponse;
    onVndChanged?: (updated: VndResponse) => void;

    // Справочники для режима редактирования
    typeOptions: DictOption[];
    organOptions: DictOption[];
    developerOptions: DictOption[];
    curatorOptions: DictOption[];
    executorOptions: DictOption[];
    keywordOptions: DictOption[];
    rubricOptions: DictOption[];
    secrecyOptions: DictOption[];
    userGroupOptions: DictOption[];
}

export function VndPassportTab({
                                   vnd,
                                   onVndChanged,
                                   typeOptions,
                                   organOptions,
                                   developerOptions,
                                   curatorOptions,
                                   executorOptions,
                                   keywordOptions,
                                   rubricOptions,
                                   secrecyOptions,
                                   userGroupOptions,
                               }: VndPassportTabProps) {
    const {t} = useTranslation();
    const {user: authUser} = useAuth();
    const isInitiatorMe = Boolean(authUser && vnd.createdByUserId && authUser.id === vnd.createdByUserId);

    const isCancelledOrArchived = Boolean(vnd.cancelDate || vnd.archivedDate);
    const isDraft = vnd.status === "draft";
    const periodFrom = vnd.lastActualizationDate || vnd.effectiveDate || vnd.adoptionDate;
    const periodLabel = describePeriod(periodFrom, vnd.dueActualizationDate, t);

    const {
        keywordNames,
        responsibleExecutorNames,
        rubricNames,
        secrecyLevelName,
        userGroupNames,
    } = useVndDictionaryResolvers();

    // --- Реквизиты по редакциям (вкладки Р1/Р2/.../Рn) — см. миграцию "реквизиты по редакции".
    // TitleRu/En/Kg и TypeId остаются общими на весь документ (vnd), всё остальное показываем/
    // редактируем по конкретной редакции.
    const [redactions, setRedactions] = useState<VndRedactionResponse[]>([]);
    const [selectedRedactionId, setSelectedRedactionId] = useState<number | null>(null);
    const [showDiff, setShowDiff] = useState(false);

    const loadRedactions = () => {
        vndService.getRedactions(vnd.id).then((list) => {
            setRedactions(list);
            setSelectedRedactionId((prev) => {
                if (prev !== null && list.some((r) => r.id === prev)) return prev;
                const current = list.find((r) => r.isCurrent) ?? list[list.length - 1];
                return current ? current.id : null;
            });
        });
    };

    useEffect(loadRedactions, [vnd.id]);

    const selectedRedaction = redactions.find((r) => r.id === selectedRedactionId) ?? null;
    const previousRedaction = selectedRedaction
        ? redactions.find((r) => r.number === selectedRedaction.number - 1) ?? null
        : null;
    // Черновик без единой редакции ещё — тоже считаем "текущим" (fallback на vnd.* как и везде выше).
    const isViewingCurrentRedaction = !selectedRedaction || selectedRedaction.isCurrent;

    const {
        isEditing, draft, saving, error, startEdit, cancelEdit, update, save,
        setActualizationMode, updateDueDateManually,
    } = useVndRequisitesForm(vnd, selectedRedaction, (updated) => {
        onVndChanged?.(updated);
        loadRedactions();
    });

    // Реквизиты, которые сейчас показываем — из выбранной редакции, либо (пока у ВНД ещё нет
    // ни одной редакции — черновик) из самого документа, как было раньше.
    const activeRequisites = useMemo(() => ({
        titleRu: selectedRedaction?.titleRu ?? vnd.titleRu,
        titleEn: selectedRedaction?.titleEn ?? vnd.titleEn,
        titleKg: selectedRedaction?.titleKg ?? vnd.titleKg,
        typeId: selectedRedaction?.typeId ?? vnd.typeId,
        typeName: selectedRedaction?.typeName ?? vnd.typeName,
        organId: selectedRedaction?.organId ?? vnd.organId,
        organName: selectedRedaction?.organName ?? vnd.organName,
        developerId: selectedRedaction?.developerId ?? vnd.developerId,
        developerName: selectedRedaction?.developerName ?? vnd.developerName,
        curatorDeveloperId: selectedRedaction?.curatorDeveloperId ?? vnd.curatorDeveloperId,
        curatorDeveloperName: selectedRedaction?.curatorDeveloperName ?? vnd.curatorDeveloperName,
        responsibleExecutorIds: selectedRedaction?.responsibleExecutorIds ?? vnd.responsibleExecutorIds,
        // ⚠ 07.09.2026: раньше здесь был "?? vnd.adoptionDate/adoptionCode/effectiveDate" — с `??`
        // это срабатывало не только когда selectedRedaction === null (черновик без единой редакции —
        // тут фолбэк на vnd.* по-прежнему нужен, см. комментарий выше), но и когда редакция ВЫБРАНА,
        // а её собственное значение легитимно пустое (у прошлых редакций adoptionCode/effectiveDate
        // намеренно null — см. миграцию, там должен быть прочерк). `??` не различает эти два случая —
        // подставлял значения ТЕКУЩЕЙ редакции (vnd.* всегда равны её значениям) вместо прочерка при
        // просмотре Р1/Р2/.../Рn. Явная проверка на selectedRedaction вместо `??` разруливает оба
        // случая правильно: нет редакции вообще -> vnd.*; редакция выбрана -> ровно её значение,
        // пусть даже пустое.
        adoptionDate: selectedRedaction ? selectedRedaction.adoptionDate : vnd.adoptionDate,
        adoptionCode: selectedRedaction ? selectedRedaction.adoptionCode : vnd.adoptionCode,
        effectiveDate: selectedRedaction ? selectedRedaction.effectiveDate : vnd.effectiveDate,
        // "Изменение редакции": момент, когда файл ИМЕННО ЭТОЙ редакции реально заменялся в
        // системе (docRuUpdatedAt — проставляется в EditLastRevisionDirectlyAsync /
        // ResubmitAfterRevisionAsync на бэке). Если редакцию ни разу не трогали после переноса/
        // создания (docRuUpdatedAt === null — типичный случай для мигрированных из isrib
        // документов), берём дату принятия этой же редакции — для старых документов файл и есть
        // "дата принятия", отдельного факта изменения не было. Раньше здесь было document-level
        // vnd.revisionChangedDate — одно значение на весь документ, поэтому во всех вкладках
        // Р1/Р2/.../Рn показывалась одна и та же (последняя) дата вместо даты именно этой редакции.
        revisionChangedDate: selectedRedaction
            ? (selectedRedaction.docRuUpdatedAt ?? selectedRedaction.adoptionDate ?? selectedRedaction.createdAt)
            : vnd.revisionChangedDate,
        keywordIds: selectedRedaction?.keywordIds ?? vnd.keywordIds,
        rubricIds: selectedRedaction?.rubricIds ?? vnd.rubricIds,
        secrecyLevelId: selectedRedaction?.secrecyLevelId ?? vnd.secrecyLevelId,
    }), [selectedRedaction, vnd]);

    // Подсветка отличий от предыдущей редакции (чекбокс "Показать изменения") — работает только
    // когда обе редакции загружены и есть с чем сравнивать (для Р1 предыдущей нет).
    const canShowDiff = Boolean(selectedRedaction && previousRedaction);

    function diffScalar(getter: (r: VndRedactionResponse) => string | number | null): boolean {
        if (!showDiff || !selectedRedaction || !previousRedaction) return false;
        return getter(selectedRedaction) !== getter(previousRedaction);
    }

    function diffArray(getter: (r: VndRedactionResponse) => number[]): boolean {
        if (!showDiff || !selectedRedaction || !previousRedaction) return false;
        const a = [...getter(selectedRedaction)].sort((x, y) => x - y);
        const b = [...getter(previousRedaction)].sort((x, y) => x - y);
        return a.length !== b.length || a.some((v, i) => v !== b[i]);
    }

    function isoToDisplayDate(iso: string): string {
        if (!iso) return "";
        const [y, m, d] = iso.split("-");
        if (!y || !m || !d) return "";
        return `${d}.${m}.${y}`;
    }

    function displayToIsoDate(display: string): string {
        if (!display) return "";
        const [d, m, y] = display.split(".");
        if (!d || !m || !y || y.length !== 4) return "";
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return (
        <>
            <div className="px-4 sm:px-6 flex items-center justify-between gap-2 mb-[15px]">
                <p className="m-0 text-[#8b97ab] text-[13px]">
                    {t("openVndPage.passportTab.subtitle")}
                </p>

                <div className="flex gap-2.5">
                    {isEditing ? (
                        <>
                            <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="inline-flex items-center gap-2 h-8 px-[15px] rounded-[10px]
                                 border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px]
                                 cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                                {t("general.cancel")}
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="inline-flex items-center gap-2 h-8 px-[15px] rounded-[10px]
                                 border-none bg-[#4e57d6] text-white font-semibold text-[13px]
                                 cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6] disabled:opacity-60"
                            >
                                {saving && <Loader2 className="w-[16px] h-[16px] animate-spin" strokeWidth={2}/>}
                                {t("general.save")}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={startEdit}
                            className="inline-flex items-center gap-2 h-8 px-[15px] rounded-[10px]
                             border-none bg-[#4e57d6] text-white font-semibold text-[13px]
                             cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                        >
                            <Pencil className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {t("openVndPage.passportTab.editButton")}
                        </button>
                    )}
                </div>
            </div>

            {redactions.length > 1 && (
                <div className="px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 mb-[15px]">
                    <div className="flex flex-wrap gap-1.5">
                        {redactions.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                disabled={isEditing}
                                onClick={() => setSelectedRedactionId(r.id)}
                                title={r.code}
                                className={`inline-flex items-center h-8 px-3.5 rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    r.id === selectedRedactionId
                                        ? "bg-[#4e57d6] text-white"
                                        : "bg-[#f6f8fb] text-[#55617a] hover:bg-[#eef2f7]"
                                }`}
                            >
                                {t("openVndPage.passportTab.redactionTabLabel", {number: r.number})}
                            </button>
                        ))}
                    </div>

                    <label
                        className={`inline-flex items-center gap-2 text-[13px] text-[#55617a] select-none ${
                            canShowDiff ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={showDiff}
                            disabled={!canShowDiff}
                            onChange={(e) => setShowDiff(e.target.checked)}
                            className="w-[15px] h-[15px] cursor-pointer disabled:cursor-not-allowed"
                        />
                        {t("openVndPage.passportTab.showDiffCheckbox")}
                    </label>
                </div>
            )}

            {error && (
                <div className="mb-[15px] px-3.5 py-2.5 rounded-[10px] bg-[#fdecea] text-[#c0392b] text-[13px]">
                    {error}
                </div>
            )}

            <div className="border border-[#e9edf3] rounded-2xl px-6">

                {/* Основная информация */}
                <Section icon={<FileText className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("openVndPage.passportTab.sections.mainInfo")}>
                    {/* Инициатор и ответственный за актуализацию — всегда read-only,
                        независимо от режима редактирования: проставляются автоматически системой.
                        Ответственного за актуализацию не показываем для черновиков — там его
                        просто не может быть (документ ещё ни разу не проходил цикл актуализации). */}
                    <div className={`grid grid-cols-1 gap-4 mb-4 ${isDraft ? "" : "sm:grid-cols-2"}`}>
                        <ReadOnlyField
                            label={t("openVndPage.passportTab.initiatorLabel")}
                            value={vnd.createdByUserName ? `${vnd.createdByUserName}${isInitiatorMe ? t("openVndPage.passportTab.meSuffix") : ""}` : "—"}
                            linkTo={vnd.createdByUserId ? (isInitiatorMe ? "/profile" : `/users/${vnd.createdByUserId}`) : undefined}
                        />
                        {!isDraft && (
                            <ReadOnlyField
                                label={t("openVndPage.passportTab.actualizationResponsibleLabel")}
                                value={vnd.actualizationResponsibleUserName || "—"}
                                linkTo={vnd.actualizationResponsibleUserId ? `/users/${vnd.actualizationResponsibleUserId}` : undefined}
                            />
                        )}
                    </div>

                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label={t("createVnd.fields.docType")}
                                    modalTitle={t("createVnd.fields.docType")}
                                    options={typeOptions}
                                    selectedKey={draft.typeId || null}
                                    onChange={(key) => update("typeId", key ?? "")}
                                    boldLabel={false}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label={t("createVnd.fields.approvalBody")}
                                    modalTitle={t("createVnd.fields.approvalBody")}
                                    options={organOptions}
                                    selectedKey={draft.organId || null}
                                    onChange={(key) => update("organId", key ?? "")}
                                    boldLabel={false}
                                    required
                                />
                                <ParentMultiSelectField
                                    label={t("createVnd.fields.responsibleExecutors")}
                                    modalTitle={t("createVnd.fields.responsibleExecutors")}
                                    options={executorOptions}
                                    selectedKeys={draft.responsibleExecutorIds}
                                    onChange={(ids) => update("responsibleExecutorIds", ids)}
                                    boldLabel={false}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label={t("createVnd.fields.developer")}
                                    modalTitle={t("createVnd.fields.developer")}
                                    options={developerOptions}
                                    selectedKey={draft.developerId || null}
                                    onChange={(key) => update("developerId", key ?? "")}
                                    boldLabel={false}
                                />
                                <SingleSelectListField
                                    label={t("openVndPage.passportTab.curatorLabel")}
                                    modalTitle={t("openVndPage.passportTab.curatorLabel")}
                                    options={curatorOptions}
                                    selectedKey={draft.curatorDeveloperId || null}
                                    onChange={(key) => update("curatorDeveloperId", key ?? "")}
                                    boldLabel={false}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <ReadOnlyField
                                    label={t("createVnd.fields.docType")}
                                    value={activeRequisites.typeName || "—"}
                                    highlighted={diffScalar((r) => r.typeId)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <ReadOnlyField
                                    label={t("createVnd.fields.approvalBody")}
                                    value={activeRequisites.organName || "—"}
                                    highlighted={diffScalar((r) => r.organId)}
                                />
                                <ReadOnlyField
                                    label={t("createVnd.fields.responsibleExecutors")}
                                    value={responsibleExecutorNames(activeRequisites.responsibleExecutorIds)}
                                    highlighted={diffArray((r) => r.responsibleExecutorIds)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField
                                    label={t("createVnd.fields.developer")}
                                    value={activeRequisites.developerName || "—"}
                                    highlighted={diffScalar((r) => r.developerId)}
                                />
                                <ReadOnlyField
                                    label={t("openVndPage.passportTab.curatorLabel")}
                                    value={activeRequisites.curatorDeveloperName || "—"}
                                    highlighted={diffScalar((r) => r.curatorDeveloperId ?? 0)}
                                    linkTo={activeRequisites.curatorDeveloperId ? `/users/${activeRequisites.curatorDeveloperId}` : undefined}
                                />
                            </div>
                        </>
                    )}
                </Section>

                {/* Заголовки */}
                <Section icon={<Type className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("createVnd.titlesSection.title")}>
                    {isEditing ? (
                        <div className="flex flex-col gap-3 mx-auto px-22">
                            <EditableTextField label={t("createVnd.titlesSection.titleRu")} value={draft.titleRu} onChange={(v) => update("titleRu", v)} required/>
                            <EditableTextField label={t("createVnd.titlesSection.titleKy")} value={draft.titleKg} onChange={(v) => update("titleKg", v)}/>
                            <EditableTextField label={t("createVnd.titlesSection.titleEn")} value={draft.titleEn} onChange={(v) => update("titleEn", v)}/>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 mx-auto px-22">
                            <ReadOnlyField
                                label={t("createVnd.titlesSection.titleRu")}
                                value={activeRequisites.titleRu}
                                highlighted={diffScalar((r) => r.titleRu)}
                            />
                            <ReadOnlyField
                                label={t("createVnd.titlesSection.titleKy")}
                                value={activeRequisites.titleKg || "—"}
                                highlighted={diffScalar((r) => r.titleKg)}
                            />
                            <ReadOnlyField
                                label={t("createVnd.titlesSection.titleEn")}
                                value={activeRequisites.titleEn || "—"}
                                highlighted={diffScalar((r) => r.titleEn)}
                            />
                        </div>
                    )}
                </Section>

                {/* Принятие и вступление в силу / Изменения — в два столбца */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Section
                        icon={<CalendarCheck className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title={t("openVndPage.passportTab.sections.adoption")}
                        noMarginBottom
                    >
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                                <EditableDateField label={t("openVndPage.passportTab.adoptionDateLabel")} value={draft.adoptionDate} onChange={(v) => update("adoptionDate", v)}/>
                                <EditableTextField label={t("openVndPage.passportTab.adoptionCodeLabel")} value={draft.adoptionCode} onChange={(v) => update("adoptionCode", v)}/>
                                <EditableDateField
                                    label={t("openVndPage.passportTab.effectiveDateLabel")}
                                    value={draft.effectiveDate}
                                    onChange={(v) => update("effectiveDate", v)}
                                    helpText={t("openVndPage.passportTab.effectiveDateHelp")}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField
                                    label={t("openVndPage.passportTab.adoptionDateLabel")}
                                    value={formatDate(activeRequisites.adoptionDate)}
                                    highlighted={diffScalar((r) => r.adoptionDate)}
                                />
                                <ReadOnlyField
                                    label={t("openVndPage.passportTab.adoptionCodeLabel")}
                                    value={activeRequisites.adoptionCode || "—"}
                                    highlighted={diffScalar((r) => r.adoptionCode)}
                                />
                                <ReadOnlyField
                                    label={t("openVndPage.passportTab.effectiveDateLabel")}
                                    value={formatDate(activeRequisites.effectiveDate)}
                                    highlighted={diffScalar((r) => r.effectiveDate)}
                                />
                            </div>
                        )}
                    </Section>

                    {/* Изменения - всегда автоматически */}
                    <Section
                        icon={<History className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title={t("openVndPage.passportTab.sections.changes")}
                        noMarginBottom
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                            <ReadOnlyField label={t("openVndPage.passportTab.requisitesChangedLabel")} value={formatDate(vnd.requisitesChangedDate)}/>
                            <ReadOnlyField
                                label={t("openVndPage.passportTab.revisionChangedLabel")}
                                value={formatDate(activeRequisites.revisionChangedDate)}
                                highlighted={diffScalar((r) => r.docRuUpdatedAt ?? r.adoptionDate ?? r.createdAt)}
                            />
                        </div>

                        <Clue>
                            {t("openVndPage.passportTab.changesClue")}
                        </Clue>
                    </Section>
                </div>

                {/* Актуализация */}
                <Section icon={<RotateCw className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("openVndPage.passportTab.sections.actualization")}>
                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 [&>*]:min-w-0">
                                <EditableDateField
                                    label={t("openVndPage.passportTab.lastActualizationDateLabel")}
                                    value={draft.lastActualizationDate}
                                    onChange={(v) => update("lastActualizationDate", v)}
                                />
                                <EditableCheckboxField
                                    label={t("openVndPage.passportTab.lastActualizationHadChangesLabel")}
                                    checked={draft.lastActualizationHadChanges}
                                    onChange={(v) => update("lastActualizationHadChanges", v)}
                                    disabled={!draft.lastActualizationDate}
                                />
                            </div>

                            <div className="border-t border-[#eef2f7] pt-4">
                                <span className="block text-[11.5px] text-[#8b97ab] mb-2">
                                    {t("openVndPage.passportTab.actualizationPeriodModeLabel")}
                                </span>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {ACTUALIZATION_MODE_OPTIONS.map((opt) => {
                                        const isActive = draft.actualizationMode === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => setActualizationMode(opt.key)}
                                                className={`inline-flex items-center gap-[7px] px-2.5 py-[6px] rounded-full text-[12px] cursor-pointer ${
                                                    isActive
                                                        ? "bg-[#ececfc] text-[#4e57d6] font-semibold"
                                                        : "bg-[#f6f8fb] text-[#55617a] hover:bg-[#eef2f7]"
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="max-w-[260px]">
                                    <DatePickerInput
                                        value={draft.dueActualizationDate ? isoToDisplayDate(draft.dueActualizationDate) : ""}
                                        onChange={(display) => updateDueDateManually(displayToIsoDate(display))}
                                        disabled={draft.actualizationMode !== "Custom"}
                                        modal
                                        modalTitle={t("openVndPage.passportTab.dueActualizationDateModalTitle")}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        // ⚠ 08.09.2026: "Дата посл. актуализации"/"Последняя актуализация с изменениями" —
                        // это факт о ДОКУМЕНТЕ в целом (когда его в последний раз актуализировали), а не о
                        // конкретной старой редакции. У самой первой редакции (Р1, как и у любой не-текущей)
                        // актуализации ещё не было/не относится к ней — раньше эти два поля всё равно
                        // показывались (значения vnd.* одинаковы на любой вкладке), из-за чего на Р1 виден
                        // был "факт актуализации", которого для неё быть не может. "Срок актуализации" и
                        // "Период" остаются документ-уровневыми и показываются всегда — вопрос "когда
                        // следующая актуализация" не зависит от того, какую редакцию сейчас смотрят.
                        <div className={`grid grid-cols-2 gap-4 ${isViewingCurrentRedaction ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
                            <ReadOnlyField label={t("openVndPage.passportTab.dueActualizationDateLabel")} value={formatDate(vnd.dueActualizationDate)}/>
                            {isViewingCurrentRedaction && (
                                <ReadOnlyField label={t("openVndPage.passportTab.lastActualizationDateLabel")} value={formatDate(vnd.lastActualizationDate)}/>
                            )}
                            <ReadOnlyField label={t("openVndPage.passportTab.periodLabel")} value={periodLabel}/>
                            {isViewingCurrentRedaction && (
                                <ReadOnlyField
                                    label={t("openVndPage.passportTab.lastActualizationHadChangesLabel")}
                                    value={vnd.lastActualizationDate ? (vnd.lastActualizationHadChanges ? t("openVndPage.passportTab.yes") : t("openVndPage.passportTab.no")) : "—"}
                                />
                            )}
                        </div>
                    )}
                    <Clue className="mt-3">
                        {t("openVndPage.passportTab.actualizationClue")}
                    </Clue>
                </Section>

                {/* Отмена и архивация */}
                {(isCancelledOrArchived || isEditing) && (
                    <Section icon={<Archive className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("openVndPage.passportTab.sections.cancelArchive")}>
                        {isEditing ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                                    <EditableDateField label={t("openVndPage.passportTab.cancelDateLabel")} value={draft.cancelDate} onChange={(v) => update("cancelDate", v)}/>
                                    <EditableTextField label={t("openVndPage.passportTab.cancelCodeLabel")} value={draft.cancelCode} onChange={(v) => update("cancelCode", v)}/>
                                    <EditableDateField label={t("openVndPage.passportTab.archivedDateLabel")} value={draft.archivedDate} onChange={(v) => update("archivedDate", v)}/>
                                    <EditableTextField label={t("openVndPage.passportTab.daysInArchiveLabel")} value={draft.daysInArchive} onChange={(v) => update("daysInArchive", v)}/>
                                </div>
                                <EditableTextAreaField
                                    label={t("openVndPage.passportTab.cancelReasonLabel")}
                                    value={draft.cancelReason}
                                    onChange={(v) => update("cancelReason", v)}
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <ReadOnlyField label={t("openVndPage.passportTab.cancelDateLabel")} value={formatDate(vnd.cancelDate)}/>
                                <ReadOnlyField label={t("openVndPage.passportTab.cancelCodeLabel")} value={vnd.cancelCode || "—"}/>
                                <ReadOnlyField label={t("openVndPage.passportTab.cancelReasonLabel")} value={vnd.cancelReason || "—"}/>
                                <ReadOnlyField label={t("openVndPage.passportTab.archivedDateLabel")} value={formatDate(vnd.archivedDate)}/>
                                <ReadOnlyField label={t("openVndPage.passportTab.daysInArchiveLabel")} value={vnd.archivedDate ? String(vnd.daysInArchive) : "—"}/>
                            </div>
                        )}
                    </Section>
                )}

                {/* Классификаторы */}
                <Section icon={<Tags className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("createVnd.classifiers.title")} noMarginBottom>
                    {isEditing ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                            <MultiSelectField
                                label={t("createVnd.classifiers.keywords")}
                                modalTitle={t("createVnd.classifiers.keywords")}
                                options={keywordOptions}
                                selectedKeys={draft.keywordIds}
                                onChange={(ids) => update("keywordIds", ids)}
                                hierarchical
                                boldLabel={false}
                            />
                            <MultiSelectField
                                label={t("createVnd.classifiers.userGroups")}
                                modalTitle={t("createVnd.classifiers.userGroups")}
                                options={userGroupOptions}
                                selectedKeys={draft.userGroupIds}
                                onChange={(ids) => update("userGroupIds", ids)}
                                boldLabel={false}
                            />
                            <SingleSelectListField
                                label={t("createVnd.classifiers.secrecyLevel")}
                                modalTitle={t("createVnd.classifiers.secrecyLevel")}
                                options={secrecyOptions}
                                selectedKey={draft.secrecyLevelId || null}
                                onChange={(key) => update("secrecyLevelId", key ?? "")}
                                boldLabel={false}
                            />
                            <MultiSelectField
                                label={t("createVnd.classifiers.rubric")}
                                modalTitle={t("createVnd.classifiers.rubric")}
                                options={rubricOptions}
                                selectedKeys={draft.rubricIds}
                                onChange={(ids) => update("rubricIds", ids)}
                                hierarchical
                                boldLabel={false}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.keywords")}
                                items={activeRequisites.keywordIds.length ? keywordNames(activeRequisites.keywordIds).split(", ") : []}
                                highlighted={diffArray((r) => r.keywordIds)}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.userGroups")}
                                items={vnd.userGroupIds.length ? userGroupNames(vnd.userGroupIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.secrecyLevel")}
                                items={[secrecyLevelName(activeRequisites.secrecyLevelId)]}
                                highlighted={diffScalar((r) => r.secrecyLevelId)}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.rubric")}
                                items={activeRequisites.rubricIds.length ? rubricNames(activeRequisites.rubricIds).split(", ") : []}
                                highlighted={diffArray((r) => r.rubricIds)}
                            />
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}