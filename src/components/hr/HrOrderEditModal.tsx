import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {
    hrOrderService,
    type HrOrderKind, type HrOrderKindInfo,
} from "@/service/hrOrderService/hrOrderService.ts";
import {hrForms, type HrFormSchema} from "@/service/szService/szService.ts";
import {SzHrForm} from "@/components/sz/SzHrForm.tsx";
import {SearchSelect} from "@/components/componentsGeneral/selects/SearchSelect.tsx";
import {RichTextEditor} from "@/components/editor/RichTextEditor.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";

/**
 * Издание приказа по личному составу.
 *
 * Реквизиты по видам берутся от кадровых записок: у приказа о командировке те же
 * поля, что у записки о ней — город, срок, цель. Записка просит, приказ решает,
 * но описывают они одно событие, и заводить два справочника полей незачем.
 */

interface Props {
    orderId: number | null;
    kinds: HrOrderKindInfo[];
    onClose: () => void;
    onSaved: () => void;
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function HrOrderEditModal({orderId, kinds, onClose, onSaved}: Props) {
    const {users} = useUserLookup();
    const {orgUnits} = useDictionaries();

    const [loading, setLoading] = useState(orderId !== null);
    const [forms, setForms] = useState<Record<string, HrFormSchema>>({});

    const [kind, setKind] = useState<HrOrderKind>("Other");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [basis, setBasis] = useState("");
    const [orderDate, setOrderDate] = useState(today());
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [effectiveTo, setEffectiveTo] = useState("");
    const [signerUserId, setSignerUserId] = useState<number | null>(null);

    /** Сотрудники приказа. Формат общий с кадровой запиской — форма одна и та же. */
    const [employees, setEmployees] = useState<{userId: number; [key: string]: unknown}[]>([]);
    const [values, setValues] = useState<Record<string, unknown>>({});

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        hrForms().then(setForms).catch(() => {});
    }, []);

    useEffect(() => {
        if (orderId === null) return;

        hrOrderService.get(orderId)
            .then((order) => {
                setKind(order.kind);
                setTitle(order.title);
                setBody(order.body ?? "");
                setBasis(order.basis ?? "");
                setOrderDate(order.orderDate?.slice(0, 10) ?? today());
                setEffectiveFrom(order.effectiveFrom?.slice(0, 10) ?? "");
                setEffectiveTo(order.effectiveTo?.slice(0, 10) ?? "");
                setSignerUserId(order.signerUserId);
                setEmployees(order.employees.map((e) => ({
                    userId: e.userId,
                    ...(e.fieldValues ? safeParse(e.fieldValues) : {}),
                })));
            })
            .catch(() => setError("Не удалось загрузить приказ."))
            .finally(() => setLoading(false));
    }, [orderId]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const formKey = kinds.find((k) => k.kind === kind)?.formKey ?? null;
    const schema = formKey ? forms[formKey] ?? null : null;

    const submit = async () => {
        if (title.trim().length < 3) {
            setError("Укажите заголовок приказа.");
            return;
        }
        if (employees.length === 0) {
            setError("Укажите хотя бы одного сотрудника.");
            return;
        }
        if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
            setError("Дата окончания раньше даты начала.");
            return;
        }

        setSaving(true);
        setError(null);

        const request = {
            kind,
            title: title.trim(),
            body: body || null,
            basis: basis.trim() || null,
            orderDate,
            effectiveFrom: effectiveFrom || null,
            effectiveTo: effectiveTo || null,
            signerUserId,
            employees: employees.map(({userId, ...fields}) => ({
                userId,
                // Общие поля вида идут каждому сотруднику: у командировки город
                // и срок одни на всех, а личные поля уже лежат в самом сотруднике.
                fields: {...values, ...fields},
            })),
        };

        try {
            if (orderId === null) await hrOrderService.create(request);
            else await hrOrderService.update(orderId, request);
            onSaved();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось сохранить приказ.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <h2 className="text-[19px] font-semibold text-[#101a2c]">
                        {orderId === null ? "Издать приказ" : "Изменить приказ"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {loading ? (
                    <Loader label="Загружаем…"/>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                            <Field label="Вид приказа" required>
                                <SearchSelect
                                    options={kinds.map((k) => ({value: k.kind, label: k.title}))}
                                    value={kind}
                                    onChange={(v) => setKind(v as HrOrderKind)}
                                    allowEmpty={false}
                                />
                            </Field>

                            <Field label="Дата приказа" required>
                                <input
                                    type="date"
                                    value={orderDate}
                                    onChange={(event) => setOrderDate(event.target.value)}
                                    className={FIELD}
                                />
                            </Field>

                            <Field label="Заголовок" required wide>
                                <input
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="О направлении в командировку"
                                    className={FIELD}
                                />
                            </Field>

                            <Field label="Действует с">
                                <input
                                    type="date"
                                    value={effectiveFrom}
                                    onChange={(event) => setEffectiveFrom(event.target.value)}
                                    className={FIELD}
                                />
                            </Field>

                            <Field label="По">
                                <input
                                    type="date"
                                    value={effectiveTo}
                                    onChange={(event) => setEffectiveTo(event.target.value)}
                                    className={FIELD}
                                />
                            </Field>

                            <Field label="Основание" wide>
                                <input
                                    value={basis}
                                    onChange={(event) => setBasis(event.target.value)}
                                    placeholder="Служебная записка № 12 от 03.08.2026"
                                    className={FIELD}
                                />
                            </Field>

                            <Field label="Подписант" wide>
                                <SearchSelect
                                    options={users.map((u) => ({
                                        value: u.id,
                                        label: u.fullName,
                                        hint: [u.position, u.orgUnit].filter(Boolean).join(", ") || null,
                                    }))}
                                    value={signerUserId}
                                    onChange={(v) => setSignerUserId(v === null ? null : Number(v))}
                                    placeholder="Найдите по фамилии"
                                    emptyLabel="Подпишет тот, кто регистрирует"
                                />
                            </Field>
                        </div>

                        {/* Сотрудники и реквизиты по виду — та же форма, что у кадровой записки. */}
                        <div className="mt-4">
                            <SzHrForm
                                schema={schema}
                                employees={employees as never}
                                onEmployeesChange={(list) => setEmployees(list as never)}
                                values={values}
                                onValuesChange={setValues}
                                users={users}
                                orgUnits={orgUnits.map((u) => ({id: u.id, name: u.titleRu}))}
                                editable
                            />
                        </div>

                        <div className="mt-4">
                            <RichTextEditor
                                label="Текст приказа"
                                value={body}
                                onChange={setBody}
                            />
                        </div>

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
                                {saving ? "Сохраняем…" : "Сохранить проект"}
                            </button>
                        </div>

                        <p className="mt-2 text-right text-[12px] text-[#8593a8]">
                            Номер по книге присваивается при подписании, а не сейчас.
                        </p>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

const FIELD =
    "w-full h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none " +
    "transition focus:border-[#2f68f5]";

function Field({label, children, required, wide}: {
    label: string; children: React.ReactNode; required?: boolean; wide?: boolean;
}) {
    return (
        <label className={`block ${wide ? "col-span-2" : ""}`}>
            <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                {label}
                {required && <span className="ml-0.5 text-[#c0392b]" title="Обязательное поле">*</span>}
            </span>
            {children}
        </label>
    );
}

function safeParse(json: string): Record<string, unknown> {
    try {
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        // Реквизиты испорчены — приказ важнее, откроем его без них.
        return {};
    }
}
