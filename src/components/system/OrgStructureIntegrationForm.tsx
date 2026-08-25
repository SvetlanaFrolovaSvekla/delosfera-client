import {useEffect, useState} from "react";
import {AlertTriangle, CheckCircle2, RefreshCw, XCircle} from "lucide-react";
import {
    orgStructureService, intervalTitle, OUTCOME_TITLE,
    type OrgStructureSettings, type OrgSyncRun,
} from "@/service/orgStructureService/orgStructureService.ts";

/**
 * Связь с порталом, который ведёт оргструктуру банка.
 *
 * Оргструктуру ведут в портале — здесь она копия. Поэтому на экране нет ничего,
 * что позволяло бы её править: только откуда брать, как часто и что вышло
 * в прошлые разы.
 */

interface Props {
    onStateChange?: (enabled: boolean, hasError: boolean) => void;
}

export function OrgStructureIntegrationForm({onStateChange}: Props) {
    const [settings, setSettings] = useState<OrgStructureSettings | null>(null);
    const [token, setToken] = useState("");
    const [runs, setRuns] = useState<OrgSyncRun[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [checking, setChecking] = useState(false);
    const [check, setCheck] = useState<{ok: boolean; message: string} | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        const [s, r] = await Promise.all([
            orgStructureService.settings(),
            orgStructureService.runs(20).catch(() => []),
        ]);
        setSettings(s);
        setRuns(r);
        onStateChange?.(s.enabled, r[0]?.outcome === "Failed");
    };

    useEffect(() => {
        load().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading || !settings) {
        return <p className="p-5 text-[13px] text-[#8593a8]">Загружаем…</p>;
    }

    const request = {
        enabled: settings.enabled,
        portalUrl: settings.portalUrl,
        token: token || undefined,
        syncIntervalMinutes: settings.syncIntervalMinutes,
        createMissingUnits: settings.createMissingUnits,
        matchByEmail: settings.matchByEmail,
    };

    const patch = (change: Partial<OrgStructureSettings>) =>
        setSettings({...settings, ...change});

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const saved = await orgStructureService.save(request);
            setSettings(saved);
            // Токен со страницы убираем сразу: держать его в поле после
            // сохранения незачем, а забытым он попадёт в чужой снимок экрана.
            setToken("");
            onStateChange?.(saved.enabled, false);
        } catch (e: unknown) {
            const response = e as {response?: {data?: {message?: string}}};
            setError(response.response?.data?.message ?? "Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    };

    const runCheck = async () => {
        setChecking(true);
        setCheck(null);
        try {
            setCheck(await orgStructureService.check(request));
        } finally {
            setChecking(false);
        }
    };

    /**
     * Запускает проход и следит за историей, пока он не закончится.
     *
     * Сервер возвращает управление сразу — обход портала идёт минуты. Раньше
     * кнопка ждала ответа, прокси обрывал запрос, и администратор видел ошибку
     * там, где на деле всё шло своим ходом.
     */
    const syncNow = async () => {
        setSyncing(true);
        setError(null);

        try {
            await orgStructureService.syncNow();

            // Ждём появления новой записи и её завершения. Ограничиваем время:
            // если проход застрянет, кнопка не должна крутиться вечно.
            const было = runs[0]?.id;
            const край = Date.now() + 10 * 60 * 1000;

            while (Date.now() < край) {
                await new Promise((r) => setTimeout(r, 3000));

                const свежие = await orgStructureService.runs(20).catch(() => null);
                if (!свежие) continue;

                setRuns(свежие);

                const текущий = свежие[0];
                if (текущий && текущий.id !== было && текущий.finishedAt) {
                    onStateChange?.(settings.enabled, текущий.outcome === "Failed");
                    return;
                }
            }

            setError("Проход идёт дольше обычного. Загляните в историю позже.");
        } catch (e: unknown) {
            const response = e as {response?: {data?: {message?: string}}};
            setError(response.response?.data?.message ?? "Синхронизация не запустилась");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 p-5">

            <header className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-[15px] font-semibold text-[#101a2c]">Организационная структура</h3>
                    <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[#8593a8]">
                        Подразделения, их подчинённость и руководители приходят из портала банка.
                        Здесь структуру не правят — её ведут в портале, чтобы источник был один.
                    </p>
                </div>

                <label className="flex flex-none cursor-pointer items-center gap-2 text-[13px] text-[#4d5a72]">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => patch({enabled: e.target.checked})}
                        className="h-4 w-4 accent-[#2f68f5]"
                    />
                    Синхронизация включена
                </label>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Адрес портала"
                    hint="Вместе с версией API, например https://hub.keremetbank.kg/api/v1"
                    className="sm:col-span-2"
                >
                    <input
                        value={settings.portalUrl}
                        onChange={(e) => patch({portalUrl: e.target.value})}
                        placeholder="https://hub.keremetbank.kg/api/v1"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Токен"
                    hint={settings.hasToken
                        ? "Токен задан. Оставьте поле пустым, чтобы не менять его"
                        : "Выдаётся администратором портала. Показывается один раз при выдаче"}
                >
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={settings.hasToken ? "••••••••" : "khb_…"}
                        autoComplete="new-password"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Интервал синхронизации, минут"
                    hint={`Сейчас — ${intervalTitle(settings.syncIntervalMinutes)}. Портал просит не чаще одного прохода в сутки`}
                >
                    <input
                        type="number"
                        min={5}
                        value={settings.syncIntervalMinutes}
                        onChange={(e) => patch({syncIntervalMinutes: Number(e.target.value) || 1440})}
                        className={inputClass}
                    />
                </Field>
            </div>

            <div className="flex flex-col gap-2.5 rounded-[10px] bg-[#f6f8fb] p-4">
                <Toggle
                    checked={settings.createMissingUnits}
                    onChange={(v) => patch({createMissingUnits: v})}
                    title="Заводить подразделения, которых здесь нет"
                    hint="Выключено — синхронизация только обновляет заведённые и сообщает о недостающих"
                />
                <Toggle
                    checked={settings.matchByEmail}
                    onChange={(v) => patch({matchByEmail: v})}
                    title="Сопоставлять сотрудников по почте"
                    hint="Логин в домене при смене фамилии иногда меняют, почта остаётся прежней"
                />
            </div>

            {error && (
                <p className="rounded-[8px] bg-[#fbe8e5] px-3 py-2 text-[13px] text-[#b3372a]">{error}</p>
            )}

            {check && (
                <p className={`flex items-start gap-2 rounded-[8px] px-3 py-2 text-[13px]
                               ${check.ok ? "bg-[#e3f2ea] text-[#1a6f48]" : "bg-[#fbe8e5] text-[#b3372a]"}`}>
                    {check.ok ? <CheckCircle2 size={15} className="mt-0.5 flex-none"/>
                              : <XCircle size={15} className="mt-0.5 flex-none"/>}
                    {check.message}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={saving} className={primaryButton}>
                    {saving ? "Сохраняем…" : "Сохранить"}
                </button>
                <button type="button" onClick={runCheck} disabled={checking} className={plainButton}>
                    {checking ? "Проверяем…" : "Проверить связь"}
                </button>
                <button
                    type="button"
                    onClick={syncNow}
                    disabled={syncing || !settings.enabled}
                    title={settings.enabled ? undefined : "Сначала включите синхронизацию"}
                    className={plainButton}
                >
                    <RefreshCw size={14} className={syncing ? "animate-spin" : ""}/>
                    {syncing ? "Забираем…" : "Синхронизировать сейчас"}
                </button>
            </div>

            <SyncHistory runs={runs}/>
        </div>
    );
}

/**
 * История проходов.
 *
 * Нужна для одного вопроса: почему структура выглядит не так, как в портале.
 * Ответ — либо «последний проход упал три дня назад», либо «прошёл, но сорок
 * человек не сопоставились». Поэтому в строке видно и исход, и обе цифры.
 */
function SyncHistory({runs}: {runs: OrgSyncRun[]}) {
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <section className="flex flex-col gap-2">
            <h4 className="text-[13.5px] font-semibold text-[#101a2c]">История синхронизации</h4>

            {runs.length === 0 ? (
                <p className="text-[13px] text-[#8593a8]">Синхронизация ещё не запускалась.</p>
            ) : (
                <div className="overflow-hidden rounded-[10px] border border-[#e1e7ef]">
                    {runs.map((run) => (
                        <div key={run.id} className="border-b border-[#eef2f7] last:border-b-0">
                            <button
                                type="button"
                                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#f6f8fb]"
                            >
                                <OutcomeIcon outcome={run.outcome}/>

                                <span className="font-mono text-[12px] text-[#4d5a72] tabular-nums">
                                    {new Date(run.startedAt).toLocaleString("ru-RU", {
                                        day: "2-digit", month: "2-digit", year: "2-digit",
                                        hour: "2-digit", minute: "2-digit",
                                    })}
                                </span>

                                <span className="text-[13px] text-[#101a2c]">
                                    {OUTCOME_TITLE[run.outcome]}
                                </span>

                                <span className="ml-auto flex items-center gap-3 text-[12px] text-[#8593a8]">
                                    <span>подразделений {run.unitsReceived}</span>
                                    <span>сотрудников {run.employeesMatched} из {run.employeesReceived}</span>
                                    <span>{run.startedBy ?? "по расписанию"}</span>
                                </span>
                            </button>

                            {expanded === run.id && (
                                <div className="flex flex-col gap-2 bg-[#fafbfd] px-3.5 pb-3.5 pt-1">
                                    {run.error && (
                                        <p className="text-[13px] text-[#b3372a]">{run.error}</p>
                                    )}

                                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-[#4d5a72]">
                                        <Count label="заведено подразделений" value={run.unitsCreated}/>
                                        <Count label="обновлено" value={run.unitsUpdated}/>
                                        <Count label="пропущено" value={run.unitsSkipped} alert/>
                                        <Count label="сотрудников обновлено" value={run.employeesUpdated}/>
                                        <Count label="не нашлось в системе" value={run.employeesUnmatched} alert/>
                                        <Count label="закрыт доступ (уволены)" value={run.employeesDeactivated} alert/>
                                    </div>

                                    {run.notes.length > 0 && (
                                        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-[12.5px] text-[#8593a8]">
                                            {run.notes.map((note, i) => <li key={i}>{note}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function OutcomeIcon({outcome}: {outcome: OrgSyncRun["outcome"]}) {
    if (outcome === "Success") return <CheckCircle2 size={15} className="flex-none text-[#1a6f48]"/>;
    if (outcome === "Partial") return <AlertTriangle size={15} className="flex-none text-[#96590a]"/>;
    return <XCircle size={15} className="flex-none text-[#b3372a]"/>;
}

function Count({label, value, alert}: {label: string; value: number; alert?: boolean}) {
    if (value === 0 && alert) return null;
    return (
        <span>
            <span className={`font-mono tabular-nums ${alert ? "text-[#96590a]" : ""}`}>{value}</span>
            {" "}{label}
        </span>
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

function Toggle({checked, onChange, title, hint}: {
    checked: boolean; onChange: (v: boolean) => void; title: string; hint: string;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-[#2f68f5]"
            />
            <span>
                <span className="block text-[13px] text-[#101a2c]">{title}</span>
                <span className="block text-[11.5px] leading-[1.5] text-[#8593a8]">{hint}</span>
            </span>
        </label>
    );
}

const inputClass =
    "rounded-[9px] border border-[#e1e7ef] px-3 py-2 text-[13.5px] outline-none " +
    "transition focus:border-[#2f68f5]";

const primaryButton =
    "rounded-[9px] bg-[#2f68f5] px-4 py-2 text-[13.5px] font-medium text-white " +
    "transition hover:bg-[#2554cc] disabled:opacity-60";

const plainButton =
    "flex items-center gap-2 rounded-[9px] border border-[#e1e7ef] px-4 py-2 text-[13.5px] " +
    "text-[#4d5a72] transition hover:border-[#2f68f5] hover:text-[#2f68f5] disabled:opacity-60";
