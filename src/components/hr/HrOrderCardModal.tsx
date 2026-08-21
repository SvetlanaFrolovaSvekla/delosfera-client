import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Pencil, X} from "lucide-react";
import {
    hrOrderService, ORDER_STATUS_TITLE,
    type HrOrder, type HrOrderKindInfo,
} from "@/service/hrOrderService/hrOrderService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime} from "@/components/componentsGeneral/DataTable.tsx";

/**
 * Карточка приказа.
 *
 * Подписанный приказ показывается только на чтение: с ним уже ознакомили
 * сотрудника под роспись, и правка задним числом означала бы, что ознакомили
 * не с тем.
 */

interface Props {
    id: number;
    kinds: HrOrderKindInfo[];
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (id: number) => void;
}

export function HrOrderCardModal({id, kinds, canManage, onClose, onChanged, onEdit}: Props) {
    const [order, setOrder] = useState<HrOrder | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        hrOrderService.get(id)
            .then(setOrder)
            .catch(() => setError("Не удалось загрузить приказ."));
    }, [id]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const sign = async () => {
        if (!order) return;

        setBusy(true);
        setError(null);
        try {
            await hrOrderService.sign(order.id);
            setOrder(await hrOrderService.get(order.id));
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось подписать приказ.");
        } finally {
            setBusy(false);
        }
    };

    const kindTitle = order ? kinds.find((k) => k.kind === order.kind)?.title ?? order.kind : "";

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {!order ? (
                    <Loader label="Загружаем…"/>
                ) : (
                    <>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[13px] text-[#8593a8]">
                                        {order.regNumber ?? "без номера"}
                                    </span>
                                    <span className="text-[12.5px] text-[#8593a8]">{kindTitle}</span>
                                    <Badge tone={order.status === "Signed" ? "good" : "neutral"}>
                                        {ORDER_STATUS_TITLE[order.status]}
                                    </Badge>
                                </div>
                                <h2 className="text-[18px] font-semibold leading-snug text-[#101a2c]">
                                    {order.title}
                                </h2>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                {canManage && order.status !== "Signed" && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(order.id)}
                                        aria-label="Изменить"
                                        className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                                    >
                                        <Pencil size={18}/>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Закрыть"
                                    className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                                >
                                    <X size={20}/>
                                </button>
                            </div>
                        </div>

                        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                            <Field label="Дата приказа" value={formatDate(order.orderDate)}/>
                            <Field
                                label="Действует"
                                value={order.effectiveFrom
                                    ? `${formatDate(order.effectiveFrom)}${
                                        order.effectiveTo ? ` — ${formatDate(order.effectiveTo)}` : ""}`
                                    : null}
                            />
                            <Field label="Подписал" value={order.signer}/>
                            {order.signedAt && (
                                <Field label="Подписан" value={formatDateTime(order.signedAt)}/>
                            )}
                            <Field label="Основание" value={order.basis} wide/>
                        </dl>

                        <div className="mb-5">
                            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                                Сотрудники — {order.employees.length}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {order.employees.map((employee) => (
                                    <div
                                        key={employee.userId}
                                        className="rounded-[9px] border border-[#e1e7ef] px-3 py-2"
                                    >
                                        <div className="text-[13.5px] font-medium text-[#101a2c]">
                                            {employee.name ?? `Сотрудник № ${employee.userId}`}
                                        </div>
                                        <div className="text-[12px] text-[#8593a8]">
                                            {[employee.positionSnapshot, employee.unitSnapshot]
                                                .filter(Boolean).join(" · ") || "—"}
                                        </div>
                                        <FieldValues json={employee.fieldValues}/>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1.5 text-[11.5px] text-[#8593a8]">
                                Должность и подразделение записаны на дату издания приказа.
                            </p>
                        </div>

                        {order.body && (
                            <div className="mb-5">
                                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                                    Текст приказа
                                </div>
                                <div
                                    className="rounded-[10px] bg-[#f7f9fc] p-3.5 text-[14px] leading-[1.6] text-[#101a2c]"
                                    dangerouslySetInnerHTML={{__html: order.body}}
                                />
                            </div>
                        )}

                        {error && <p className="mb-3 text-[13px] text-[#c0392b]">{error}</p>}

                        {canManage && order.status !== "Signed" && (
                            <div className="border-t border-[#eef2f7] pt-4">
                                <button
                                    type="button"
                                    disabled={busy || order.employees.length === 0}
                                    onClick={sign}
                                    className="rounded-[10px] bg-[#1c7a4d] px-4 py-2 text-[14px] font-medium
                                               text-white transition hover:bg-[#166139] disabled:opacity-60"
                                >
                                    {busy ? "Подписываем…" : "Подписать и зарегистрировать"}
                                </button>
                                <p className="mt-2 text-[12px] text-[#8593a8]">
                                    Номер по книге присвоится сейчас. После подписания приказ не правится —
                                    изменить его можно только новым приказом.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

function Field({label, value, wide}: {label: string; value?: string | null; wide?: boolean}) {
    return (
        <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">{label}</dt>
            <dd className="mt-0.5 text-[13.5px] text-[#101a2c]">{value || "—"}</dd>
        </div>
    );
}

/**
 * Реквизиты по виду приказа. Хранятся как JSON и показываются парами
 * «поле — значение»: набор полей задаётся видом, и таблицы под него нет.
 */
function FieldValues({json}: {json?: string | null}) {
    if (!json) return null;

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(json) as Record<string, unknown>;
    } catch {
        // Значения записаны не нами или испорчены — молчим, сам приказ важнее.
        return null;
    }

    const entries = Object.entries(parsed).filter(([, value]) =>
        value !== null && value !== undefined && value !== "");

    if (entries.length === 0) return null;

    return (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#eef2f7] pt-2">
            {entries.map(([key, value]) => (
                <div key={key}>
                    <dt className="text-[10.5px] uppercase tracking-wide text-[#a8b3c4]">{key}</dt>
                    <dd className="text-[12.5px] text-[#4d5a72]">{String(value)}</dd>
                </div>
            ))}
        </dl>
    );
}
