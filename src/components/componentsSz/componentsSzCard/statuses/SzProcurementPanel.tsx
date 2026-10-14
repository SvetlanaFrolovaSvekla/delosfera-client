import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {szProcurementService, type SzProcurement} from "@/service/szService/szProcurementService.ts";
import {toast} from "@/service/toastService.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {colors} from "@/design/tokens.ts";
import {formatDateTime, formatMoney} from "@/utils/szProcess/szCardUtils.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

interface Props {
    szId: number;
    /** Форма вида записки: панель нужна только закупочным. */
    formKey: string;
    /**
     * Карточка перечитывает записку: после запуска закупки у неё появляется заявка
     * (procurementRequestId), и ссылка на неё (SzProcurementLink) должна показаться сразу.
     */
    onChanged?: () => Promise<void> | void;
}

/**
 * Запуск закупки по записке (PRC-01). Закупочный контур появится отдельным модулем,
 * здесь — передача реквизитов и связь записки с заявкой.
 */
export function SzProcurementPanel({szId, formKey, onChanged}: Props) {
    const {t, i18n} = useTranslation();
    const [state, setState] = useState<SzProcurement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        try {
            setState(await szProcurementService.get(szId));
        } catch {
            setError(t("szCard.procurementPanel.loadFailed")); // Не удалось загрузить состояние закупки
        }
    }, [szId, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (formKey === "Procurement") void load();
    }, [formKey, load]);

    // Панель показывается только у записок «на закупку».
    if (formKey !== "Procurement") return null;

    const handOver = () => {
        setBusy(true);
        setError(null);
        szProcurementService.handOver(szId, subject.trim() || undefined, note.trim() || undefined)
            .then(() => {
                setFormOpen(false);
                setSubject("");
                setNote("");
                toast.success(t("szCard.procurementPanel.startedToast")); // Закупка запущена, заявка создана
                // Закупка уже запущена: сбой перечитывания карточки не должен выглядеть как отказ.
                return Promise.all([load(), Promise.resolve(onChanged?.()).catch(() => undefined)]);
            })
            .catch((e) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                setError(message ?? t("szCard.procurementPanel.startFailed")); // Не удалось запустить закупку
            })
            .finally(() => setBusy(false));
    };

    // Запустить закупку может автор и Сектор закупок (canManage); остальные — только смотрят.
    const canHandOver = state != null && state.canManage && !state.isHandedOver && state.blockers.length === 0;

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {/* Закупка */}
                    {t("szCard.procurementPanel.title")}
                </div>

                <span className="text-[12.5px] font-semibold"
                      style={{color: state?.isHandedOver ? colors.ryg.green.fg : colors.inkSubtle}}>
                    {/* Запущена {дата} / Не запускалась */}
                    {state?.isHandedOver
                        ? t("szCard.procurementPanel.startedAt", {date: formatDateTime(state.handedOverAt, i18n.language, {day: "2-digit", month: "2-digit", year: "numeric"})})
                        : t("szCard.procurementPanel.notStarted")}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                <div className="text-[#1c2740]">
                    {/* Сумма: {сумма} */}
                    {t("szCard.procurementPanel.amount", {amount: formatMoney(state?.amount, i18n.language)})}
                    <span className="text-[#8b97ab]">
                        {/* · бюджет: не указан / заложен / не заложен */}
                        {" · "}{t("szCard.procurementPanel.budget", {
                            value: state?.hasBudget == null
                                ? t("szCard.procurementPanel.budgetUnknown")
                                : state.hasBudget ? t("szCard.procurementPanel.budgetSet") : t("szCard.procurementPanel.budgetNotSet"),
                        })}
                    </span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                    {/* Инициатор: {имя}, {подразделение} */}
                    {t("szCard.procurementPanel.initiator", {name: state?.initiatorName ?? "—", interpolation: {escapeValue: false}})}
                    {state?.initiatorUnit && `, ${state.initiatorUnit}`}
                </div>
            </div>

            {state?.isHandedOver ? (
                <div className="mt-3 rounded-[10px] border border-[#c9e6d5] bg-[#eef8f2] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    {/* Заявка: {номер / без номера} · {название} */}
                    {t("szCard.procurementPanel.request", {
                        number: state.procurementRegNumber ?? t("szCard.procurementPanel.noNumber"),
                        title: state.procurementTitle,
                        interpolation: {escapeValue: false},
                    })}
                </div>
            ) : state && state.blockers.length > 0 ? (
                <div className="mt-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
                    {/* Закупку пока запустить нельзя: */}
                    <div className="font-semibold">{t("szCard.procurementPanel.blocked")}</div>
                    <ul className="mt-1 mb-0 pl-5">
                        {state.blockers.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                </div>
            ) : null}

            {canHandOver && (
                <SzButton size="sm" className="mt-3" onClick={() => setFormOpen((v) => !v)}>
                    {/* Запустить закупку */}
                    {t("szCard.procurementPanel.start")}
                </SzButton>
            )}

            {formOpen && canHandOver && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        // Предмет закупки — так будет называться заявка
                        placeholder={t("szCard.procurementPanel.subjectPlaceholder")}
                        className={inputClass}
                    />
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        // Комментарий к передаче (необязательно)
                        placeholder={t("szCard.procurementPanel.notePlaceholder")}
                        className={`${inputClass} mt-2`}
                    />
                    <SzButton variant="primary" size="sm" className="mt-2.5" onClick={handOver} disabled={busy}>
                        {/* Создать заявку */}
                        {t("szCard.procurementPanel.createRequest")}
                    </SzButton>
                </div>
            )}
        </div>
    );
}
