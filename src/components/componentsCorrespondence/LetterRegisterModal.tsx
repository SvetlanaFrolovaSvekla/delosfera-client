import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Info} from "lucide-react";
import {
    correspondenceService,
    CATEGORY_ORDER,
    type Correspondent, type CorrespondentKind,
    type DeliveryMethod, type Letter, type LetterCategory, type LetterDirection,
} from "@/service/correspondenceService/correspondenceService.ts";
import {formatISO, parseDate} from "@/utils/dateUtils.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {
    EditableDateField, EditableTextAreaField, EditableTextField,
} from "@/components/componentsGeneral/RequisitesEditFields.tsx";
import {FormField, LetterModalShell, ModalActions} from "@/components/componentsCorrespondence/LetterModalShell.tsx";

/**
 * Регистрация письма в книге.
 *
 * Срок подставляется по категории и виден до сохранения: обращение клиента —
 * четырнадцать дней, запрос по счетам — три. Делопроизводитель должен видеть, что
 * система посчитала, и иметь возможность поправить — в предписании регулятора срок
 * стоит в самом документе и главнее любого норматива.
 */

interface Props {
    onClose: () => void;
    onSaved: (letter: Letter) => void;
}

/** Нормативы совпадают с серверными. Здесь они только для подсказки до сохранения. */
const DEFAULT_DAYS: Partial<Record<LetterCategory, number>> = {
    ClientAppeal: 14,
    BankSecrecyInquiry: 3,
    RegulatorRequest: 10,
    Claim: 14,
};

const DELIVERY_ORDER: DeliveryMethod[] = ["Post", "Email", "Courier", "Handed", "Tunduk", "Fax", "Other"];
const KIND_ORDER: CorrespondentKind[] = [
    "Regulator", "Government", "Bank", "ClientCompany", "ClientPerson", "Counterparty", "Other",
];

/** Даты считаем по местным Y/M/D: toISOString() сдвигает день в часовых поясах восточнее UTC. */
function addDays(from: string, days: number): string {
    const date = parseDate(from);
    if (!date) return "";
    date.setDate(date.getDate() + days);
    return formatISO(date);
}

export function LetterRegisterModal({onClose, onSaved}: Props) {
    const {t} = useTranslation();
    const {users} = useUserLookup();

    const [direction, setDirection] = useState<LetterDirection>("Incoming");
    const [category, setCategory] = useState<LetterCategory>("Ordinary");
    const [registeredOn, setRegisteredOn] = useState(() => formatISO(new Date()));

    const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
    const [correspondentId, setCorrespondentId] = useState("");
    const [newCorrespondent, setNewCorrespondent] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newKind, setNewKind] = useState<CorrespondentKind>("Other");

    const [theirNumber, setTheirNumber] = useState("");
    const [theirDate, setTheirDate] = useState("");
    const [subject, setSubject] = useState("");
    const [summary, setSummary] = useState("");
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("Post");
    const [sheetCount, setSheetCount] = useState("");
    const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState("");
    const [dueTouched, setDueTouched] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        correspondenceService.correspondents().then(setCorrespondents).catch(() => {});
    }, []);

    // Срок по умолчанию считается из категории и даты регистрации, пока его не тронули руками.
    // После правки больше не пересчитываем: введённое человеком главнее норматива.
    const normDays = DEFAULT_DAYS[category];
    const autoDue = normDays && registeredOn ? addDays(registeredOn, normDays) : "";
    const effectiveDue = dueTouched ? dueDate : autoDue;

    const categoryOptions = CATEGORY_ORDER.map((value) => ({
        value,
        label: t(`correspondencePage.categoriesFull.${value}`),
    }));
    const kindOptions = KIND_ORDER.map((value) => ({
        value,
        label: t(`correspondencePage.kinds.${value}`),
    }));
    const deliveryOptions = DELIVERY_ORDER.map((value) => ({
        value,
        label: t(`correspondencePage.delivery.${value}`),
    }));
    const correspondentOptions = correspondents.map((c) => ({value: String(c.id), label: c.title}));

    const submit = async () => {
        if (!newCorrespondent && !correspondentId) {
            setError(t("correspondencePage.registerModal.errors.pickCorrespondent"));
            return;
        }
        if (newCorrespondent && newTitle.trim().length < 3) {
            setError(t("correspondencePage.registerModal.errors.correspondentTitle"));
            return;
        }
        if (subject.trim().length < 3) {
            setError(t("correspondencePage.registerModal.errors.subject"));
            return;
        }
        if (!registeredOn) {
            setError(t("correspondencePage.registerModal.errors.date"));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            let targetId = Number(correspondentId);

            if (newCorrespondent) {
                const created = await correspondenceService.createCorrespondent({
                    title: newTitle.trim(),
                    shortTitle: null,
                    kind: newKind,
                    taxId: null,
                    email: null,
                    phone: null,
                    contactPerson: null,
                });
                targetId = created.id;
            }

            const letter = await correspondenceService.register({
                direction,
                category,
                registeredOn,
                correspondentId: targetId,
                theirNumber: theirNumber.trim() || null,
                theirDate: theirDate || null,
                subject: subject.trim(),
                summary: summary.trim() || null,
                deliveryMethod,
                sheetCount: sheetCount ? Number(sheetCount) : null,
                responsibleUserId,
                dueDate: effectiveDue || null,
            });

            onSaved(letter);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("correspondencePage.registerModal.errors.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <LetterModalShell
            onClose={onClose}
            widthClass="max-w-[720px]"
            header={(
                <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                    {t("correspondencePage.registerModal.title")}
                </h3>
            )}
            footer={(
                <ModalActions
                    busy={saving}
                    onCancel={onClose}
                    onSubmit={() => void submit()}
                    submitLabel={t("correspondencePage.registerModal.submit")}
                    busyLabel={t("correspondencePage.registerModal.submitting")}
                />
            )}
        >
            <Tabs<LetterDirection>
                className="mb-4"
                tabs={[
                    {id: "Incoming", label: t("correspondencePage.directionSingular.Incoming")},
                    {id: "Outgoing", label: t("correspondencePage.directionSingular.Outgoing")},
                ]}
                value={direction}
                onChange={setDirection}
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <FormField label={t("correspondencePage.registerModal.category")} className="sm:col-span-2">
                    <SelectDropdown
                        options={categoryOptions}
                        value={category}
                        onChange={(value) => setCategory(value as LetterCategory)}
                        className="w-full"
                        minWidth="100%"
                    />
                </FormField>

                <FormField
                    label={(
                        <span className="flex items-baseline justify-between">
                            {/* Звёздочка — внутри подписи: FormField ставит её после label, а здесь
                                label — строка-флекс, и звёздочка уезжала на следующую строку. */}
                            <span>
                                {t("correspondencePage.registerModal.correspondent")}{" "}
                                <span className="text-[#c0392b]">*</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setNewCorrespondent((v) => !v)}
                                className="cursor-pointer text-[12px] text-[#4e57d6] hover:underline"
                            >
                                {newCorrespondent
                                    ? t("correspondencePage.registerModal.pickFromList")
                                    : t("correspondencePage.registerModal.addNew")}
                            </button>
                        </span>
                    )}
                    className="sm:col-span-2"
                >
                    {newCorrespondent ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <EditableTextField
                                label={t("correspondencePage.registerModal.fullName")}
                                value={newTitle}
                                onChange={setNewTitle}
                            />
                            <FormField label={t("correspondencePage.registerModal.kind")}>
                                <SelectDropdown
                                    options={kindOptions}
                                    value={newKind}
                                    onChange={(value) => setNewKind(value as CorrespondentKind)}
                                    className="w-full"
                                    minWidth="100%"
                                />
                            </FormField>
                        </div>
                    ) : (
                        <SelectDropdown
                            options={correspondentOptions}
                            value={correspondentId}
                            onChange={setCorrespondentId}
                            placeholder={t("correspondencePage.registerModal.choose")}
                            searchable
                            searchPlaceholder={t("correspondencePage.registerModal.correspondentSearch")}
                            className="w-full"
                            minWidth="100%"
                        />
                    )}
                </FormField>

                <EditableTextField
                    label={t("correspondencePage.registerModal.theirNumber")}
                    value={theirNumber}
                    onChange={setTheirNumber}
                />
                <EditableDateField
                    label={t("correspondencePage.registerModal.theirDate")}
                    value={theirDate}
                    onChange={setTheirDate}
                />

                <div className="sm:col-span-2">
                    <EditableTextField
                        label={t("correspondencePage.registerModal.subject")}
                        value={subject}
                        onChange={setSubject}
                        required
                    />
                </div>

                <div className="sm:col-span-2">
                    <EditableTextAreaField
                        label={t("correspondencePage.registerModal.summary")}
                        value={summary}
                        onChange={setSummary}
                        placeholder={t("correspondencePage.registerModal.summaryPlaceholder")}
                    />
                </div>

                <FormField label={t("correspondencePage.registerModal.delivery")}>
                    <SelectDropdown
                        options={deliveryOptions}
                        value={deliveryMethod}
                        onChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
                        className="w-full"
                        minWidth="100%"
                    />
                </FormField>

                <EditableTextField
                    label={t("correspondencePage.registerModal.sheets")}
                    value={sheetCount}
                    onChange={(value) => setSheetCount(value.replace(/\D/g, "").slice(0, 5))}
                />

                <EditableDateField
                    label={t("correspondencePage.registerModal.registeredOn")}
                    value={registeredOn}
                    onChange={setRegisteredOn}
                    required
                />
                <EditableDateField
                    label={t("correspondencePage.registerModal.dueDate")}
                    value={effectiveDue}
                    onChange={(value) => {
                        setDueDate(value);
                        setDueTouched(true);
                    }}
                />

                <FormField label={t("correspondencePage.registerModal.executor")} className="sm:col-span-2">
                    <UserPickerField
                        people={users}
                        value={responsibleUserId}
                        onChange={setResponsibleUserId}
                        placeholder={t("correspondencePage.registerModal.executorPlaceholder")}
                        modalTitle={t("correspondencePage.executorModalTitle")}
                        searchPlaceholder={t("correspondencePage.executorSearch")}
                        clearable
                        onClear={() => setResponsibleUserId(null)}
                    />
                </FormField>
            </div>

            {normDays !== undefined && !dueTouched && (
                <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#eaf0ff] px-3 py-2 text-[12.5px] text-[#2f68f5]">
                    <Info size={15} className="mt-0.5 shrink-0"/>
                    {t("correspondencePage.registerModal.dueHint", {days: normDays})}
                </p>
            )}

            {error && (
                <p className="mt-3 rounded-lg bg-[#fbe3e3] px-3 py-2 text-[12.5px] text-[#a12b2b]">{error}</p>
            )}
        </LetterModalShell>
    );
}
