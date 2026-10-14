// Раздел "Рассылка с уведомлением о новых редакциях".
// Письмо выбранным сотрудникам уходит каждый раз, когда ВНД консолидируется
// (действует новая редакция) или у нового ВНД появляется первая действующая редакция.
import {useTranslation} from "react-i18next";
import {useEffect, useMemo, useState} from "react";
import {toast} from "@/service/toastService.ts";
import {
    vndNewRedactionMailingService,
    type VndNewRedactionMailingRecipient,
} from "@/service/vndNewRedactionMailingService/vndNewRedactionMailingService.ts";
import {NewRedactionRecipientsPickerModal} from "./NewRedactionRecipientsPickerModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {BellRing, Plus, Search, Trash2, UserX} from "lucide-react";

export function NewRedactionMailingSection() {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [enabled, setEnabled] = useState(false);
    const [notifyInApp, setNotifyInApp] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [recipients, setRecipients] = useState<VndNewRedactionMailingRecipient[]>([]);
    const [query, setQuery] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        vndNewRedactionMailingService.get()
            .then((s) => {
                setEnabled(s.enabled);
                setNotifyInApp(s.notifyInApp);
                setNotifyEmail(s.notifyEmail);
                setRecipients(s.recipients);
            })
            // Пустая строка = ошибка без текста от сервера: тогда показываем свой перевод (t в эффекте не используем)
            .catch((e) => setLoadError(e instanceof Error ? e.message : ""))
            .finally(() => setLoading(false));
    }, []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        const sorted = [...recipients].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
        if (!q) return sorted;
        return sorted.filter((r) =>
            `${r.fullName} ${r.email ?? ""} ${r.orgUnitName ?? ""} ${r.positionName ?? ""}`.toLowerCase().includes(q));
    }, [recipients, query]);

    const noChannel = !notifyInApp && !notifyEmail;
    const cannotSave = enabled && (noChannel || recipients.length === 0);

    const remove = (userId: number) => {
        setRecipients((prev) => prev.filter((r) => r.userId !== userId));
        setDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saved = await vndNewRedactionMailingService.update({
                enabled,
                notifyInApp,
                notifyEmail,
                userIds: recipients.map((r) => r.userId),
            });
            setRecipients(saved.recipients);
            setDirty(false);
            // Настройки рассылки сохранены
            toast.success(t("notificationMailingSettingsPage.common.mailingSaved"));
        } catch (e) {
            // Не удалось сохранить
            toast.error(t("notificationMailingSettingsPage.common.saveFailed"), e instanceof Error ? e.message : "");
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
                    <BellRing size={17} strokeWidth={1.8}/>
                </span>
                <div>
                    <h3 className="m-0 text-[14.5px] font-bold text-[#1c2740]">
                        {/* Рассылка с уведомлением о новых редакциях */}
                        {t("notificationMailingSettingsPage.newRedactionsForm.title")}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        {/* Письмо выбранным сотрудникам при каждой консолидации ВНД: «ВНД такой-то обновлён» или «Новый ВНД» — когда у документа появляется первая действующая редакция */}
                        {t("notificationMailingSettingsPage.newRedactionsForm.description")}
                    </p>
                </div>
            </div>

            {loadError !== null && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {/* Не удалось загрузить настройки рассылки */}
                    {loadError || t("notificationMailingSettingsPage.common.mailingLoadError")}
                </div>
            )}

            <label
                className="mt-4 inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[#3a4560]">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                        setEnabled(e.target.checked);
                        setDirty(true);
                    }}
                    className="h-[16px] w-[16px] cursor-pointer accent-[#4e57d6]"
                />
                {/* Рассылка включена */}
                {t("notificationMailingSettingsPage.newRedactionsForm.enabled")}
            </label>

            <div
                className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#eef2f7] bg-[#fafbfd] px-3.5 py-3">
                {/* Куда отправлять */}
                <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">{t("notificationMailingSettingsPage.common.channelsTitle")}</span>
                <label
                    className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => {
                            setNotifyEmail(e.target.checked);
                            setDirty(true);
                        }}
                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                    />
                    {/* На почту */}
                    {t("notificationMailingSettingsPage.common.channelEmail")}
                </label>
                <label
                    className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={notifyInApp}
                        onChange={(e) => {
                            setNotifyInApp(e.target.checked);
                            setDirty(true);
                        }}
                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                    />
                    {/* В системе (уведомление в Делосфере) */}
                    {t("notificationMailingSettingsPage.common.channelInApp")}
                </label>
                {noChannel && (
                    <span className="text-[11.5px] font-semibold text-[#c0392b]">{/* Выберите хотя бы один канал */}{t("notificationMailingSettingsPage.common.channelRequired")}</span>
                )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    {/* Получатели ({n}) */}
                    {t("notificationMailingSettingsPage.newRedactionsForm.recipientsCount", {n: recipients.length})}
                </span>
                <div className="ml-auto flex items-center gap-2">
                    {recipients.length > 5 && (
                        <div className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] px-2.5">
                            <Search size={13} className="text-[#a3adbd]"/>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                /* Найти среди получателей… */
                                placeholder={t("notificationMailingSettingsPage.newRedactionsForm.searchRecipients")}
                                className="w-[200px] border-none text-[12.5px] outline-none"
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#d4d6f8] bg-[#f5f6fd] px-3 text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                    >
                        <Plus size={14}/>
                        {/* Выбрать получателей */}
                        {t("notificationMailingSettingsPage.newRedactionsForm.pickRecipients")}
                    </button>
                </div>
            </div>

            <div className="mt-2 max-h-[380px] overflow-y-auto rounded-xl border border-[#eef2f7]">
                {recipients.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12.5px] text-[#8b97ab]">
                        {/* Получатели не выбраны. Нажмите «Выбрать получателей» — можно отобрать сотрудников по СП, должности или роли, как на странице «Пользователи». */}
                        {t("notificationMailingSettingsPage.newRedactionsForm.noRecipients")}
                    </div>
                ) : shown.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12.5px] text-[#8b97ab]">{/* Никого не нашлось */}{t("notificationMailingSettingsPage.newRedactionsForm.nothingFound")}</div>
                ) : (
                    shown.map((r) => (
                        <div key={r.userId}
                             className="group flex items-center gap-3 border-b border-[#f2f5f9] px-3.5 py-2 last:border-b-0 hover:bg-[#fafbfd]">
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#26324a]">
                                    <span className="truncate">{r.fullName}</span>
                                    {r.isInactive && (
                                        <span /* Заблокирован или отключён — письмо не уйдёт */ title={t("notificationMailingSettingsPage.newRedactionsForm.inactiveHint")}
                                              className="inline-flex flex-none items-center gap-1 rounded-full bg-[#fdf1f1] px-2 py-[1px] text-[10px] font-medium text-[#c0392b]">
                                            {/* неактивен */}
                                            <UserX size={10}/> {t("notificationMailingSettingsPage.newRedactionsForm.inactive")}
                                        </span>
                                    )}
                                </span>
                                <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                    {[r.email, r.positionName, r.orgUnitName].filter(Boolean).join(" · ")}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => remove(r.userId)}
                                /* Убрать из рассылки */
                                title={t("notificationMailingSettingsPage.newRedactionsForm.removeRecipient")}
                                className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] text-[#c3ccd8] hover:bg-[#fdeceb] hover:text-[#c0392b]"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 flex items-center gap-3">
                <button
                    onClick={() => void handleSave()}
                    disabled={saving || cannotSave}
                    className="h-9 cursor-pointer rounded-[9px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {/* Сохранение… / Сохранить */}
                    {saving ? t("general.saving") : t("general.save")}
                </button>
                {enabled && recipients.length === 0 && (
                    <span className="text-[12px] text-[#c0392b]">{/* Добавьте хотя бы одного получателя */}{t("notificationMailingSettingsPage.newRedactionsForm.addRecipientRequired")}</span>
                )}
                {dirty && !cannotSave && (
                    <span className="text-[12px] text-[#b3701e]">{/* Есть несохранённые изменения */}{t("notificationMailingSettingsPage.newRedactionsForm.unsavedChanges")}</span>
                )}
            </div>

            {pickerOpen && (
                <NewRedactionRecipientsPickerModal
                    initial={recipients}
                    onClose={() => setPickerOpen(false)}
                    onConfirm={(next) => {
                        setRecipients(next);
                        setDirty(true);
                    }}
                />
            )}
        </div>
    );
}
