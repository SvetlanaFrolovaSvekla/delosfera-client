import {useCreateVndForm} from "@/hooks/vndHooks/useCreateVndForm.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {VndTitlesSection} from "@/components/componentsVND/componentsCreateVndPage/VndTitlesSection.tsx";
import {VndClassifiersSection} from "@/components/componentsVND/componentsCreateVndPage/VndClassifiersSection.tsx";
import {VndCodeCard} from "@/components/componentsVND/componentsCreateVndPage/VndCodeCard.tsx";
import {VndActualizationCard} from "@/components/componentsVND/componentsCreateVndPage/VndActualizationCard.tsx";
import {VndCreateSuccessModal} from "@/components/componentsVND/componentsCreateVndPage/VndCreateSuccessModal.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ArrowLeft, Check} from "lucide-react";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

export function CreateVndPage() {
    const form = useCreateVndForm();
    const {actualization} = form;

    if (form.dictionariesLoading) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
                <Loader label="Загрузка справочников…" fullHeight={false}/>
            </div>
        );
    }

    if (form.dictionariesError) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
                <EmptyState variant="error" title="Не удалось загрузить данные!" description={form.dictionariesError}/>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
            <button
                onClick={form.goBack}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            <h1 className="m-0 mb-1 text-[23px] font-bold tracking-[-0.02em]">
                Разработка нового ВНД
            </h1>
            <p className="mt-0 mb-[13px] text-[#8b97ab] text-[13px]">
                Пожалуйста, заполните карточку — код присваивается автоматически, редакция добавляется позже
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
                                value={form.typeId}
                                onChange={form.setTypeId}
                                searchable
                                searchPlaceholder="Поиск вида документа…"
                                placeholder="Вид ВНД"
                                options={form.typeOptions}
                                minWidth="100%"
                                className="w-full"
                            />
                        </div>

                        <SingleSelectListField
                            label="Орган утверждения"
                            required
                            modalTitle="Орган утверждения"
                            options={form.organOptions}
                            selectedKey={form.organId}
                            onChange={form.setOrganId}
                            searchPlaceholder="Поиск органа утверждения…"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 items-start">
                        <div>
                            <ReadOnlyField label="Разработчик (СП)" value={form.developerName || "—"}/>
                            {form.developerHeadName && (
                                <p className="mt-1 text-[11px] text-[#8b97ab]">
                                    Начальник СП: {form.developerHeadName}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                                Ответственные исполнители <span className="text-[#c0392b]">*</span>
                            </label>
                            <MultiSelectField
                                modalTitle="Ответственные исполнители"
                                options={form.executorOptions}
                                selectedKeys={form.responsibleExecutorIds}
                                onChange={form.setResponsibleExecutorIds}
                                searchPlaceholder="Поиск СП…"
                                boldLabel={false}
                            />
                            {form.responsibleExecutorHeadNames.length > 0 && (
                                <p className="mt-1 text-[11px] text-[#8b97ab]">
                                    Начальники: {form.responsibleExecutorHeadNames.join(", ")}
                                </p>
                            )}
                        </div>
                    </div>

                    <VndTitlesSection
                        titleRu={form.titleRu}
                        onTitleRuChange={form.setTitleRu}
                        titleKy={form.titleKy}
                        onTitleKyChange={form.setTitleKy}
                        titleEn={form.titleEn}
                        onTitleEnChange={form.setTitleEn}
                    />

                    <VndClassifiersSection
                        keywordIds={form.keywordIds}
                        onKeywordIdsChange={form.setKeywordIds}
                        keywordOptions={form.keywordOptions}
                        rubricIds={form.rubricIds}
                        onRubricIdsChange={form.setRubricIds}
                        rubricOptions={form.rubricOptions}
                        secrecyOptions={form.secrecyOptions}
                        secrecyLevelId={form.secrecyLevelId}
                        onSecrecyLevelIdChange={form.setSecrecyLevelId}
                        userGroupIds={form.userGroupIds}
                        onUserGroupIdsChange={form.setUserGroupIds}
                        userGroupOptions={form.userGroupOptions}
                    />

                    {form.submitError && (
                        <div
                            className="mt-4 px-4 py-3 rounded-[9px] bg-[#fdecec] border border-[#f4c7c3] text-[#c0392b] text-[13px]">
                            {form.submitError}
                        </div>
                    )}
                </div>

                {/* Правая колонка: код + доп. реквизиты */}
                <div className="flex flex-col gap-4 h-full">
                    <VndCodeCard/>
                    <VndActualizationCard
                        actualizationMode={actualization.actualizationMode}
                        onActualizationModeChange={actualization.setActualizationMode}
                        computedDueDateDisplay={actualization.computedDueDateDisplay}
                        onManualDueDateChange={actualization.setManualDueDate}
                        periodicityLabel={actualization.periodicityLabel}
                    />
                </div>
            </div>

            {/* Навигация */}
            <div className="flex items-center gap-3 mt-4">
                <div className="flex-1"/>
                <button
                    onClick={form.goBack}
                    disabled={form.isSubmitting}
                    className="h-11 px-[18px] rounded-[11px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[13.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    Отмена
                </button>
                <button
                    onClick={form.handleSubmit}
                    disabled={!form.isValid || form.isSubmitting}
                    className={`inline-flex items-center gap-2 h-11 px-[22px] rounded-[11px] border-none font-semibold text-[14px] ${
                        form.isValid && !form.isSubmitting
                            ? "bg-[#4e57d6] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_8px_20px_-8px_#4e57d6]"
                            : "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                    }`}
                >
                    <Check className="w-[18px] h-[18px]" strokeWidth={2}/>
                    {form.isSubmitting ? "Создание…" : "Создать черновик-карточку"}
                </button>
            </div>


            <VndCreateSuccessModal
                open={form.createdVnd !== null}
                code={form.createdVnd?.code ?? ""}
                title={form.createdVnd?.titleRu ?? ""}
                onDone={form.handleSuccessModalDone}
            />
        </div>
    );
}