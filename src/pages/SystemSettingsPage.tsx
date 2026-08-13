import {useCallback, useEffect, useState} from "react";
import {
    directorySettingsService,
    type DirectorySettings,
    type DirectorySettingsRequest,
} from "@/service/systemService/directorySettingsService.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";
const labelClass = "block text-[11.5px] text-[#8b97ab] mb-[5px]";

function Field({label, hint, children}: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className={labelClass}>{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[11.5px] text-[#a6b0c2]">{hint}</span>}
        </label>
    );
}

function formatMoment(iso: string | null): string {
    if (!iso) return "ещё не выполнялась";
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

/**
 * Системные настройки: связь со службой каталогов.
 *
 * Адрес каталога, учётная запись и расписание задаёт администратор системы —
 * без доступа к серверу и без перезапуска. Пароль сюда не возвращается: видно
 * только, задан он или нет, а пустое поле при сохранении оставляет прежний.
 */
export function SystemSettingsPage() {
    const [settings, setSettings] = useState<DirectorySettings | null>(null);
    const [form, setForm] = useState<DirectorySettingsRequest | null>(null);
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const apply = useCallback((data: DirectorySettings) => {
        setSettings(data);
        setForm({
            enabled: data.enabled,
            server: data.server,
            port: data.port,
            useSsl: data.useSsl,
            serviceAccountLogin: data.serviceAccountLogin,
            usersBaseDn: data.usersBaseDn,
            usersFilter: data.usersFilter,
            pageSize: data.pageSize,
            loginAttribute: data.loginAttribute,
            emailAttribute: data.emailAttribute,
            fullNameAttribute: data.fullNameAttribute,
            syncIntervalMinutes: data.syncIntervalMinutes,
            defaultRoleId: data.defaultRoleId,
        });
    }, []);

    useEffect(() => {
        directorySettingsService.get()
            .then(apply)
            .catch(() => setError("Не удалось загрузить настройки"))
            .finally(() => setLoading(false));
    }, [apply]);

    const set = <K extends keyof DirectorySettingsRequest>(key: K, value: DirectorySettingsRequest[K]) =>
        setForm((f) => (f ? {...f, [key]: value} : f));

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            await action();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось выполнить действие");
        } finally {
            setBusy(false);
        }
    };

    const save = () => run(async () => {
        if (!form) return;
        const saved = await directorySettingsService.save({
            ...form,
            serviceAccountPassword: password || null,
        });
        apply(saved);
        setPassword("");
        setNotice("Настройки сохранены");
    });

    const test = () => run(async () => {
        const result = await directorySettingsService.test();
        if (result.success) setNotice(result.message);
        else setError(result.message);
    });

    const syncNow = () => run(async () => {
        const result = await directorySettingsService.syncNow();
        if (result.success) setNotice(result.message);
        else setError(result.message);
        apply(await directorySettingsService.get());
    });

    if (loading) return <div className="p-6 text-[13px] text-[#8b97ab]">Загрузка настроек…</div>;
    if (!form || !settings) return <div className="p-6 text-[13px] text-[#c0392b]">{error ?? "Настройки недоступны"}</div>;

    return (
        <div className="p-6">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Системные настройки</h1>
            <div className="mt-1 text-[13px] text-[#8b97ab]">
                Интеграция со службой каталогов: пользователи подтягиваются в систему по расписанию
            </div>

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f3c9c2] bg-[#fdeeec] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}
            {notice && (
                <div className="mt-4 rounded-[10px] border border-[#cbe6d0] bg-[#f0faf3] px-4 py-2.5 text-[13px] text-[#1f8a4c]">
                    {notice}
                </div>
            )}

            <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="flex items-center justify-between">
                    <h2 className="m-0 text-[15px] font-semibold">Служба каталогов</h2>
                    <label className="flex items-center gap-2 text-[13px] text-[#55617a]">
                        <input
                            type="checkbox"
                            checked={form.enabled}
                            onChange={(e) => set("enabled", e.target.checked)}
                        />
                        Интеграция включена
                    </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Адрес сервера" hint="Имя или адрес контроллера домена">
                        <input className={inputClass} value={form.server}
                               onChange={(e) => set("server", e.target.value)}/>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Порт">
                            <input className={inputClass} type="number" value={form.port}
                                   onChange={(e) => set("port", Number(e.target.value))}/>
                        </Field>
                        <label className="flex items-end gap-2 pb-2.5 text-[13px] text-[#55617a]">
                            <input type="checkbox" checked={form.useSsl}
                                   onChange={(e) => set("useSsl", e.target.checked)}/>
                            Шифрование (LDAPS)
                        </label>
                    </div>

                    <Field label="Учётная запись для чтения каталога" hint="Для домена — в виде имя@домен">
                        <input className={inputClass} value={form.serviceAccountLogin}
                               onChange={(e) => set("serviceAccountLogin", e.target.value)}/>
                    </Field>
                    <Field
                        label="Пароль"
                        hint={settings.hasPassword
                            ? "Пароль задан. Оставьте поле пустым, чтобы не менять его"
                            : "Пароль ещё не задан"}
                    >
                        <input className={inputClass} type="password" value={password} autoComplete="new-password"
                               placeholder={settings.hasPassword ? "••••••••" : ""}
                               onChange={(e) => setPassword(e.target.value)}/>
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Ветка поиска пользователей" hint="Например: OU=Users,OU=Bank,DC=example,DC=local">
                        <input className={inputClass} value={form.usersBaseDn}
                               onChange={(e) => set("usersBaseDn", e.target.value)}/>
                    </Field>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Интервал синхронизации, минут" hint="От 5 минут до суток; по умолчанию раз в час">
                        <input className={inputClass} type="number" min={5} max={1440}
                               value={form.syncIntervalMinutes}
                               onChange={(e) => set("syncIntervalMinutes", Number(e.target.value))}/>
                    </Field>
                    <Field label="Размер страницы выборки" hint="Сколько записей забирать за один заход">
                        <input className={inputClass} type="number" value={form.pageSize}
                               onChange={(e) => set("pageSize", Number(e.target.value))}/>
                    </Field>
                </div>

                <details className="mt-4">
                    <summary className="cursor-pointer text-[12.5px] font-semibold text-[#2f68f5]">
                        Дополнительно: фильтр и соответствие полей
                    </summary>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <Field label="Фильтр поиска">
                            <input className={inputClass} value={form.usersFilter ?? ""}
                                   onChange={(e) => set("usersFilter", e.target.value)}/>
                        </Field>
                        <Field label="Роль новых пользователей" hint="Идентификатор роли; пусто — без роли">
                            <input className={inputClass} type="number" value={form.defaultRoleId ?? ""}
                                   onChange={(e) => set("defaultRoleId", e.target.value ? Number(e.target.value) : null)}/>
                        </Field>
                        <Field label="Атрибут логина">
                            <input className={inputClass} value={form.loginAttribute ?? ""}
                                   onChange={(e) => set("loginAttribute", e.target.value)}/>
                        </Field>
                        <Field label="Атрибут почты">
                            <input className={inputClass} value={form.emailAttribute ?? ""}
                                   onChange={(e) => set("emailAttribute", e.target.value)}/>
                        </Field>
                        <Field label="Атрибут ФИО">
                            <input className={inputClass} value={form.fullNameAttribute ?? ""}
                                   onChange={(e) => set("fullNameAttribute", e.target.value)}/>
                        </Field>
                    </div>
                </details>

                <div className="mt-5 flex gap-2">
                    <button onClick={save} disabled={busy}
                            className="h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50">
                        Сохранить
                    </button>
                    <button onClick={test} disabled={busy}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50">
                        Проверить связь
                    </button>
                    <button onClick={syncNow} disabled={busy || !settings.enabled}
                            title={settings.enabled ? undefined : "Сначала включите интеграцию и сохраните настройки"}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50">
                        Синхронизировать сейчас
                    </button>
                </div>
            </div>

            <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <h2 className="m-0 mb-3 text-[15px] font-semibold">Последняя синхронизация</h2>

                <div className="grid grid-cols-4 gap-4 text-[13px]">
                    <div>
                        <div className={labelClass}>Выполнена</div>
                        <div className="text-[#1c2740]">{formatMoment(settings.lastSyncAt)}</div>
                    </div>
                    <div>
                        <div className={labelClass}>Создано</div>
                        <div className="text-[#1c2740]">{settings.lastSyncCreated}</div>
                    </div>
                    <div>
                        <div className={labelClass}>Обновлено</div>
                        <div className="text-[#1c2740]">{settings.lastSyncUpdated}</div>
                    </div>
                    <div>
                        <div className={labelClass}>Деактивировано</div>
                        <div className="text-[#1c2740]">{settings.lastSyncDeactivated}</div>
                    </div>
                </div>

                {settings.lastSyncError && (
                    <div className="mt-3 rounded-[9px] border border-[#f3c9c2] bg-[#fdeeec] px-3 py-2.5 text-[12.5px] text-[#c0392b]">
                        Ошибка последней попытки: {settings.lastSyncError}
                    </div>
                )}

                <div className="mt-3 text-[11.5px] text-[#a6b0c2]">
                    Пользователи без адреса почты пропускаются: почта в системе — это логин.
                    Отключённые в каталоге учётные записи переносятся и остаются заблокированными.
                </div>
            </div>
        </div>
    );
}
