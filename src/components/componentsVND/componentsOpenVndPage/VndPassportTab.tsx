import {Archive, CalendarCheck, FileText, History, Pencil, RotateCw, Tags, Type, X, Loader2} from "lucide-react";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ReadOnlyChipsField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyChipsField.tsx";
import {describePeriod, formatDate} from "@/utils/dateUtils.ts";
import { useVndDictionaryResolvers } from "@/hooks/vndHooks/useVndDictionaryResolvers.ts";
import {useVndRequisitesForm} from "@/hooks/useVndRequisitesForm.ts";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {
    EditableCheckboxField,
    EditableDateField, EditableTextAreaField,
    EditableTextField
} from "@/components/componentsGeneral/RequisitesEditFields.tsx";
import {getRequisitesActualizationModeOptions} from "@/hooks/useVndRequisitesForm.ts";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {useTranslation} from "react-i18next";

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
    const isCancelledOrArchived = Boolean(vnd.cancelDate || vnd.archivedDate);
    const isDraft = vnd.status === "draft";
    const periodFrom = vnd.lastActualizationDate || vnd.effectiveDate || vnd.adoptionDate;
    const periodLabel = describePeriod(periodFrom, vnd.dueActualizationDate);

    // Пересчитывается на каждом рендере — label в кнопках периода следует за текущим языком
    const actualizationModeOptions = getRequisitesActualizationModeOptions();

    const {
        keywordNames,
        responsibleExecutorNames,
        rubricNames,
        secrecyLevelName,
        userGroupNames,
    } = useVndDictionaryResolvers();

    const {
        isEditing, draft, saving, error, startEdit, cancelEdit, update, save,
        setActualizationMode, updateDueDateManually,
    } = useVndRequisitesForm(vnd, onVndChanged);

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
            <div className="flex items-center justify-between gap-2 mb-[15px]">
                <p className="m-0 text-[#8b97ab] text-[13px]">
                    {/* Реквизиты документа */}
                    {t("vndPassportTab.requisites")}
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
                                {/* Отмена */}
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
                                {/* Сохранить */}
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
                            {/* Изменить реквизиты */}
                            {t("vndPassportTab.editRequisites")}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-[15px] px-3.5 py-2.5 rounded-[10px] bg-[#fdecea] text-[#c0392b] text-[13px]">
                    {error}
                </div>
            )}

            <div className="border border-[#e9edf3] rounded-2xl px-6">

                {/* Основная информация */}
                <Section
                    icon={<FileText className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                    // "Основная информация"
                    title={t("vndPassportTab.sections.mainInfo")}
                >
                    {/* Инициатор и ответственный за актуализацию — всегда read-only,
                        независимо от режима редактирования: проставляются автоматически системой.
                        Ответственного за актуализацию не показываем для черновиков — там его
                        просто не может быть (документ ещё ни разу не проходил цикл актуализации). */}
                    <div className={`grid grid-cols-1 gap-4 mb-4 ${isDraft ? "" : "sm:grid-cols-2"}`}>
                        <ReadOnlyField label={t("vndPassportTab.fields.initiator")} value={vnd.createdByUserName || "—"}/>
                        {!isDraft && (
                            <ReadOnlyField
                                label={t("vndPassportTab.fields.actualizationResponsible")}
                                value={vnd.actualizationResponsibleUserName || "—"}
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
                                <MultiSelectField
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
                                    label={t("vndPassportTab.fields.curator")}
                                    modalTitle={t("vndPassportTab.fields.curator")}
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
                                <ReadOnlyField label={t("createVnd.fields.docType")} value={vnd.typeName || "—"}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <ReadOnlyField label={t("createVnd.fields.approvalBody")} value={vnd.organName || "—"}/>
                                <ReadOnlyField
                                    label={t("createVnd.fields.responsibleExecutors")}
                                    value={responsibleExecutorNames(vnd.responsibleExecutorIds)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField label={t("createVnd.fields.developer")} value={vnd.developerName || "—"}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.curator")} value={vnd.curatorDeveloperName || "—"}/>
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
                            <ReadOnlyField label={t("createVnd.titlesSection.titleRu")} value={vnd.titleRu}/>
                            <ReadOnlyField label={t("createVnd.titlesSection.titleKy")} value={vnd.titleKg || "—"}/>
                            <ReadOnlyField label={t("createVnd.titlesSection.titleEn")} value={vnd.titleEn || "—"}/>
                        </div>
                    )}
                </Section>

                {/* Принятие и вступление в силу / Изменения — в два столбца */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Section
                        icon={<CalendarCheck className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        // "Принятие и вступление в силу"
                        title={t("vndPassportTab.sections.adoption")}
                        noMarginBottom
                    >
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                                <EditableDateField label={t("vndPassportTab.fields.adoptionDate")} value={draft.adoptionDate} onChange={(v) => update("adoptionDate", v)}/>
                                <EditableTextField label={t("vndPassportTab.fields.adoptionCode")} value={draft.adoptionCode} onChange={(v) => update("adoptionCode", v)}/>
                                <EditableDateField label={t("vndPassportTab.fields.effectiveDate")} value={draft.effectiveDate} onChange={(v) => update("effectiveDate", v)}/>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField label={t("vndPassportTab.fields.adoptionDate")} value={formatDate(vnd.adoptionDate)}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.adoptionCode")} value={vnd.adoptionCode || "—"}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.effectiveDate")} value={formatDate(vnd.effectiveDate)}/>
                            </div>
                        )}
                    </Section>

                    {/* Изменения - всегда автоматически */}
                    <Section
                        icon={<History className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        // "Изменения"
                        title={t("vndPassportTab.sections.changes")}
                        noMarginBottom
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                            <ReadOnlyField label={t("vndPassportTab.fields.requisitesChangedDate")} value={formatDate(vnd.requisitesChangedDate)}/>
                            <ReadOnlyField label={t("vndPassportTab.fields.revisionChangedDate")} value={formatDate(vnd.revisionChangedDate)}/>
                        </div>

                        <Clue>
                            {/* Эти даты проставляются автоматически: «Изменение реквизитов» — при сохранении реквизитов
                            документа, «Изменение редакции» — при согласовании новой редакции. Вручную их изменить нельзя. */}
                            {t("vndPassportTab.clues.changesAutoDates")}
                        </Clue>
                    </Section>
                </div>

                {/* Актуализация */}
                <Section icon={<RotateCw className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("actualizationCard.label")}>
                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 [&>*]:min-w-0">
                                <EditableDateField
                                    label={t("vndPassportTab.fields.lastActualizationDate")}
                                    value={draft.lastActualizationDate}
                                    onChange={(v) => update("lastActualizationDate", v)}
                                />
                                <EditableCheckboxField
                                    label={t("vndPassportTab.fields.lastActualizationHadChanges")}
                                    checked={draft.lastActualizationHadChanges}
                                    onChange={(v) => update("lastActualizationHadChanges", v)}
                                    disabled={!draft.lastActualizationDate}
                                />
                            </div>

                            <div className="border-t border-[#eef2f7] pt-4">
                                <span className="block text-[11.5px] text-[#8b97ab] mb-2">
                                    {/* Срок актуализации — период */}
                                    {t("vndPassportTab.fields.actualizationPeriodLabel")}
                                </span>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {actualizationModeOptions.map((opt) => {
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
                                        modalTitle={t("actualizationCard.label")}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyField label={t("actualizationCard.label")} value={formatDate(vnd.dueActualizationDate)}/>
                            <ReadOnlyField label={t("vndPassportTab.fields.lastActualizationDate")} value={formatDate(vnd.lastActualizationDate)}/>
                            <ReadOnlyField label={t("vndPassportTab.fields.period")} value={periodLabel}/>
                            <ReadOnlyField
                                label={t("vndPassportTab.fields.lastActualizationWithChanges")}
                                value={vnd.lastActualizationDate ? (vnd.lastActualizationHadChanges ? t("general.yes") : t("general.no")) : "—"}
                            />
                        </div>
                    )}
                    <Clue className="mt-3">
                        {/* Подробную историю всех актуализаций документа можно посмотреть в журнале актуализации ВНД,
                        после добавления первой редакции. */}
                        {t("vndPassportTab.clues.actualizationHistory")}
                    </Clue>
                </Section>

                {/* Отмена и архивация */}
                {(isCancelledOrArchived || isEditing) && (
                    <Section icon={<Archive className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title={t("vndPassportTab.sections.cancelArchive")}>
                        {isEditing ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                                    <EditableDateField label={t("vndPassportTab.fields.cancelDate")} value={draft.cancelDate} onChange={(v) => update("cancelDate", v)}/>
                                    <EditableTextField label={t("vndPassportTab.fields.cancelCode")} value={draft.cancelCode} onChange={(v) => update("cancelCode", v)}/>
                                    <EditableDateField label={t("vndPassportTab.fields.archivedDate")} value={draft.archivedDate} onChange={(v) => update("archivedDate", v)}/>
                                    <EditableTextField label={t("vndPassportTab.fields.daysInArchive")} value={draft.daysInArchive} onChange={(v) => update("daysInArchive", v)}/>
                                </div>
                                <EditableTextAreaField
                                    label={t("vndPassportTab.fields.cancelReason")}
                                    value={draft.cancelReason}
                                    onChange={(v) => update("cancelReason", v)}
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <ReadOnlyField label={t("vndPassportTab.fields.cancelDate")} value={formatDate(vnd.cancelDate)}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.cancelCode")} value={vnd.cancelCode || "—"}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.cancelReason")} value={vnd.cancelReason || "—"}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.archivedDate")} value={formatDate(vnd.archivedDate)}/>
                                <ReadOnlyField label={t("vndPassportTab.fields.daysInArchive")} value={vnd.archivedDate ? String(vnd.daysInArchive) : "—"}/>
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
                                label={t("createVnd.classifiers.rubric")}
                                modalTitle={t("createVnd.classifiers.rubric")}
                                options={rubricOptions}
                                selectedKeys={draft.rubricIds}
                                onChange={(ids) => update("rubricIds", ids)}
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
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.keywords")}
                                items={vnd.keywordIds.length ? keywordNames(vnd.keywordIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.rubric")}
                                items={vnd.rubricIds.length ? rubricNames(vnd.rubricIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.userGroups")}
                                items={vnd.userGroupIds.length ? userGroupNames(vnd.userGroupIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label={t("createVnd.classifiers.secrecyLevel")}
                                items={[secrecyLevelName(vnd.secrecyLevelId)]}
                            />
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}