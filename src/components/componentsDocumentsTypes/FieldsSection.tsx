import {useTranslation} from "react-i18next";
import {
    type DocumentType,
    type DocumentTypeField,
    documentTypeService, FIELD_KIND_TITLE, FIELD_KINDS,
    FieldKind
} from "@/service/documentTypeService/documentTypeService.ts";
import {toast} from "@/service/toastService.ts";
import {translit} from "@/utils/translit.ts";
import {Plus, Trash2} from "lucide-react";

export function FieldsSection({type, onChanged}: {type: DocumentType; onChanged: () => Promise<void>}) {
    const {t} = useTranslation();

    const addField = async () => {
        // const titleRu = window.prompt("Название поля");
        const titleRu = window.prompt(t("fieldsSection.addFieldTitlePrompt"));
        if (!titleRu?.trim()) return;

        // const code = window.prompt("Имя поля латиницей — по нему хранится значение",
        const code = window.prompt(t("fieldsSection.addFieldCodePrompt"),
            translit(titleRu));
        if (!code?.trim()) return;

        try {
            await documentTypeService.addField(type.id, {
                code: code.trim(),
                titleRu: titleRu.trim(),
                kind: FieldKind.Text,
                isRequired: false,
                showInList: false,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            // toast.error("Не удалось добавить поле", r.response?.data?.message);
            toast.error(t("fieldsSection.addFieldError"), r.response?.data?.message);
        }
    };

    const removeField = async (field: DocumentTypeField) => {
        // if (!window.confirm(`Удалить поле «${field.titleRu}»? Значения, уже введённые в карточках, пропадут.`)) return;
        if (!window.confirm(t("fieldsSection.removeFieldConfirm", {title: field.titleRu}))) return;
        try {
            await documentTypeService.removeField(field.id);
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            // toast.error("Не удалось удалить поле", r.response?.data?.message);
            toast.error(t("fieldsSection.removeFieldError"), r.response?.data?.message);
        }
    };

    const updateField = async (field: DocumentTypeField, change: Partial<DocumentTypeField>) => {
        try {
            await documentTypeService.updateField(field.id, {
                code: field.code,
                titleRu: change.titleRu ?? field.titleRu,
                kind: change.kind ?? field.kind,
                dictionaryId: change.dictionaryId !== undefined ? change.dictionaryId : field.dictionaryId,
                isRequired: change.isRequired ?? field.isRequired,
                showInList: change.showInList ?? field.showInList,
                order: change.order ?? field.order,
                hint: change.hint ?? field.hint,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            // toast.error("Не удалось изменить поле", r.response?.data?.message);
            toast.error(t("fieldsSection.updateFieldError"), r.response?.data?.message);
        }
    };

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                {/* <h4 className="...">Поля карточки</h4> */}
                <h4 className="text-[13.5px] font-semibold text-[#1c2740]">{t("fieldsSection.title")}</h4>
                <button
                    type="button"
                    onClick={addField}
                    className="cursor-pointer flex items-center gap-1.5 text-[13px] text-[#4e57d6] hover:underline"
                >
                    <Plus size={14}/>
                    {/* Добавить поле */}
                    {t("fieldsSection.addField")}
                </button>
            </div>

            {type.fields.length === 0 ? (
                <p className="text-[13px] text-[#8b97ab]">
                    {/* Полей нет. В карточке будут только название и вложения. */}
                    {t("fieldsSection.noFields")}
                </p>
            ) : (
                <div className="overflow-hidden rounded-[9px] border border-[#e5e9f0] bg-white">
                    {type.fields.map((field) => (
                        <div
                            key={field.id}
                            className="flex flex-wrap items-center gap-3 border-b border-[#eef1f6]
                                       px-3 py-2.5 last:border-b-0"
                        >
                            <input
                                defaultValue={field.titleRu}
                                onBlur={(e) => e.target.value !== field.titleRu
                                    && updateField(field, {titleRu: e.target.value})}
                                className="min-w-[160px] flex-1 rounded-[7px] border border-transparent
                                           px-2 py-1 text-[13px] text-[#1c2740] outline-none transition
                                           hover:border-[#e5e9f0] focus:border-[#4e57d6]
                                           focus:ring-[3px] focus:ring-[#ececfc]"
                            />

                            <code className="font-mono text-[11.5px] text-[#8b97ab]">{field.code}</code>

                            <select
                                value={field.kind}
                                onChange={(e) => updateField(field, {kind: Number(e.target.value) as FieldKind})}
                                className="rounded-[7px] border border-[#e5e9f0] px-2 py-1 text-[12.5px]
                                           text-[#1c2740] outline-none transition
                                           focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc]"
                            >
                                {FIELD_KINDS.map((k) => (
                                    <option key={k} value={k}>{FIELD_KIND_TITLE[k]}</option>
                                ))}
                            </select>

                            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#4d5a72]">
                                <input
                                    type="checkbox"
                                    checked={field.isRequired}
                                    onChange={(e) => updateField(field, {isRequired: e.target.checked})}
                                    className="h-3.5 w-3.5 accent-[#4e57d6]"
                                />
                                {/* обязательное */}
                                {t("fieldsSection.required")}
                            </label>

                            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#4d5a72]">
                                <input
                                    type="checkbox"
                                    checked={field.showInList}
                                    onChange={(e) => updateField(field, {showInList: e.target.checked})}
                                    className="h-3.5 w-3.5 accent-[#4e57d6]"
                                />
                                {/* в списке */}
                                {t("fieldsSection.showInList")}
                            </label>

                            <button
                                type="button"
                                onClick={() => removeField(field)}
                                // aria-label={`Удалить поле ${field.titleRu}`}
                                aria-label={t("fieldsSection.removeFieldAria", {title: field.titleRu})}
                                className="rounded p-1 text-[#a8b3c4] transition hover:bg-[#fbe8e5] hover:text-[#b3372a]"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}