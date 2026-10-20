/**
 * Карточка приказа.
 *
 * Подписанный приказ показывается только на чтение: с ним уже ознакомили
 * сотрудника под роспись, и правка задним числом означала бы, что ознакомили
 * не с тем.
 */
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {
    hrOrderService,
    type HrOrder, type HrOrderKindInfo,
} from "@/service/hrOrderService/hrOrderService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime} from "@/components/componentsGeneral/DataTable.tsx";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ModalHeader} from "@/components/componentsGeneral/rubricator/ModalHeader.tsx";
import {ACCENT} from "@/constants/accent.ts";
import {toast} from "@/service/toastService.ts";
import {FileText, Pencil, Users} from "lucide-react";

interface Props {
    id: number;
    kinds: HrOrderKindInfo[];
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (id: number) => void;
}

const A = ACCENT.violet;

export function HrOrderCardModal({id, kinds, canManage, onClose, onChanged, onEdit}: Props) {
    const {t} = useTranslation();
    const [order, setOrder] = useState<HrOrder | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        hrOrderService.get(id)
            .then(setOrder)
            .catch(() => setError(t("hrOrderCard.loadFailed"))); // "Не удалось загрузить приказ."
    }, [id, t]);

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
            toast.success(t("hrOrderCard.signed", "Приказ подписан и зарегистрирован"));
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("hrOrderCard.signFailed")); // "Не удалось подписать приказ."
        } finally {
            setBusy(false);
        }
    };

    const kindTitle = order ? kinds.find((k) => k.kind === order.kind)?.title ?? order.kind : "";

    const isEditable = canManage && !!order && order.status !== "Signed";

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white
                           shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]"
            >
                {!order ? (
                    <>
                        <ModalHeader title="" onClose={onClose}/>
                        {error
                            ? <p className="px-6 py-8 text-center text-[13px] text-[#c0392b]">{error}</p>
                            : <Loader label={t("hrOrderCard.loading" /* "Загружаем…" */)}/>}
                    </>
                ) : (
                    <>
                        <ModalHeader title={order.title} onClose={onClose}/>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[13px] text-[#8b97ab]">
                                    {/* "без номера" */}
                                    {order.regNumber ?? t("hrOrderCard.noNumber")}
                                </span>
                                <span className="text-[12.5px] text-[#8b97ab]">{kindTitle}</span>
                                <Badge tone={order.status === "Signed" ? "good" : "info"}>
                                    {/* Проект / На подписании / Подписан / Отменён - берём из hrOrdersPage.statuses */}
                                    {t(`hrOrdersPage.statuses.${order.status}`)}
                                </Badge>

                                {isEditable && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(order.id)}
                                        className={`ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px]
                                                    border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold
                                                    text-[#55617a] transition ${A.hoverSoftBg} ${A.hoverText}`}
                                    >
                                        <Pencil size={14}/>
                                        {/* "Изменить" */}
                                        {t("hrOrderCard.edit")}
                                    </button>
                                )}
                            </div>

                            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                                <ReadOnlyField
                                    label={t("hrOrderCard.orderDate" /* "Дата приказа" */)}
                                    value={formatDate(order.orderDate)}
                                />
                                <ReadOnlyField
                                    label={t("hrOrderCard.effective" /* "Действует" */)}
                                    value={order.effectiveFrom
                                        ? `${formatDate(order.effectiveFrom)}${
                                            order.effectiveTo ? ` — ${formatDate(order.effectiveTo)}` : ""}`
                                        : "—"}
                                />
                                <ReadOnlyField
                                    label={t("hrOrderCard.signer" /* "Подписал" */)}
                                    value={order.signer || "—"}
                                />
                                {order.signedAt && (
                                    <ReadOnlyField
                                        label={t("hrOrderCard.signedAt" /* "Подписан" */)}
                                        value={formatDateTime(order.signedAt)}
                                    />
                                )}
                                <div className="col-span-2 sm:col-span-3">
                                    <ReadOnlyField
                                        label={t("hrOrderCard.basis" /* "Основание" */)}
                                        value={order.basis || "—"}
                                    />
                                </div>
                            </div>

                            <Section
                                icon={<Users size={16} className={A.text}/>}
                                /* "Сотрудники — {{count}}" */
                                title={t("hrOrderCard.employees", {count: order.employees.length})}
                                noMarginBottom={!order.body}
                            >
                                <div className="flex flex-col gap-2">
                                    {order.employees.map((employee) => (
                                        <div
                                            key={employee.userId}
                                            className="rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] px-3 py-2"
                                        >
                                            <div className="text-[13px] font-semibold text-[#1c2740]">
                                                {/* "Сотрудник № {{id}}" - если имя не найдено */}
                                                {employee.name ?? t("hrOrderCard.employeeFallback", {id: employee.userId})}
                                            </div>
                                            <div className="text-[12px] text-[#8b97ab]">
                                                {[employee.positionSnapshot, employee.unitSnapshot]
                                                    .filter(Boolean).join(" · ") || "—"}
                                            </div>
                                            <FieldValues json={employee.fieldValues}/>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11.5px] text-[#8b97ab]">
                                    {/* "Должность и подразделение записаны на дату издания приказа." */}
                                    {t("hrOrderCard.snapshotNote")}
                                </p>
                            </Section>

                            {order.body && (
                                <Section
                                    icon={<FileText size={16} className={A.text}/>}
                                    /* "Текст приказа" */
                                    title={t("hrOrderCard.orderText")}
                                    noMarginBottom
                                >
                                    <div
                                        className="text-[14px] leading-[1.6] text-[#1c2740]"
                                        dangerouslySetInnerHTML={{__html: order.body}}
                                    />
                                </Section>
                            )}

                            {error && <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>}
                        </div>

                        {isEditable && (
                            <div className="flex-none border-t border-[#eef2f7] px-6 py-4">
                                <button
                                    type="button"
                                    disabled={busy || order.employees.length === 0}
                                    onClick={sign}
                                    className={`h-10 cursor-pointer rounded-[10px] px-5 text-[13px] font-semibold text-white
                                                transition hover:brightness-[1.06] disabled:cursor-not-allowed
                                                disabled:opacity-50 ${A.bg} ${A.hoverBg}`}
                                >
                                    {/* "Подписываем…" / "Подписать и зарегистрировать" */}
                                    {busy ? t("hrOrderCard.signing") : t("hrOrderCard.signAndRegister")}
                                </button>
                                <p className="mt-2 text-[12px] text-[#8b97ab]">
                                    {/* "Номер по книге присвоится сейчас. После подписания приказ не правится — изменить его можно только новым приказом." */}
                                    {t("hrOrderCard.signNote")}
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
                    <dt className="text-[10.5px] uppercase tracking-wide text-[#a3adbd]">{key}</dt>
                    <dd className="text-[12.5px] text-[#55617a]">{String(value)}</dd>
                </div>
            ))}
        </dl>
    );
}
