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
import {ACTUALIZATION_MODE_OPTIONS} from "@/hooks/useVndRequisitesForm.ts";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

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
    const isCancelledOrArchived = Boolean(vnd.cancelDate || vnd.archivedDate);
    const periodFrom = vnd.lastActualizationDate || vnd.effectiveDate || vnd.adoptionDate;
    const periodLabel = describePeriod(periodFrom, vnd.dueActualizationDate);

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
                    Реквизиты документа
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
                                Отмена
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="inline-flex items-center gap-2 h-8 px-[15px] rounded-[10px]
                                 border-none bg-[#4e57d6] text-white font-semibold text-[13px]
                                 cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6] disabled:opacity-60"
                            >
                                {saving && <Loader2 className="w-[16px] h-[16px] animate-spin" strokeWidth={2}/>}
                                Сохранить
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
                            Изменить реквизиты
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
                <Section icon={<FileText className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Основная информация">
                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label="Вид документа"
                                    modalTitle="Вид документа"
                                    options={typeOptions}
                                    selectedKey={draft.typeId || null}
                                    onChange={(key) => update("typeId", key ?? "")}
                                    boldLabel={false}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label="Орган утверждения"
                                    modalTitle="Орган утверждения"
                                    options={organOptions}
                                    selectedKey={draft.organId || null}
                                    onChange={(key) => update("organId", key ?? "")}
                                    boldLabel={false}
                                    required
                                />
                                <MultiSelectField
                                    label="Ответственные исполнители"
                                    modalTitle="Ответственные исполнители"
                                    options={executorOptions}
                                    selectedKeys={draft.responsibleExecutorIds}
                                    onChange={(ids) => update("responsibleExecutorIds", ids)}
                                    boldLabel={false}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                                <SingleSelectListField
                                    label="Разработчик (СП)"
                                    modalTitle="Разработчик (СП)"
                                    options={developerOptions}
                                    selectedKey={draft.developerId || null}
                                    onChange={(key) => update("developerId", key ?? "")}
                                    boldLabel={false}
                                />
                                <SingleSelectListField
                                    label="Куратор разработчика"
                                    modalTitle="Куратор разработчика"
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
                                <ReadOnlyField label="Вид документа" value={vnd.typeName || "—"}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <ReadOnlyField label="Орган утверждения" value={vnd.organName || "—"}/>
                                <ReadOnlyField
                                    label="Ответственные исполнители"
                                    value={responsibleExecutorNames(vnd.responsibleExecutorIds)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField label="Разработчик (СП)" value={vnd.developerName || "—"}/>
                                <ReadOnlyField label="Куратор разработчика" value={vnd.curatorDeveloperName || "—"}/>
                            </div>
                        </>
                    )}
                </Section>

                {/* Заголовки */}
                <Section icon={<Type className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Заголовки">
                    {isEditing ? (
                        <div className="flex flex-col gap-3 mx-auto px-22">
                            <EditableTextField label="Заголовок (рус)" value={draft.titleRu} onChange={(v) => update("titleRu", v)} required/>
                            <EditableTextField label="Заголовок (кырг)" value={draft.titleKg} onChange={(v) => update("titleKg", v)}/>
                            <EditableTextField label="Заголовок (англ)" value={draft.titleEn} onChange={(v) => update("titleEn", v)}/>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 mx-auto px-22">
                            <ReadOnlyField label="Заголовок (рус)" value={vnd.titleRu}/>
                            <ReadOnlyField label="Заголовок (кырг)" value={vnd.titleKg || "—"}/>
                            <ReadOnlyField label="Заголовок (англ)" value={vnd.titleEn || "—"}/>
                        </div>
                    )}
                </Section>

                {/* Принятие и вступление в силу / Изменения — в два столбца */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Section
                        icon={<CalendarCheck className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title="Принятие и вступление в силу"
                        noMarginBottom
                    >
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                                <EditableDateField label="Дата принятия" value={draft.adoptionDate} onChange={(v) => update("adoptionDate", v)}/>
                                <EditableTextField label="№ принятия" value={draft.adoptionCode} onChange={(v) => update("adoptionCode", v)}/>
                                <EditableDateField label="Дата вступления в силу" value={draft.effectiveDate} onChange={(v) => update("effectiveDate", v)}/>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField label="Дата принятия" value={formatDate(vnd.adoptionDate)}/>
                                <ReadOnlyField label="№ принятия" value={vnd.adoptionCode || "—"}/>
                                <ReadOnlyField label="Дата вступления в силу" value={formatDate(vnd.effectiveDate)}/>
                            </div>
                        )}
                    </Section>

                    {/* Изменения - всегда автоматически */}
                    <Section
                        icon={<History className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title="Изменения"
                        noMarginBottom
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                            <ReadOnlyField label="Изменение реквизитов" value={formatDate(vnd.requisitesChangedDate)}/>
                            <ReadOnlyField label="Изменение редакции" value={formatDate(vnd.revisionChangedDate)}/>
                        </div>

                        <Clue>
                            Эти даты проставляются автоматически: «Изменение реквизитов» — при сохранении реквизитов
                            документа, «Изменение редакции» — при согласовании новой редакции. Вручную их изменить нельзя.
                        </Clue>
                    </Section>
                </div>

                {/* Актуализация */}
                <Section icon={<RotateCw className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Актуализация">
                    {isEditing ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4 [&>*]:min-w-0">
                                <EditableDateField
                                    label="Дата посл. актуализации"
                                    value={draft.lastActualizationDate}
                                    onChange={(v) => update("lastActualizationDate", v)}
                                />
                                <EditableCheckboxField
                                    label="Последняя актуализация с изменениями"
                                    checked={draft.lastActualizationHadChanges}
                                    onChange={(v) => update("lastActualizationHadChanges", v)}
                                    disabled={!draft.lastActualizationDate}
                                />
                            </div>

                            <div className="border-t border-[#eef2f7] pt-4">
                                <span className="block text-[11.5px] text-[#8b97ab] mb-2">
                                    Срок актуализации — период
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
                                        modalTitle="Срок актуализации"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyField label="Срок актуализации" value={formatDate(vnd.dueActualizationDate)}/>
                            <ReadOnlyField label="Дата посл. актуализации" value={formatDate(vnd.lastActualizationDate)}/>
                            <ReadOnlyField label="Период" value={periodLabel}/>
                            <ReadOnlyField
                                label="Последняя актуализация с изменениям"
                                value={vnd.lastActualizationDate ? (vnd.lastActualizationHadChanges ? "Да" : "Нет") : "—"}
                            />
                        </div>
                    )}
                    <Clue className="mt-3">
                        Подробную историю всех актуализаций документа можно посмотреть в журнале актуализации ВНД.
                    </Clue>
                </Section>

                {/* Отмена и архивация */}
                {(isCancelledOrArchived || isEditing) && (
                    <Section icon={<Archive className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Отмена и архивация">
                        {isEditing ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                                    <EditableDateField label="Дата отмены" value={draft.cancelDate} onChange={(v) => update("cancelDate", v)}/>
                                    <EditableTextField label="№ отмены" value={draft.cancelCode} onChange={(v) => update("cancelCode", v)}/>
                                    <EditableDateField label="Дата архивации" value={draft.archivedDate} onChange={(v) => update("archivedDate", v)}/>
                                    <EditableTextField label="Дней в архиве" value={draft.daysInArchive} onChange={(v) => update("daysInArchive", v)}/>
                                </div>
                                <EditableTextAreaField
                                    label="Причина отмены"
                                    value={draft.cancelReason}
                                    onChange={(v) => update("cancelReason", v)}
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <ReadOnlyField label="Дата отмены" value={formatDate(vnd.cancelDate)}/>
                                <ReadOnlyField label="№ отмены" value={vnd.cancelCode || "—"}/>
                                <ReadOnlyField label="Причина отмены" value={vnd.cancelReason || "—"}/>
                                <ReadOnlyField label="Дата архивации" value={formatDate(vnd.archivedDate)}/>
                                <ReadOnlyField label="Дней в архиве" value={vnd.archivedDate ? String(vnd.daysInArchive) : "—"}/>
                            </div>
                        )}
                    </Section>
                )}

                {/* Классификаторы */}
                <Section icon={<Tags className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Классификаторы" noMarginBottom>
                    {isEditing ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                            <MultiSelectField
                                label="Ключевые слова"
                                modalTitle="Ключевые слова"
                                options={keywordOptions}
                                selectedKeys={draft.keywordIds}
                                onChange={(ids) => update("keywordIds", ids)}
                                hierarchical
                                boldLabel={false}
                            />
                            <MultiSelectField
                                label="Рубрикатор"
                                modalTitle="Рубрикатор"
                                options={rubricOptions}
                                selectedKeys={draft.rubricIds}
                                onChange={(ids) => update("rubricIds", ids)}
                                hierarchical
                                boldLabel={false}
                            />
                            <MultiSelectField
                                label="Группы доступа"
                                modalTitle="Группы доступа"
                                options={userGroupOptions}
                                selectedKeys={draft.userGroupIds}
                                onChange={(ids) => update("userGroupIds", ids)}
                                boldLabel={false}
                            />
                            <SingleSelectListField
                                label="Уровень секретности"
                                modalTitle="Уровень секретности"
                                options={secrecyOptions}
                                selectedKey={draft.secrecyLevelId || null}
                                onChange={(key) => update("secrecyLevelId", key ?? "")}
                                boldLabel={false}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyChipsField
                                label="Ключевые слова"
                                items={vnd.keywordIds.length ? keywordNames(vnd.keywordIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label="Рубрикатор"
                                items={vnd.rubricIds.length ? rubricNames(vnd.rubricIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label="Группы доступа"
                                items={vnd.userGroupIds.length ? userGroupNames(vnd.userGroupIds).split(", ") : []}
                            />
                            <ReadOnlyChipsField
                                label="Уровень секретности"
                                items={[secrecyLevelName(vnd.secrecyLevelId)]}
                            />
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}