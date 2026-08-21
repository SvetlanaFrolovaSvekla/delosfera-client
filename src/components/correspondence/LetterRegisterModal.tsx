import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Info, X} from "lucide-react";
import {
    correspondenceService,
    CATEGORY_ORDER, CATEGORY_TITLE, DELIVERY_TITLE,
    type Correspondent, type CorrespondentKind,
    type DeliveryMethod, type LetterCategory, type LetterDirection,
} from "@/service/correspondenceService/correspondenceService.ts";
import {useUserLookup, userLabel} from "@/hooks/useUserLookup.ts";

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
    onSaved: () => void;
}

/** Нормативы совпадают с серверными. Здесь они только для подсказки до сохранения. */
const DEFAULT_DAYS: Partial<Record<LetterCategory, number>> = {
    ClientAppeal: 14,
    BankSecrecyInquiry: 3,
    RegulatorRequest: 10,
    Claim: 14,
};

const DELIVERY_ORDER: DeliveryMethod[] = ["Post", "Email", "Courier", "Handed", "Tunduk", "Fax", "Other"];

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function addDays(from: string, days: number): string {
    const date = new Date(from);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export function LetterRegisterModal({onClose, onSaved}: Props) {
    const {users} = useUserLookup();

    const [direction, setDirection] = useState<LetterDirection>("Incoming");
    const [category, setCategory] = useState<LetterCategory>("Ordinary");
    const [registeredOn, setRegisteredOn] = useState(today());

    const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
    const [correspondentId, setCorrespondentId] = useState<number | "">("");
    const [newCorrespondent, setNewCorrespondent] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newKind, setNewKind] = useState<CorrespondentKind>("Other");

    const [theirNumber, setTheirNumber] = useState("");
    const [theirDate, setTheirDate] = useState("");
    const [subject, setSubject] = useState("");
    const [summary, setSummary] = useState("");
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("Post");
    const [sheetCount, setSheetCount] = useState("");
    const [responsibleUserId, setResponsibleUserId] = useState<number | "">("");
    const [dueDate, setDueDate] = useState("");
    const [dueTouched, setDueTouched] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        correspondenceService.correspondents().then(setCorrespondents).catch(() => {});
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Срок подставляется по категории, пока его не тронули руками. После правки
    // больше не пересчитываем: введённое человеком главнее норматива.
    useEffect(() => {
        if (dueTouched) return;
        const days = DEFAULT_DAYS[category];
        setDueDate(days ? addDays(registeredOn, days) : "");
    }, [category, registeredOn, dueTouched]);

    const submit = async () => {
        if (!newCorrespondent && correspondentId === "") {
            setError("Выберите корреспондента.");
            return;
        }
        if (newCorrespondent && newTitle.trim().length < 3) {
            setError("Укажите наименование корреспондента.");
            return;
        }
        if (subject.trim().length < 3) {
            setError("Укажите тему письма.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            let targetId = correspondentId as number;

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

            await correspondenceService.register({
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
                responsibleUserId: responsibleUserId || null,
                dueDate: dueDate || null,
            });

            onSaved();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось зарегистрировать письмо.");
        } finally {
            setSaving(false);
        }
    };

    const hint = DEFAULT_DAYS[category];

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <h2 className="text-[19px] font-semibold text-[#101a2c]">Регистрация письма</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="mb-4 flex gap-2">
                    {(["Incoming", "Outgoing"] as LetterDirection[]).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setDirection(value)}
                            className={`flex-1 rounded-[10px] border px-4 py-2.5 text-[14px] font-medium transition
                                ${direction === value
                                ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                                : "border-[#e1e7ef] text-[#4d5a72] hover:border-[#c3cede]"}`}
                        >
                            {value === "Incoming" ? "Входящее" : "Исходящее"}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                    <div className="col-span-2">
                        <Label>Категория</Label>
                        <select
                            value={category}
                            onChange={(event) => setCategory(event.target.value as LetterCategory)}
                            className={FIELD}
                        >
                            {CATEGORY_ORDER.map((value) => (
                                <option key={value} value={value}>{CATEGORY_TITLE[value]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-2">
                        <div className="mb-1 flex items-baseline justify-between">
                            <Label>Корреспондент</Label>
                            <button
                                type="button"
                                onClick={() => setNewCorrespondent((v) => !v)}
                                className="text-[12.5px] text-[#2f68f5] hover:underline"
                            >
                                {newCorrespondent ? "выбрать из списка" : "завести нового"}
                            </button>
                        </div>

                        {newCorrespondent ? (
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    value={newTitle}
                                    onChange={(event) => setNewTitle(event.target.value)}
                                    placeholder="Полное наименование"
                                    className={FIELD}
                                />
                                <select
                                    value={newKind}
                                    onChange={(event) => setNewKind(event.target.value as CorrespondentKind)}
                                    className={FIELD}
                                >
                                    <option value="Regulator">Национальный банк</option>
                                    <option value="Government">Государственный орган</option>
                                    <option value="Bank">Банк</option>
                                    <option value="ClientCompany">Клиент — юрлицо</option>
                                    <option value="ClientPerson">Клиент — физлицо</option>
                                    <option value="Counterparty">Контрагент</option>
                                    <option value="Other">Прочее</option>
                                </select>
                            </div>
                        ) : (
                            <select
                                value={correspondentId}
                                onChange={(event) => setCorrespondentId(
                                    event.target.value ? Number(event.target.value) : "")}
                                className={FIELD}
                            >
                                <option value="">— выберите —</option>
                                {correspondents.map((c) => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <Text label="Их номер" value={theirNumber} onChange={setTheirNumber}/>
                    <Text label="Их дата" type="date" value={theirDate} onChange={setTheirDate}/>

                    <div className="col-span-2">
                        <Label>Тема</Label>
                        <input
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            className={FIELD}
                        />
                    </div>

                    <div className="col-span-2">
                        <Label>Краткое изложение</Label>
                        <textarea
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                            rows={3}
                            placeholder="Чтобы понять суть, не открывая вложение."
                            className={`${FIELD} resize-y`}
                        />
                    </div>

                    <div>
                        <Label>Способ доставки</Label>
                        <select
                            value={deliveryMethod}
                            onChange={(event) => setDeliveryMethod(event.target.value as DeliveryMethod)}
                            className={FIELD}
                        >
                            {DELIVERY_ORDER.map((value) => (
                                <option key={value} value={value}>{DELIVERY_TITLE[value]}</option>
                            ))}
                        </select>
                    </div>

                    <Text label="Листов" value={sheetCount} onChange={setSheetCount} type="number"/>

                    <Text label="Дата регистрации" type="date" value={registeredOn} onChange={setRegisteredOn}/>

                    <div>
                        <Label>Срок ответа</Label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(event) => {
                                setDueDate(event.target.value);
                                setDueTouched(true);
                            }}
                            className={FIELD}
                        />
                    </div>

                    <div className="col-span-2">
                        <Label>Исполнитель</Label>
                        <select
                            value={responsibleUserId}
                            onChange={(event) => setResponsibleUserId(
                                event.target.value ? Number(event.target.value) : "")}
                            className={FIELD}
                        >
                            <option value="">— назначим резолюцией —</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>{userLabel(user)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {hint !== undefined && !dueTouched && (
                    <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#eaf0ff] px-3 py-2 text-[12.5px] text-[#2f68f5]">
                        <Info size={15} className="mt-0.5 shrink-0"/>
                        Срок подставлен по нормативу категории — {hint} дней от даты регистрации.
                        Если в документе указан свой срок, поставьте его.
                    </p>
                )}

                {error && <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>}

                <div className="mt-5 flex justify-end gap-2 border-t border-[#eef2f7] pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={submit}
                        className="rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium text-white
                                   transition hover:bg-[#2554cc] disabled:opacity-60"
                    >
                        {saving ? "Регистрируем…" : "Зарегистрировать"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

const FIELD =
    "w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2 text-[14px] outline-none " +
    "transition focus:border-[#2f68f5]";

function Label({children}: {children: React.ReactNode}) {
    return <div className="mb-1 text-[12.5px] font-medium text-[#4d5a72]">{children}</div>;
}

function Text({label, value, onChange, type = "text"}: {
    label: string; value: string; onChange: (value: string) => void; type?: string;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={FIELD}
            />
        </div>
    );
}
