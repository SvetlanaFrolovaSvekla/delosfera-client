import {Archive, CalendarCheck, FileText, History, Pencil, RotateCw, Tags, Type} from "lucide-react";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ReadOnlyChipsField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyChipsField.tsx";
import {describePeriod, formatDate} from "@/utils/dateUtils.ts";
import {
    keywordNames,
    responsibleExecutorNames,
    rubricNames,
    secrecyLevelName,
    userGroupNames,
} from "@/utils/vndDictionaryResolvers.ts";

interface VndPassportTabProps {
    vnd: VndResponse;
    /** Клик по кнопке «Изменить реквизиты» */
    onEditRequisites?: () => void;
}

export function VndPassportTab({vnd, onEditRequisites}: VndPassportTabProps) {
    const isCancelledOrArchived = Boolean(vnd.cancelDate || vnd.archivedDate);
    const periodFrom = vnd.lastActualizationDate || vnd.effectiveDate || vnd.adoptionDate;
    const periodLabel = describePeriod(periodFrom, vnd.dueActualizationDate);

    return (
        <>
            <div className="flex items-center justify-between gap-2 mb-[15px]">
                <p className="m-0 text-[#8b97ab] text-[13px]">
                    Реквизиты документа
                </p>

                <div className="flex gap-2.5">
                    <button
                        onClick={onEditRequisites}
                        className="inline-flex items-center gap-2 h-8 px-[15px] rounded-[10px]
                         border-none bg-[#4e57d6] text-white font-semibold text-[13px]
                         cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Pencil className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Изменить реквизиты
                    </button>
                </div>
            </div>

            <div className="border border-[#e9edf3] rounded-2xl px-6">

                {/* Основная информация */}
                <Section icon={<FileText className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Основная информация">
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
                </Section>

                {/* Заголовки */}
                <Section icon={<Type className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Заголовки">
                    <div className="flex flex-col gap-3 mx-auto px-22">
                        <ReadOnlyField label="Заголовок (рус)" value={vnd.titleRu}/>
                        <ReadOnlyField label="Заголовок (кырг)" value={vnd.titleKg || "—"}/>
                        <ReadOnlyField label="Заголовок (англ)" value={vnd.titleEn || "—"}/>
                    </div>
                </Section>

                {/* Принятие и вступление в силу / Изменения — в два столбца */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Section
                        icon={<CalendarCheck className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title="Принятие и вступление в силу"
                        noMarginBottom
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ReadOnlyField label="Дата принятия" value={formatDate(vnd.adoptionDate)}/>
                            <ReadOnlyField label="№ принятия" value={vnd.adoptionCode || "—"}/>
                            <ReadOnlyField label="Дата вступления в силу" value={formatDate(vnd.effectiveDate)}/>
                        </div>
                    </Section>

                    <Section
                        icon={<History className="w-[15px] h-[15px]" strokeWidth={1.9}/>}
                        title="Изменения"
                        noMarginBottom
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ReadOnlyField label="Изменение реквизитов" value={formatDate(vnd.requisitesChangedDate)}/>
                            <ReadOnlyField label="Изменение редакции" value={formatDate(vnd.revisionChangedDate)}/>
                        </div>
                    </Section>
                </div>

                {/* Актуализация */}
                <Section icon={<RotateCw className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Актуализация">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReadOnlyField label="Срок актуализации" value={formatDate(vnd.dueActualizationDate)}/>
                        <ReadOnlyField label="Дата посл. актуализации" value={formatDate(vnd.lastActualizationDate)}/>
                        <ReadOnlyField label="Период" value={periodLabel}/>
                        <ReadOnlyField
                            label="С изменениями"
                            value={vnd.lastActualizationDate ? (vnd.lastActualizationHadChanges ? "Да" : "Нет") : "—"}
                        />
                    </div>
                </Section>

                {/* Отмена и архивация */}
                {isCancelledOrArchived && (
                    <Section icon={<Archive className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Отмена и архивация">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <ReadOnlyField label="Дата отмены" value={formatDate(vnd.cancelDate)}/>
                            <ReadOnlyField label="№ отмены" value={vnd.cancelCode || "—"}/>
                            <ReadOnlyField label="Причина отмены" value={vnd.cancelReason || "—"}/>
                            <ReadOnlyField label="Дата архивации" value={formatDate(vnd.archivedDate)}/>
                            <ReadOnlyField label="Дней в архиве" value={vnd.archivedDate ? String(vnd.daysInArchive) : "—"}/>
                        </div>
                    </Section>
                )}

                {/* Классификаторы */}
                <Section icon={<Tags className="w-[15px] h-[15px]" strokeWidth={1.9}/>} title="Классификаторы" noMarginBottom>
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
                </Section>
            </div>
        </>
    );
}