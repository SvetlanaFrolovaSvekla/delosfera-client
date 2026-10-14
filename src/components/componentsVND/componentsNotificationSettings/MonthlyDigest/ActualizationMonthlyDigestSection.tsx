// Раздел "Ежемесячное уведомление - 1-го числа" (вкладка "Нормотворчество" настроек рассылок).
// Получатели - общий список "Ответственные сотрудники за актуализацию"
// (ActualizationResponsibleSection) по каждому СП; здесь настраивается только сама рассылка:
// включена ли она и какие доп. колонки идут во вложенный Excel-план.
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {actualizationNotificationsService, type ActualizationNotificationSettings} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {ACTUALIZATION_COLUMNS} from "@/constants/vndConstants/actualizationColumns.ts";
import {ActualizationLetterPreviewModal} from "@/components/componentsVND/componentsNotificationSettings/MonthlyDigest/ActualizationLetterPreviewModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Eye, Mail} from "lucide-react";

const TOGGLEABLE_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
const FIXED_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => c.fixed);

export function ActualizationMonthlyDigestSection() {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [enabled, setEnabled] = useState(false);
    const [notifyInApp, setNotifyInApp] = useState(true);
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [restSettings, setRestSettings] = useState<Pick<ActualizationNotificationSettings,
        "criticalRemindersEnabled" | "criticalReminderDays" | "criticalRemindersNotifyInApp" | "criticalRemindersNotifyEmail">>({
        criticalRemindersEnabled: false, criticalReminderDays: [],
        criticalRemindersNotifyInApp: true, criticalRemindersNotifyEmail: true,
    });
    const [columns, setColumns] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        actualizationNotificationsService.getSettings()
            .then((s) => {
                setEnabled(s.monthlyDigestEnabled);
                setNotifyInApp(s.monthlyDigestNotifyInApp);
                setNotifyEmail(s.monthlyDigestNotifyEmail);
                setColumns(Object.fromEntries(s.monthlyDigestColumns.map((k) => [k, true])));
                setRestSettings({
                    criticalRemindersEnabled: s.criticalRemindersEnabled, criticalReminderDays: s.criticalReminderDays,
                    criticalRemindersNotifyInApp: s.criticalRemindersNotifyInApp,
                    criticalRemindersNotifyEmail: s.criticalRemindersNotifyEmail,
                });
            })
            // Пустая строка = ошибка без текста от сервера: тогда показываем свой перевод (t в эффекте не используем)
            .catch(() => setLoadError(""))
            .finally(() => setLoading(false));
    }, []);

    const toggleColumn = (key: string) =>
        setColumns((prev) => ({...prev, [key]: !(prev[key] === true)}));

    const handleSave = async () => {
        if (enabled && !notifyInApp && !notifyEmail) {
            // Не удалось сохранить / Выберите хотя бы один канал — в системе или по почте
            toast.error(t("notificationMailingSettingsPage.common.saveFailed"), t("notificationMailingSettingsPage.common.channelRequiredToast"));
            return;
        }

        setSaving(true);

        try {
            const monthlyDigestColumns = TOGGLEABLE_COLUMNS
                .filter((c) => columns[c.key] === true)
                .map((c) => c.key);

            await actualizationNotificationsService.updateSettings({
                monthlyDigestEnabled: enabled,
                monthlyDigestColumns,
                monthlyDigestNotifyInApp: notifyInApp,
                monthlyDigestNotifyEmail: notifyEmail,
                ...restSettings,
            });
            // Настройки рассылки сохранены
            toast.success(t("notificationMailingSettingsPage.common.mailingSaved"));
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
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <Mail size={17} strokeWidth={1.8}/>
                </span>
                <div>
                    <h3 className="m-0 text-[14.5px] font-bold text-[#1c2740]">
                        {/* Ежемесячное уведомление — 1-го числа */}
                        {t("notificationMailingSettingsPage.monthlyDigestForm.title")}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        {/* Сводка по ВНД подразделения ответственным сотрудникам СП, с планом актуализации в Excel */}
                        {t("notificationMailingSettingsPage.monthlyDigestForm.description")}
                    </p>
                </div>
            </div>

            {loadError !== null && (
                <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {/* Не удалось загрузить настройки рассылки */}
                    {loadError || t("notificationMailingSettingsPage.common.mailingLoadError")}
                </div>
            )}

            <label className="mt-4 inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[#3a4560]">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-[16px] w-[16px] cursor-pointer accent-[#4e57d6]"
                />
                {/* Рассылать сводку 1-го числа каждого месяца */}
                {t("notificationMailingSettingsPage.monthlyDigestForm.enabled")}
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
                    {/* На почту (письмо с планом в Excel) */}
                    {t("notificationMailingSettingsPage.monthlyDigestForm.channelEmail")}
                </label>
                {!notifyInApp && !notifyEmail && (
                    <span className="text-[11.5px] font-semibold text-[#c0392b]">
                        {/* Выберите хотя бы один канал */}
                        {t("notificationMailingSettingsPage.common.channelRequired")}
                    </span>
                )}
            </div>

            <div className="mt-4">
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {FIXED_COLUMNS.map((c) => (
                        <span key={c.key}
                              className="inline-flex items-center gap-1 rounded-full border border-[#e5e9f0] bg-[#f6f8fb] px-2.5 py-1 text-[11.5px] font-semibold text-[#8b97ab]">
                            {t(c.labelKey)}
                        </span>
                    ))}
                </div>
                <div className="mb-1 text-[11px] text-[#a3adbd]">
                    {/* Колонки выше входят во вложение всегда. Ниже — дополнительные, на выбор. */}
                    {t("notificationMailingSettingsPage.monthlyDigestForm.columnsHint")}
                </div>

                <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-3 gap-y-1.5 rounded-xl border border-[#eef2f7] p-3.5">
                    {TOGGLEABLE_COLUMNS.map((c) => (
                        <label key={c.key}
                               className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-[#3a4560] hover:bg-[#f6f8fb]">
                            <input
                                type="checkbox"
                                checked={columns[c.key] === true}
                                onChange={() => toggleColumn(c.key)}
                                className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                            />
                            {t(c.labelKey)}
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving || (enabled && !notifyInApp && !notifyEmail)}
                    className="cursor-pointer h-9 rounded-[9px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {/* Сохранение… / Сохранить */}
                    {saving ? t("general.saving") : t("general.save")}
                </button>
                <button
                    onClick={() => setPreviewOpen(true)}
                    className="cursor-pointer inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                >
                    <Eye size={14}/>
                    {/* Демонстрация письма */}
                    {t("notificationMailingSettingsPage.monthlyDigestForm.preview")}
                </button>
            </div>

            {previewOpen && <ActualizationLetterPreviewModal onClose={() => setPreviewOpen(false)}/>}
        </div>
    );
}
