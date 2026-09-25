import {useState} from "react";
import {useTranslation} from "react-i18next";
import {
    type DocumentType,
    documentTypeService,
    isReadyToUse
} from "@/service/documentTypeService/documentTypeService.ts";
import {toast} from "@/service/toastService.ts";
import type {RouteTemplate} from "@/pages/ManagementPages/Dictionaries/DocumentTypesPage.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {FieldsSection} from "@/components/componentsDocumentsTypes/FieldsSection.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {AlertTriangle, ChevronRight} from "lucide-react";

const inputClass =
    "rounded-[9px] border border-[#e1e7ef] bg-white px-3 py-2 text-[13.5px] " +
    "outline-none transition focus:border-[#2f68f5]";

export function TypeCard({type, templates, open, onToggle, onChanged}: {
    type: DocumentType;
    templates: RouteTemplate[];
    open: boolean;
    onToggle: () => void;
    onChanged: () => Promise<void>;
}) {
    const {t} = useTranslation();
    const [saving, setSaving] = useState(false);
    const isReady = isReadyToUse(type);

    const save = async (change: Partial<DocumentType>) => {
        setSaving(true);
        try {
            await documentTypeService.update(type.id, {
                titleRu: change.titleRu ?? type.titleRu,
                titleEn: change.titleEn ?? type.titleEn,
                titleKg: change.titleKg ?? type.titleKg,
                description: change.description ?? type.description,
                routeTemplateId: change.routeTemplateId !== undefined
                    ? change.routeTemplateId
                    : type.routeTemplateId,
                numberPattern: change.numberPattern ?? type.numberPattern,
                isActive: change.isActive ?? type.isActive,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            // toast.error("Не удалось сохранить", r.response?.data?.message);
            toast.error(t("typeCard.saveError"), r.response?.data?.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <article className="overflow-hidden rounded-[12px] border border-[#e1e7ef] bg-white">
            <button
                type="button"
                onClick={onToggle}
                className="cursor-pointer flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f8fafc]"
            >
                <ChevronRight
                    size={15}
                    className={`flex-none text-[#8593a8] transition-transform ${open ? "rotate-90" : ""}`}
                />

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[#101a2c]">
                        {type.titleRu}
                    </span>
                    <span className="block truncate text-[12px] text-[#8593a8]">
                        <code className="font-mono">{type.code}</code>
                        {" · "}
                        {type.routeTemplateName
                            // ? <>маршрут: {type.routeTemplateName}</>
                            ? <>{t("typeCard.route")}: {type.routeTemplateName}</>
                            // : <span className="text-[#96590a]">маршрут не выбран</span>}
                            : <span className="text-[#96590a]">{t("typeCard.routeNotSelected")}</span>}
                        {/* {type.fields.length > 0 && <> · полей: {type.fields.length}</>} */}
                        {type.fields.length > 0 && <> · {t("typeCard.fieldsCount")}: {type.fields.length}</>}
                    </span>
                </span>

                {!type.isActive && (
                    <span className="flex-none rounded-[5px] bg-[#eef2f7] px-2 py-0.5 text-[11px] text-[#5b6b85]">
                        {/* выключен */}
                        {t("typeCard.disabled")}
                    </span>
                )}
                {!isReady && (
                    <AlertTriangle size={15} className="flex-none text-[#96590a]"/>
                )}
            </button>

            {open && (
                <div className="flex flex-col gap-4 border-t border-[#eef2f7] bg-[#fafbfd] p-4">

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t("typeCard.nameLabel")}>
                            <input
                                defaultValue={type.titleRu}
                                onBlur={(e) => e.target.value !== type.titleRu
                                    && save({titleRu: e.target.value})}
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label={t("typeCard.routeTemplateLabel")}
                            hint={isReady
                                ? undefined
                                : t("typeCard.routeTemplateHint")}
                        >
                            <SelectDropdown
                                options={[
                                    {value: "", label: t("typeCard.routeTemplateNone")},
                                    ...templates.map((tpl) => ({value: String(tpl.id), label: tpl.name})),
                                ]}
                                value={type.routeTemplateId != null ? String(type.routeTemplateId) : ""}
                                onChange={(v) => save({routeTemplateId: v ? Number(v) : null})}
                                minWidth="100%"
                                invalid={!isReady}
                            />
                        </Field>

                        <Field
                            label={t("typeCard.numberPatternLabel")}
                            hint={t("typeCard.numberPatternHint")}
                        >
                            <input
                                defaultValue={type.numberPattern ?? ""}
                                onBlur={(e) => e.target.value !== (type.numberPattern ?? "")
                                    && save({numberPattern: e.target.value || null})}
                                placeholder="ПР-{year}-{seq}"
                                className={`${inputClass} font-mono`}
                            />
                        </Field>

                        <Field label={t("typeCard.stateLabel")}>
                            <PlainCheckbox
                                checked={type.isActive}
                                onChange={(checked) => save({isActive: checked})}
                                className="mt-2"
                            >
                                {t("typeCard.offerOnCreate")}
                            </PlainCheckbox>
                        </Field>
                    </div>

                    <FieldsSection type={type} onChanged={onChanged}/>

                    {saving && <p className="text-[12.5px] text-[#8593a8]">{t("typeCard.saving")}</p>}
                </div>
            )}
        </article>
    );
}