// Раздел "Критические напоминания" настроек рассылок по актуализации ВНД.
// Администратор задаёт набор порогов - количество дней ДО наступления
// просрочки актуализации, за которое отправляется напоминание (например 30/14/7/3/1/0).
// Получатели не настраиваются здесь отдельно: это тот же общий список "Ответственные сотрудники
// за актуализацию" (см. ActualizationResponsibleSection), плюс куратор соответствующего СП
// (назначается в справочнике структурных подразделений) - оба получают одно и то же письмо.
import {useTranslation} from "react-i18next";
import {useEffect, useState} from "react";
import {actualizationNotificationsService} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {toast} from "@/service/toastService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {AlarmClock, X} from "lucide-react";

export function ActualizationCriticalRemindersSection() {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [enabled, setEnabled] = useState(false);
    const [notifyInApp, setNotifyInApp] = useState(true);
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [days, setDays] = useState<number[]>([]);
    const [draftValue, setDraftValue] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        actualizationNotificationsService.getSettings()
            .then((s) => {
                setEnabled(s.criticalRemindersEnabled);
                setNotifyInApp(s.criticalRemindersNotifyInApp);
                setNotifyEmail(s.criticalRemindersNotifyEmail);
                setDays(s.criticalReminderDays);
            })
            // Пустая строка = ошибка без текста от сервера: тогда показываем свой перевод (t в эффекте не используем)
            .catch(() => setLoadError(""))
            .finally(() => setLoading(false));
    }, []);

    const addThreshold = () => {
        const parsed = Number(draftValue);

        if (!Number.isInteger(parsed) || parsed < 0) {
            // Некорректное значение / Введите целое число дней (0 и больше)
            toast.error(t("notificationMailingSettingsPage.criticalRemindersForm.invalidValue"), t("notificationMailingSettingsPage.criticalRemindersForm.invalidValueHint"));
            return;
        }

        if (days.includes(parsed)) {
            setDraftValue("");
            return;
        }

        setDays((prev) => [...prev, parsed].sort((a, b) => a - b));
        setDraftValue("");
    };

    const removeThreshold = (value: number) => setDays((prev) => prev.filter((d) => d !== value));

    const handleSave = async () => {
        if (enabled && !notifyInApp && !notifyEmail) {
            // Не удалось сохранить / Выберите хотя бы один канал — в системе или по почте
            toast.error(t("notificationMailingSettingsPage.common.saveFailed"), t("notificationMailingSettingsPage.common.channelRequiredToast"));
            return;
        }

        setSaving(true);

        try {
            const settings = await actualizationNotificationsService.getSettings();
            const updated = await actualizationNotificationsService.updateSettings({
                ...settings,
                criticalRemindersEnabled: enabled,
                criticalReminderDays: days,
                criticalRemindersNotifyInApp: notifyInApp,
                criticalRemindersNotifyEmail: notifyEmail,
            });
            setEnabled(updated.criticalRemindersEnabled);
            setDays(updated.criticalReminderDays);
            setNotifyInApp(updated.criticalRemindersNotifyInApp);
            setNotifyEmail(updated.criticalRemindersNotifyEmail);
            // Настройки напоминаний сохранены
            toast.success(t("notificationMailingSettingsPage.criticalRemindersForm.saved"));
        } catch (e) {
            // Не удалось сохранить
            const message = e instanceof Error ? e.message : t("notificationMailingSettingsPage.common.saveFailed");
            // Не удалось сохранить
            toast.error(t("notificationMailingSettingsPage.common.saveFailed"), message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                {/* Загрузка… - подпись Loader по умолчанию (general.loading) */}
                <Loader/>
            </div>
        );
    }

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#fdf1e5] text-[#b3730a]">
                    <AlarmClock size={17} strokeWidth={1.8}/>
                </span>
                <div>
                    <h3 className="m-0 text-[14.5px] font-bold text-[#1c2740]">
                        {/* Критические напоминания */}
                        {t("notificationMailingSettingsPage.criticalRemindersForm.title")}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        {/* Уведомления за N дней до наступления просрочки актуализации — ответственным сотрудникам СП и куратору подразделения */}
                        {t("notificationMailingSettingsPage.criticalRemindersForm.description")}
                    </p>
                </div>
            </div>

            {loadError !== null && (
                <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {/* Не удалось загрузить настройки напоминаний */}
                    {loadError || t("notificationMailingSettingsPage.criticalRemindersForm.loadError")}
                </div>
            )}

            <label className="mt-4 inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[#3a4560]">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-[16px] w-[16px] cursor-pointer accent-[#4e57d6]"
                />
                {/* Рассылать критические напоминания */}
                {t("notificationMailingSettingsPage.criticalRemindersForm.enabled")}
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#eef2f7] bg-[#fafbfd] px-3.5 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    {/* Куда отправлять */}
                    {t("notificationMailingSettingsPage.common.channelsTitle")}
                </span>
                <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={notifyInApp}
                        onChange={(e) => setNotifyInApp(e.target.checked)}
                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                    />
                    {/* В системе (уведомление в Делосфере) */}
                    {t("notificationMailingSettingsPage.common.channelInApp")}
                </label>
                <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                    />
                    {/* На почту */}
                    {t("notificationMailingSettingsPage.common.channelEmail")}
                </label>
                {!notifyInApp && !notifyEmail && (
                    <span className="text-[11.5px] font-semibold text-[#c0392b]">
                        {/* Выберите хотя бы один канал */}
                        {t("notificationMailingSettingsPage.common.channelRequired")}
                    </span>
                )}
            </div>

            <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    {/* Пороги (дней до просрочки) */}
                    {t("notificationMailingSettingsPage.criticalRemindersForm.thresholdsTitle")}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#eef2f7] p-3.5">
                    {days.length === 0 && (
                        <span className="text-[12.5px] text-[#a3adbd]">{/* Пороги ещё не заданы */}{t("notificationMailingSettingsPage.criticalRemindersForm.noThresholds")}</span>
                    )}
                    {days.map((d) => (
                        <span key={d}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f5f9] pl-3 pr-2 py-1.5 text-[12.5px] font-semibold text-[#3a4560]">
                            {/* В день просрочки / За {d} дн. */}
                            {d === 0 ? t("notificationMailingSettingsPage.criticalRemindersForm.onDueDay") : t("notificationMailingSettingsPage.criticalRemindersForm.daysBefore", {d})}
                            <button
                                type="button"
                                onClick={() => removeThreshold(d)}
                                className="w-[18px] h-[18px] flex-none grid place-items-center rounded-full text-[#8b97ab] hover:bg-white cursor-pointer"
                            >
                                <X className="w-[11px] h-[11px]" strokeWidth={2.5}/>
                            </button>
                        </span>
                    ))}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addThreshold();
                            }
                        }}
                        /* Число дней… */
                        placeholder={t("notificationMailingSettingsPage.criticalRemindersForm.daysPlaceholder")}
                        className="h-9 w-[160px] rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                    />
                    <button
                        onClick={addThreshold}
                        disabled={!draftValue}
                        className="cursor-pointer h-9 rounded-[9px] border border-[#e5e9f0] px-3.5 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {/* Добавить порог */}
                        {t("notificationMailingSettingsPage.criticalRemindersForm.addThreshold")}
                    </button>
                </div>
            </div>

            <div className="mt-4">
                <button
                    onClick={handleSave}
                    disabled={saving || (enabled && !notifyInApp && !notifyEmail)}
                    className="cursor-pointer h-9 rounded-[9px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {/* Сохранение… / Сохранить */}
                    {saving ? t("general.saving") : t("general.save")}
                </button>
            </div>
        </div>
    );
}
