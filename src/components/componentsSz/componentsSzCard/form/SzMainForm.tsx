// Основная форма записки: тема, вид, адресат, текст, поля вида, согласующие,
// подписант, вложения и рубрики.
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import type {SzCardState} from "@/hooks/sz/useSzCard.ts";

import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {RichTextEditor} from "@/components/componentsEditor/RichTextEditor.tsx";
import {SzApproversField} from "@/components/componentsSz/componentsSzCard/form/SzApproversField.tsx";
import {SzKindFields} from "@/components/componentsSz/componentsSzCard/form/SzKindFields.tsx";
import {SzRubricsField} from "@/components/componentsSz/componentsSzCard/controls/SzRubricsField.tsx";
import {inputClass, localizedTitle} from "@/utils/szProcess/szCardUtils.ts";
import {SzRegistrationPanel} from "@/components/componentsSz/componentsSzCard/panels/SzRegistrationPanel.tsx";
import {SzFormSection} from "@/components/componentsSz/componentsSzCard/form/SzFormSection.tsx";

import type {PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";

/** Сколько файлов можно приложить к одной записке (сервер проверяет тот же предел). */
const MAX_ATTACHMENTS = 10;

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

    // Секция «Параметры вида» нужна только видам со своими полями (кадровая, закупка, обучение);
    // у обычной записки SzKindFields ничего не рисует - пустую секцию с заголовком не показываем.
    const hasKindFields = card.formKey === "Hr" || card.formKey === "Procurement" || card.formKey === "Training";

    return (
        <div className="mt-5 flex flex-col gap-4">
            {/* ----------- Основные сведения ----------- */}
            <SzFormSection title={t("szCard.sections.main")} hint={t("szCard.sections.mainHint")}>
            <div className="grid grid-cols-2 gap-4">
                {/* ----------- Поля всегда (по умолчанию, вне зависимости от вида записки) -----------*/}
                {/* Тема */}
                <Field label={t("szCard.fields.subject")} required>
                    <input className={inputClass} value={form.title} disabled={!editable}
                           onChange={(e) => set("title", e.target.value)}/>
                </Field>
                {/* Вид записки */}
                {editable ? (
                    <div>
                        <label className="block text-[12px] font-normal text-[#3a4560] mb-2">
                            {t("szCard.fields.kind")} <span className="text-[#c0392b]">*</span>
                        </label>
                        <SelectDropdown
                            accent="blue"
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
                {/* Вид записки */}
                {editable ? (
                    /* Кому */
                    <Field label={t("szCard.fields.addressee")} required>
                        <UserPickerField
                            accent="blue"
                            people={userList}
                            value={form.addresseeUserId ?? null}
                            placeholder={t("szCard.fields.addresseePick")}
                            modalTitle={t("szCard.fields.addresseeModalTitle")}
                            searchPlaceholder={t("szCard.fields.userSearch")}
                            clearable
                            onClear={() => setForm((f) => ({...f, addresseeUserId: null}))}
                            onChange={(id) => {
                                const u = userList.find((x) => x.id === id);
                                // Адресат и подписант — одно лицо: записку подписывает тот,
                                // кому она адресована. Проставляя «Кому», сразу проставляем
                                // и подписанта (ниже поле можно переопределить). Подразделение
                                // адресата подставляется само — записка почти всегда идёт
                                // человеку в его подразделении.
                                // Подставляем, только если поле ещё «следует» за адресатом: пустое
                                // или заполнено автоматически от прежнего адресата. Выбранного
                                // вручную подписанта или СП не трогаем.
                                setForm((f) => {
                                    const prev = userList.find((x) => x.id === f.addresseeUserId);
                                    const signerFollows = f.signerUserId == null || f.signerUserId === f.addresseeUserId;
                                    const unitFollows = f.correspondentUnitId == null
                                        || (prev?.orgUnitId != null && f.correspondentUnitId === prev.orgUnitId);
                                    return {
                                        ...f,
                                        addresseeUserId: id,
                                        signerUserId: signerFollows ? id : f.signerUserId,
                                        correspondentUnitId: unitFollows ? (u?.orgUnitId ?? null) : f.correspondentUnitId,
                                    };
                                });
                            }}
                        />
                    </Field>
                ) : (
                    <ReadOnlyField
                        label={t("szCard.fields.addressee")}
                        value={userList.find((u) => u.id === form.addresseeUserId)?.fullName ?? sz?.addresseeUser ?? "—"}
                    />
                )}
                <div className="min-w-0">
                    {/* Адресат — структурное подразделение. Без правки — только просмотр,
                        как у остальных полей: иначе СП меняли в чужой или отправленной записке. */}
                    {editable ? (
                        <>
                            <SingleSelectListField
                                accent="blue"
                                label={t("szCard.fields.addresseeUnit")}
                                required
                                modalTitle={t("szCard.fields.addresseeUnit")}
                                options={orgUnitTreeOptions}
                                selectedKey={form.correspondentUnitId != null ? String(form.correspondentUnitId) : null}
                                onChange={(key) => set("correspondentUnitId", key ? Number(key) : null)}
                                searchPlaceholder={t("szCard.fields.unitSearch")}
                                boldLabel={false}
                            />
                            {/* Подставляется автоматически — подразделение того, кого выбрали в «Кому».
                            При необходимости можно изменить.*/}
                            <div className="mt-1 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                                {t("szCard.fields.addresseeUnitHint")}
                            </div>
                        </>
                    ) : (
                        <ReadOnlyField
                            label={t("szCard.fields.addresseeUnit")}
                            value={orgUnits.find((u) => String(u.id) === String(form.correspondentUnitId))?.name ?? "—"}
                        />
                    )}
                </div>
                {/* Бумажный носитель */}
                <PlainCheckbox
                    tone="brand"
                    checked={form.isPaperCarrier ?? kind?.isPaperByDefault ?? false}
                    onChange={(checked) => set("isPaperCarrier", checked)}
                    disabled={!editable}
                >
                    {t("szCard.fields.paperCarrier")}
                </PlainCheckbox>
            </div>
            </SzFormSection>

            {/* ----------- Текст записки ----------- */}
            <SzFormSection title={t("szCard.sections.body")}>
                <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                    {t("szCard.fields.body")} <span className="text-[#c0392b]">*</span>
                </span>
                <RichTextEditor
                    accent="blue"
                    value={form.body ?? ""}
                    disabled={!editable}
                    onChange={(html) => set("body", html)}
                />
            </SzFormSection>

            {/* Регистрация и сроки: автор, подразделение, дата регистрации, срок исполнения */}
            {sz && <SzRegistrationPanel sz={sz} className="!mt-0"/>}

            {/* ----------- Поля, зависящие от вида записки -----------*/}
            {hasKindFields && (
                <SzFormSection title={t("szCard.sections.kindFields")} hint={t("szCard.sections.kindFieldsHint")}>
                    <div className="[&>div:first-child]:mt-0">
                        <SzKindFields card={card} userList={userList}/>
                    </div>
                </SzFormSection>
            )}



            {/* ----------- Согласующие и подписант -----------*/}
            <SzFormSection title={t("szCard.sections.approval")} hint={t("szCard.sections.approvalHint")}>
            <div className="[&>div:first-child]:mt-0">
            {/* Сообщение "Согласующие подставлены из шаблона вида — можно изменить" */}
            {approversFromTemplate && (
                <div className="mb-1.5 text-[11.5px] text-[#1c7a4d]">
                    {t("szCard.fields.approversFromTemplate")}
                </div>
            )}

            {/* Состав согласующих записки */}
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
              согласующие высказались по существу. Поле необязательное - записка
              может идти и без отдельного подписания.
            */}
            <div className="mt-4">
                {editable ? (
                    <Field label={t("szCard.fields.signer")}>
                        <UserPickerField
                            accent="blue"
                            people={userList}
                            value={form.signerUserId ?? null}
                            placeholder={t("szCard.fields.signerPlaceholder")}
                            modalTitle={t("szCard.fields.signerModalTitle")}
                            searchPlaceholder={t("szCard.fields.userSearch")}
                            clearable
                            onClear={() => set("signerUserId", null)}
                            onChange={(id) => set("signerUserId", id)}
                        />
                    </Field>
                ) : (
                    <ReadOnlyField
                        label={t("szCard.fields.signer")}
                        value={userList.find((u) => u.id === form.signerUserId)?.fullName
                            ?? sz?.signerUser ?? t("szCard.fields.signerPlaceholder")}
                    />
                )}
                <div className="mt-1 text-[11.5px] text-[#8b97ab]">{t("szCard.fields.signerHint")}</div>
            </div>
            </div>
            </SzFormSection>

            {/* ----------- Дополнительно: вложения и рубрики ----------- */}
            <SzFormSection title={t("szCard.sections.extra")} hint={t("szCard.sections.extraHint")}>
            <div className="[&>div:first-child]:mt-0">
            {/* Вложения */}
            <AttachmentsPanel
                documentId={sz?.documentId ?? null}
                editable={editable}
                maxFiles={MAX_ATTACHMENTS}
                hint={t("szCard.fields.attachmentsHint")}
                pending={isNew ? pendingFiles : undefined}
                onPendingChange={isNew ? setPendingFiles : undefined}
            />

            {/* Рубрикатор */}
            <SzRubricsField
                value={form.rubricIds ?? []}
                onChange={(ids) => set("rubricIds", ids)}
                editable={editable}
            />
            </div>
            </SzFormSection>
        </div>
    );
}
