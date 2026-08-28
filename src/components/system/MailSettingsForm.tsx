import {useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";
import {toast} from "@/service/toastService.ts";

/**
 * Почтовые уведомления: слать письма или нет и куда.
 *
 * Выключатель здесь стоит первым и отделён от остального: во время обкатки
 * письма о проверочных записках уходят настоящим людям, и погасить рассылку
 * нужно одним движением, не разбираясь в адресах серверов.
 *
 * Внутрисистемные уведомления — колокольчик — этим не гасятся. На них держатся
 * задачи: погасив их, человек перестанет видеть, что от него чего-то ждут.
 */

interface MailSettings {
    enabled: boolean;
    host: string;
    port: number;
    useSsl: boolean;
    user: string | null;
    hasPassword: boolean;
    fromAddress: string;
    fromName: string;
    baseUrl: string;
    maxAttempts: number;
}

interface Props {
    onStateChange?: (enabled: boolean, hasError: boolean) => void;
}

export function MailSettingsForm({onStateChange}: Props) {
    const [settings, setSettings] = useState<MailSettings | null>(null);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiClient
            .get<MailSettings>("/system/mail")
            .then(({data}) => {
                setSettings(data);
                onStateChange?.(data.enabled, false);
            })
            .catch(() => setError("Не удалось загрузить настройки"))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <p className="p-5 text-[13px] text-[#8593a8]">Загружаем…</p>;
    if (!settings) return <p className="p-5 text-[13px] text-[#b3372a]">{error}</p>;

    const patch = (change: Partial<MailSettings>) => setSettings({...settings, ...change});

    const save = async (override?: Partial<MailSettings>) => {
        const next = {...settings, ...override};
        setSaving(true);
        setError(null);
        try {
            const {data} = await apiClient.put<MailSettings>("/system/mail", {
                ...next,
                password: password || undefined,
            });
            setSettings(data);
            // Пароль со страницы убираем сразу: держать его в поле после
            // сохранения незачем, а забытым он попадёт в чужой снимок экрана.
            setPassword("");
            onStateChange?.(data.enabled, false);
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            const message = r.response?.data?.message ?? "Не удалось сохранить";
            setError(message);
            toast.error("Настройки почты", message);
            // Возвращаем экран к тому, что на сервере: иначе выключатель
            // показывал бы состояние, которого нет.
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 p-5">

            <header>
                <h3 className="text-[15px] font-semibold text-[#101a2c]">Почтовые уведомления</h3>
                <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[#8593a8]">
                    Письма о задачах, сроках и решениях по документам.
                    Уведомления внутри системы — колокольчик в шапке — этим выключателем
                    не гасятся: на них держатся задачи.
                </p>
            </header>

            <label
                className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-4 transition
                            ${settings.enabled
                                ? "border-[#cfe0cd] bg-[#f2f8f3]"
                                : "border-[#e0b978] bg-[#fbeeda]"}`}
            >
                <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => {
                        patch({enabled: e.target.checked});
                        void save({enabled: e.target.checked});
                    }}
                    disabled={saving}
                    className="mt-0.5 h-4 w-4 flex-none accent-[#2f68f5]"
                />
                <span>
                    <span className="block text-[14px] font-medium text-[#101a2c]">
                        {settings.enabled ? "Письма отправляются" : "Письма не отправляются"}
                    </span>
                    <span className="block text-[12.5px] leading-[1.5] text-[#5b6b85]">
                        {settings.enabled
                            ? "Сотрудники получают письма о задачах и сроках."
                            : "Уведомления копятся только внутри системы. Ничего не теряется — письма просто не уходят."}
                    </span>
                </span>
            </label>

            {error && (
                <p className="rounded-[8px] bg-[#fbe8e5] px-3 py-2 text-[13px] text-[#b3372a]">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Почтовый сервер" hint="Адрес SMTP, например mail.keremetbank.kg">
                    <input
                        value={settings.host}
                        onChange={(e) => patch({host: e.target.value})}
                        placeholder="smtp.keremetbank.kg"
                        className={input}
                    />
                </Field>

                <Field label="Порт">
                    <input
                        type="number"
                        min={1}
                        max={65535}
                        value={settings.port}
                        onChange={(e) => patch({port: Number(e.target.value) || 25})}
                        className={input}
                    />
                </Field>

                <Field label="Учётная запись" hint="Пусто — сервер принимает без пароля">
                    <input
                        value={settings.user ?? ""}
                        onChange={(e) => patch({user: e.target.value || null})}
                        className={input}
                    />
                </Field>

                <Field
                    label="Пароль"
                    hint={settings.hasPassword
                        ? "Пароль задан. Оставьте пустым, чтобы не менять"
                        : "Не задан"}
                >
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={settings.hasPassword ? "••••••••" : ""}
                        autoComplete="new-password"
                        className={input}
                    />
                </Field>

                <Field label="Адрес отправителя">
                    <input
                        value={settings.fromAddress}
                        onChange={(e) => patch({fromAddress: e.target.value})}
                        className={input}
                    />
                </Field>

                <Field label="Имя отправителя" hint="Так подписаны письма в почте сотрудника">
                    <input
                        value={settings.fromName}
                        onChange={(e) => patch({fromName: e.target.value})}
                        className={input}
                    />
                </Field>

                <Field
                    label="Адрес системы"
                    hint="Для ссылок в письмах. Без него ссылка «открыть в системе» ведёт в никуда"
                    className="sm:col-span-2"
                >
                    <input
                        value={settings.baseUrl}
                        onChange={(e) => patch({baseUrl: e.target.value})}
                        placeholder="http://edo-test.keremetbank.kg"
                        className={input}
                    />
                </Field>

                <Field
                    label="Попыток отправки"
                    hint="Сколько раз пробовать, прежде чем считать письмо потерянным"
                >
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={settings.maxAttempts}
                        onChange={(e) => patch({maxAttempts: Number(e.target.value) || 5})}
                        className={input}
                    />
                </Field>
            </div>

            <div>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded-[9px] bg-[#2f68f5] px-4 py-2 text-[13.5px] font-medium
                               text-white transition hover:bg-[#2554cc] disabled:opacity-60"
                >
                    {saving ? "Сохраняем…" : "Сохранить"}
                </button>
            </div>

            <ВНастройкахСервера/>
        </div>
    );
}

/**
 * Пояснение про конфигурацию сервера. Прежде эти значения задавались только
 * там, и администратор, помнящий старый порядок, должен понимать, что теперь
 * главные — эти.
 */
function ВНастройкахСервера() {
    return (
        <p className="border-t border-[#eef2f7] pt-3 text-[12px] leading-[1.6] text-[#8593a8]">
            Значения хранятся в системе и действуют сразу. Раздел <code>Mail</code> в
            конфигурации сервера используется только при первом запуске на пустой базе —
            дальше правки здесь его перекрывают.
        </p>
    );
}

function Field({label, hint, className, children}: {
    label: string; hint?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <label className={`flex flex-col gap-1 ${className ?? ""}`}>
            <span className="text-[12.5px] font-medium text-[#4d5a72]">{label}</span>
            {children}
            {hint && <span className="text-[11.5px] leading-[1.5] text-[#8593a8]">{hint}</span>}
        </label>
    );
}

const input =
    "rounded-[9px] border border-[#e1e7ef] px-3 py-2 text-[13.5px] outline-none " +
    "transition focus:border-[#2f68f5]";
