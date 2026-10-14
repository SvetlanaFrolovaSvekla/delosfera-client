/**
 * Контроль бумажного оригинала (SZ-PAP): кому выдан, к какой дате ждут обратно,
 * где лежит. Пока оригинал на руках, выдать его второй раз нельзя.
 */
import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {szPaperService, type SzOriginal} from "@/service/szService/szPaperService.ts";
import {toast} from "@/service/toastService.ts";
import {formatDate, formatDateTime, ruToIso} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {colors} from "@/design/tokens.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

interface Props {
    szId: number;
    /** Признак носителя с карточки: у электронной записки оригинала нет. */
    isPaperCarrier: boolean;
}

export function SzOriginalPanel({szId, isPaperCarrier}: Props) {
    const {t, i18n} = useTranslation();
    // Выдача и возврат — моменты времени: показываем датой по языку интерфейса.
    const formatMoment = (iso: string | null) => formatDateTime(iso, i18n.language, {day: "2-digit", month: "2-digit", year: "numeric"});
    const [original, setOriginal] = useState<SzOriginal | null>(null);
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [holderId, setHolderId] = useState(0);
    // Дата возврата в формате дд.мм.гггг — как её отдаёт DatePickerInput.
    const [dueBackOn, setDueBackOn] = useState("");
    const [location, setLocation] = useState("");

    const load = useCallback(async () => {
        try {
            setOriginal(await szPaperService.original(szId));
        } catch {
            setError(t("szCard.original.loadFailed")); // Не удалось загрузить состояние оригинала
        }
    }, [szId, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isPaperCarrier) void load();
    }, [isPaperCarrier, load]);

    useEffect(() => {
        userService.lookup().then(setUsers).catch(() => setUsers([]));
    }, []);

    // Электронная записка бумажного оригинала не имеет — панель не нужна.
    if (!isPaperCarrier) return null;

    const run = async (action: () => Promise<unknown>, fallback: string, successMessage: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            toast.success(successMessage);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const handOver = () => {
        if (!holderId) {
            setError(t("szCard.original.holderRequired")); // Выберите, кому выдан оригинал
            return;
        }
        void run(async () => {
            await szPaperService.handOver(szId, {
                holderUserId: holderId,
                dueBackOn: ruToIso(dueBackOn),
                location: location.trim() || null,
            });
            setFormOpen(false);
            setHolderId(0);
            setDueBackOn("");
            setLocation("");
        },
        t("szCard.original.handOverFailed"), // Не удалось зафиксировать выдачу оригинала
        t("szCard.original.handedOverToast")); // Выдача оригинала зафиксирована
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">

                <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {/* Бумажный оригинал */}
                    {t("szCard.original.title")}
                </div>

                <span className="text-[12.5px] font-semibold"
                      style={{color: original?.isOverdue
                          ? colors.ryg.red.fg
                          : original?.isOut ? colors.ryg.amber.fg : colors.inkSubtle}}>
                    {original?.isOut
                        // Возврат просрочен / На руках / В деле
                        ? (original.isOverdue ? t("szCard.original.overdue") : t("szCard.original.out"))
                        : t("szCard.original.inFile")}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {original?.isOut ? (
                <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                    <div className="text-[#1c2740]">
                        {/* Выдан: {имя} */}
                        {t("szCard.original.heldBy", {name: original.holderName ?? "—", interpolation: {escapeValue: false}})}
                        <span className="text-[#8b97ab]"> · {formatMoment(original.handedAt)}</span>
                    </div>
                    {original.location && (
                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                            {/* Место хранения: {место} */}
                            {t("szCard.original.location", {location: original.location, interpolation: {escapeValue: false}})}
                        </div>
                    )}
                    <div className="mt-0.5 text-[12.5px]"
                         style={{color: original.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                        {/* Вернуть до: {дата} / срок не задан */}
                        {t("szCard.original.dueBack", {
                            date: original.dueBackOn
                                ? formatDate(original.dueBackOn)
                                : t("szCard.original.noDueDate"),
                        })}
                        {original.daysLeft != null && (
                            // · просрочка {n} дн / · осталось {n} дн
                            original.isOverdue
                                ? ` · ${t("szCard.original.overdueDays", {n: Math.abs(original.daysLeft)})}`
                                : ` · ${t("szCard.original.daysLeft", {n: original.daysLeft})}`
                        )}
                    </div>
                    {/* Принимать возврат может только тот, кто ведёт оригинал (canManage) */}
                    {original.canManage && (
                    <SzButton
                        variant="success"
                        size="sm"
                        className="mt-2.5"
                        disabled={busy}
                        onClick={() => void run(
                            () => szPaperService.returnOriginal(szId),
                            t("szCard.original.returnFailed"), // Не удалось принять оригинал
                            t("szCard.original.returnedToast"), // Оригинал принят
                        )}
                    >
                        {/* Принять возврат */}
                        {t("szCard.original.acceptReturn")}
                    </SzButton>
                    )}
                </div>
            ) : (
                <div className="text-[13px] text-[#8b97ab]">
                    {original && original.handoverCount > 0
                        // Оригинал в деле. Выдавался {n} раз(а), последний возврат {дата}.
                        ? t("szCard.original.history", {n: original.handoverCount, date: formatMoment(original.returnedAt)})
                        // Оригинал в деле, на руки не выдавался.
                        : t("szCard.original.neverOut")}
                </div>
            )}

            {/* Выдавать оригинал — только тому, кто его ведёт; остальные видят состояние */}
            {original?.canManage && !original.isOut && (
                <SzButton size="sm" className="mt-3" onClick={() => setFormOpen((v) => !v)}>
                    {/* Выдать оригинал */}
                    {t("szCard.original.handOver")}
                </SzButton>
            )}

            {formOpen && original?.canManage && !original.isOut && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <div className="flex flex-wrap gap-2">
                        <div className="w-[240px]">
                            <UserPickerField
                                people={users}
                                value={holderId || null}
                                onChange={setHolderId}
                                placeholder={t("szCard.original.holderPlaceholder")} // Кому выдан…
                                modalTitle={t("szCard.original.holderModalTitle")} // Кому выдан оригинал
                                searchPlaceholder={t("szCard.fields.userSearch")}
                            />
                        </div>
                        {/* Дата возврата */}
                        <Tooltip content={t("szCard.original.dueDateTooltip")} side="top">
                            <div className="w-[170px]">
                                <DatePickerInput
                                    value={dueBackOn}
                                    onChange={setDueBackOn}
                                    className="!h-10 !rounded-[9px] !text-[13px]"
                                />
                            </div>
                        </Tooltip>
                        <input value={location} onChange={(e) => setLocation(e.target.value)}
                               placeholder={t("szCard.original.locationPlaceholder")} // Где будет лежать оригинал
                               className={`${inputClass} flex-1 min-w-[220px]`}/>
                    </div>
                    <SzButton variant="primary" size="sm" className="mt-2.5" onClick={handOver} disabled={busy}>
                        {/* Зафиксировать выдачу */}
                        {t("szCard.original.confirmHandOver")}
                    </SzButton>
                </div>
            )}
        </div>
    );
}
