// Основная форма записки: тема, вид, адресат, текст, поля вида, согласующие,
// подписант, вложения и рубрики.
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {RichTextEditor} from "@/components/editor/RichTextEditor.tsx";
import {SzApproversField} from "@/components/sz/SzApproversField.tsx";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";
import {SzKindFields} from "@/components/componentsSzCard/SzKindFields.tsx";
import {SzRubricsField} from "@/components/componentsSzCard/SzRubricsField.tsx";
import {inputClass, localizedTitle} from "@/components/componentsSzCard/szCardUtils.ts";

interface SzMainFormProps {
    card: SzCardState;
    userList: PickableUser[];
}

export function SzMainForm({card, userList}: SzMainFormProps) {
    const {t, i18n} = useTranslation();
    const {orgUnits} = useDictionaries();
    const {
        form, set, setForm, editable, isNew, sz, kind, kinds, approversFromTemplate,
        applyKind, pendingFiles, setPendingFiles,
    } = card;

    const orgUnitTreeOptions = useMemo(
        () => orgUnits.map((u) => ({
            key: String(u.id),
            label: u.name,
            parentId: u.parentId != null ? String(u.parentId) : undefined, // если есть иерархия
        })),
        [orgUnits]
    );

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="grid grid-cols-2 gap-4">
                <Field label={t("szCard.fields.subject")}>
                    <input className={inputClass} value={form.title} disabled={!editable}
                           onChange={(e) => set("title", e.target.value)}/>
                </Field>
                {editable ? (
                    <div>
                        <label className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            {t("szCard.fields.kind")} <span className="text-[#c0392b]">*</span>
                        </label>
                        <SelectDropdown
                            value={String(form.kindId)}
                            onChange={(v) => void applyKind(Number(v))}
                            options={kinds.map((k) => ({value: String(k.id), label: localizedTitle(k, i18n.language)}))}
                            minWidth="100%"
                            className="w-full"
                        />
                    </div>
                ) : (
                    <ReadOnlyField
                        label={t("szCard.fields.kind")}
                        value={kind ? localizedTitle(kind, i18n.language) : "—"}
                    />
                )}
                <Field label={t("szCard.fields.addressee")}>
                    <UserPicker
                        users={userList}
                        value={form.addresseeUserId ?? null}
                        disabled={!editable}
                        bySeniority
                        placeholder={t("szCard.fields.addresseePlaceholder")}
                        onChange={(u) => {
                            // Адресат и подписант — одно лицо: записку подписывает тот,
                            // кому она адресована. Проставляя «Кому», сразу проставляем
                            // и подписанта (ниже поле можно переопределить). Подразделение
                            // адресата подставляется само — записка почти всегда идёт
                            // человеку в его подразделении.
                            setForm((f) => ({
                                ...f,
                                addresseeUserId: u?.id ?? null,
                                signerUserId: u?.id ?? null,
                                correspondentUnitId: u?.orgUnitId ?? f.correspondentUnitId ?? null,
                            }));
                        }}
                    />
                </Field>
                <SingleSelectListField
                    label={t("szCard.fields.addresseeUnit")}
                    required
                    modalTitle={t("szCard.fields.addresseeUnit")}
                    options={orgUnitTreeOptions}
                    selectedKey={form.correspondentUnitId != null ? String(form.correspondentUnitId) : null}
                    onChange={(key) => set("correspondentUnitId", key ? Number(key) : null)}
                    searchPlaceholder={t("szCard.fields.unitSearch")}
                    boldLabel={false}
                />
                <PlainCheckbox
                    tone="brand"
                    checked={form.isPaperCarrier ?? kind?.isPaperByDefault ?? false}
                    onChange={(checked) => set("isPaperCarrier", checked)}
                    disabled={!editable}
                >
                    {t("szCard.fields.paperCarrier")}
                </PlainCheckbox>
            </div>

            <div className="mt-4">
                <RichTextEditor
                    label={t("szCard.fields.body")}
                    value={form.body ?? ""}
                    disabled={!editable}
                    onChange={(html) => set("body", html)}
                />
            </div>

            <SzKindFields card={card} userList={userList}/>

            {approversFromTemplate && (
                <div className="mb-1.5 text-[11.5px] text-[#1c7a4d]">
                    {t("szCard.fields.approversFromTemplate")}
                </div>
            )}
            <SzApproversField
                value={form.approverUserIds ?? []}
                onChange={(ids) => set("approverUserIds", ids)}
                users={userList}
                parallel={form.approvalIsParallel ?? false}
                onParallelChange={(p) => set("approvalIsParallel", p)}
                editable={editable}
            />

            {/*
              Подписант замыкает маршрут: он ставит подпись после того, как
              согласующие высказались по существу. Поле необязательное — записка
              может идти и без отдельного подписания.
            */}
            <div className="mt-4">
                <Field label={t("szCard.fields.signer")}>
                    <UserPicker
                        users={userList}
                        value={form.signerUserId ?? null}
                        disabled={!editable}
                        bySeniority
                        placeholder={t("szCard.fields.signerPlaceholder")}
                        onChange={(u) => set("signerUserId", u?.id ?? null)}
                    />
                </Field>
                <div className="mt-1 text-[11.5px] text-[#8b97ab]">{t("szCard.fields.signerHint")}</div>
            </div>

            <AttachmentsPanel
                documentId={sz?.documentId ?? null}
                editable={editable}
                hint={t("szCard.fields.attachmentsHint")}
                pending={isNew ? pendingFiles : undefined}
                onPendingChange={isNew ? setPendingFiles : undefined}
            />

            <SzRubricsField
                value={form.rubricIds ?? []}
                onChange={(ids) => set("rubricIds", ids)}
                editable={editable}
            />
        </div>
    );
}
