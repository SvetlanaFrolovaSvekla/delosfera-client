import {useEffect, useState} from "react";
import {Check} from "lucide-react";
import {notificationSettingService, type NotificationSetting} from "@/service/notificationSettingService.ts";
import {notificationPopupPreference} from "@/service/notificationPopupPreference.ts";

/**
 * Настройки уведомлений. emailDigestEnabled хранится на бэке (общий для всех устройств
 * пользователя), а popupEnabled - чисто клиентская настройка (localStorage этого браузера):
 * управляет только всплывающими тостами при получении нового уведомления, не самой рассылкой.
 */
export function NotificationSettingsPage() {
    const [setting, setSetting] = useState<NotificationSetting | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [popupEnabled, setPopupEnabled] = useState(() => notificationPopupPreference.isEnabled());

    useEffect(() => {
        notificationSettingService.get()
            .then(setSetting)
            .catch(() => setError("Не удалось загрузить настройки"));
    }, []);

    async function toggle(key: keyof NotificationSetting) {
        if (!setting) return;
        const next = {...setting, [key]: !setting[key]};
        setSetting(next);
        setSaving(true);
        setError(null);
        try {
            await notificationSettingService.set(next);
        } catch {
            setSetting(setting); // откат
            setError("Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    }

    function togglePopup() {
        const next = !popupEnabled;
        setPopupEnabled(next);
        notificationPopupPreference.set(next);
    }

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Уведомления</h1>
            <div className="mt-1 text-[12.5px] text-[#8b97ab]">Как система напоминает о задачах и сроках</div>

            {error && <div className="mt-4 text-[13px] text-[#c0392b]">{error}</div>}
            {!setting && !error && <div className="mt-4 text-[13px] text-[#8b97ab]">Загрузка…</div>}

            {setting && (
                <div className="mt-5 bg-white border border-[#e5e9f0] rounded-[13px] divide-y divide-[#eef2f7]">
                    <label className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer">
                        <span>
                            <span className="block text-[14px] font-semibold text-[#0f1b2d]">Утренний дайджест на почту</span>
                            <span className="block text-[12.5px] text-[#8b97ab] mt-0.5">
                                Раз в день письмо со сводкой: что горит и что на подходе.
                            </span>
                        </span>
                        <span className="relative shrink-0">
                            <input
                                type="checkbox"
                                checked={setting.emailDigestEnabled}
                                onChange={() => void toggle("emailDigestEnabled")}
                                disabled={saving}
                                className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer disabled:cursor-default"
                            />
                            <span
                                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px] pointer-events-none"
                                style={{
                                    borderColor: setting.emailDigestEnabled ? "#4e57d6" : "#cbd3df",
                                    background: setting.emailDigestEnabled ? "#4e57d6" : "white",
                                }}
                            >
                                <Check
                                    className="w-[13px] h-[13px] text-white"
                                    strokeWidth={3}
                                    style={{opacity: setting.emailDigestEnabled ? 1 : 0}}
                                />
                            </span>
                        </span>
                    </label>

                    <label className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer">
                        <span>
                            <span className="block text-[14px] font-semibold text-[#0f1b2d]">Всплывающие уведомления</span>
                            <span className="block text-[12.5px] text-[#8b97ab] mt-0.5">
                                Показывать всплывающее окошко в правом нижнем углу экрана, когда приходит
                                новое уведомление. Действует только в этом браузере.
                            </span>
                        </span>
                        <span className="relative shrink-0">
                            <input
                                type="checkbox"
                                checked={popupEnabled}
                                onChange={togglePopup}
                                className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
                            />
                            <span
                                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px] pointer-events-none"
                                style={{
                                    borderColor: popupEnabled ? "#4e57d6" : "#cbd3df",
                                    background: popupEnabled ? "#4e57d6" : "white",
                                }}
                            >
                                <Check
                                    className="w-[13px] h-[13px] text-white"
                                    strokeWidth={3}
                                    style={{opacity: popupEnabled ? 1 : 0}}
                                />
                            </span>
                        </span>
                    </label>
                </div>
            )}
        </div>
    );
}
