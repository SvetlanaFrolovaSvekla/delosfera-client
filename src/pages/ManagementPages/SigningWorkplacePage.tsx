/**
 * Рабочее место квалифицированной подписи (Б-17).
 *
 * Страница отвечает на вопрос «смогу ли я подписать», заданный заранее, а не в
 * момент, когда документ уже лежит на подписи и ждать некогда. Поэтому проверка
 * идёт по шагам и каждый шаг говорит, что делать, если он не пройден.
 *
 * Сертификат закрепляется за сотрудником при первой подписи. Здесь видно, какой
 * именно закреплён и до какого числа он действует: сертификат заканчивается
 * молча, и узнать об этом лучше не в день подписания приказа.
 */
import {useCallback, useEffect, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {
    qualifiedSigningService,
    type MyCertificate,
} from "@/service/signingService/qualifiedSigningService.ts";
import {detectProvider, type ProviderInfo} from "@/service/signingService/cryptoProvider.ts";
import {formatDate, formatDateTime} from "@/utils/dateUtils.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {
    ArrowRight, BadgeCheck, Building2, CircleCheck, Cpu, FileText, IdCard, KeyRound, LoaderCircle,
    RefreshCw, ShieldCheck, TriangleAlert, type LucideIcon,
} from "lucide-react";

/** За сколько дней до окончания срока сертификата предупреждать. */
const EXPIRY_WARNING_DAYS = 30;

const CARD = "rounded-2xl border border-[#eef2f7] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]";
const CARD_TITLE = "text-[12px] font-bold uppercase tracking-[.04em] text-[#2d354a]";

const BTN_SECONDARY =
    "inline-flex items-center gap-2 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#3a4560] " +
    "font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-60";

type StepState = "ready" | "attention" | "waiting";

export function SigningWorkplacePage() {
    const {t} = useTranslation();
    const [provider, setProvider] = useState<ProviderInfo | null>(null);
    const [certificates, setCertificates] = useState<MyCertificate[]>([]);
    const [authoritiesConfigured, setAuthoritiesConfigured] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(true);
    const [failed, setFailed] = useState(false);

    const check = useCallback(async () => {
        setBusy(true);
        setFailed(false);

        try {
            const [found, own] = await Promise.all([
                detectProvider(),
                qualifiedSigningService.myCertificates(),
            ]);

            setProvider(found.info);
            setCertificates(own);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }

        // Список доверенных центров доступен администратору; рядовому подписанту
        // отказ здесь ничего не говорит — просто не показываем этот шаг.
        try {
            const {trustEnforced} = await qualifiedSigningService.authorities();
            setAuthoritiesConfigured(trustEnforced);
        } catch {
            setAuthoritiesConfigured(null);
        }
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void check(); }, [check]);

    const active = certificates.find((c) => !c.revokedAt && !c.expired);

    const daysLeft = active
        // eslint-disable-next-line react-hooks/purity
        ? Math.ceil((new Date(active.notAfter).getTime() - Date.now()) / 86_400_000)
        : null;

    const providerState: StepState = busy ? "waiting" : provider?.ready ? "ready" : "attention";
    const certificateState: StepState = busy ? "waiting" : active ? "ready" : "attention";
    const authoritiesState: StepState = authoritiesConfigured ? "ready" : "attention";

    // Сводка в шапке: готово ли рабочее место целиком.
    const states = [providerState, certificateState, ...(authoritiesConfigured !== null ? [authoritiesState] : [])];
    const overall: StepState = states.includes("waiting") ? "waiting"
        : states.every((s) => s === "ready") ? "ready" : "attention";

    const flow: {icon: LucideIcon; text: string}[] = [
        {icon: FileText, text: t("signingWorkplace.flow.fingerprint")},
        {icon: KeyRound, text: t("signingWorkplace.flow.sign")},
        {icon: ShieldCheck, text: t("signingWorkplace.flow.result")},
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("signingWorkplace.title")}
                description={t("signingWorkplace.description")}
                actions={(
                    <div className="flex flex-wrap items-center gap-2.5">
                        <OverallBadge state={overall}/>
                        <Tooltip content={t("signingWorkplace.recheckHint")}>
                            <button type="button" onClick={() => void check()} disabled={busy} className={BTN_SECONDARY}>
                                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} strokeWidth={2}/>
                                {t("signingWorkplace.recheck")}
                            </button>
                        </Tooltip>
                    </div>
                )}
            />

            {/* ── как устроена подпись ───────────────────────── */}
            <section className={`${CARD} mb-4 p-5`}>
                <div className="mb-3.5 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#2d354a]" strokeWidth={2}/>
                    <span className={CARD_TITLE}>{t("signingWorkplace.flow.title")}</span>
                    <HelpTooltip side="right" content={t("signingWorkplace.flow.hint")}/>
                </div>
                <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                    {flow.map((item, index) => (
                        <div key={index} className="flex flex-1 items-center gap-2">
                            <div className="flex flex-1 items-center gap-3 rounded-[12px] border border-[#eef2f7] bg-[#fafbfd] p-3">
                                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                                    <item.icon className="h-[18px] w-[18px]" strokeWidth={2}/>
                                </span>
                                <span className="text-[12.5px] leading-[1.5] text-[#3a4560]">{item.text}</span>
                            </div>
                            {index < flow.length - 1 && (
                                <ArrowRight className="hidden h-4 w-4 flex-none text-[#c5cbe0] md:block" strokeWidth={2}/>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {failed && (
                <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2}/>
                    {t("signingWorkplace.checkFailed")}
                </div>
            )}

            {/* ── проверка по шагам ───────────────────────────── */}
            <section className="mb-4 flex flex-col gap-3">
                <Step
                    number={1}
                    icon={Cpu}
                    title={t("signingWorkplace.steps.provider.title")}
                    help={t("signingWorkplace.steps.provider.help")}
                    state={providerState}
                    description={busy
                        ? t("signingWorkplace.steps.provider.searching")
                        : provider?.ready
                            ? t("signingWorkplace.steps.provider.ready", {title: provider.title})
                            : provider?.reason ?? t("signingWorkplace.steps.provider.notFound")}
                    hint={!busy && !provider?.ready ? t("signingWorkplace.steps.provider.manualHint") : undefined}
                />

                <Step
                    number={2}
                    icon={IdCard}
                    title={t("signingWorkplace.steps.certificate.title")}
                    help={t("signingWorkplace.steps.certificate.help")}
                    state={certificateState}
                    description={busy
                        ? t("signingWorkplace.steps.certificate.checking")
                        : active
                            ? t("signingWorkplace.steps.certificate.active", {
                                subject: active.subject,
                                date: formatDate(active.notAfter),
                            })
                            : certificates.length > 0
                                ? t("signingWorkplace.steps.certificate.allInvalid")
                                : t("signingWorkplace.steps.certificate.notBound")}
                    hint={daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS
                        ? t("signingWorkplace.steps.certificate.expiresSoon", {count: daysLeft})
                        : undefined}
                />

                {authoritiesConfigured !== null && (
                    <Step
                        number={3}
                        icon={Building2}
                        title={t("signingWorkplace.steps.authorities.title")}
                        help={t("signingWorkplace.steps.authorities.help")}
                        state={authoritiesState}
                        description={authoritiesConfigured
                            ? t("signingWorkplace.steps.authorities.configured")
                            : t("signingWorkplace.steps.authorities.notConfigured")}
                        hint={authoritiesConfigured ? undefined : t("signingWorkplace.steps.authorities.notConfiguredHint")}
                    />
                )}
            </section>

            {/* ── закреплённые сертификаты ───────────────────── */}
            {certificates.length > 0 && (
                <section className={`${CARD} p-5`}>
                    <div className="mb-3 flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-[#2d354a]" strokeWidth={2}/>
                        <span className={CARD_TITLE}>{t("signingWorkplace.certificates.title")}</span>
                        <span className="rounded-full bg-[#f2f5f9] px-[7px] py-[1px] font-mono text-[11px] font-bold text-[#a3adbd]">
                            {certificates.length}
                        </span>
                        <HelpTooltip side="right" content={t("signingWorkplace.certificates.help")}/>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-[13px]">
                            <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wide text-[#8b97ab]">
                                <th className="px-3 py-2.5 font-semibold">{t("signingWorkplace.certificates.subject")}</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{t("signingWorkplace.certificates.issuer")}</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{t("signingWorkplace.certificates.validUntil")}</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{t("signingWorkplace.certificates.registered")}</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{t("signingWorkplace.certificates.state")}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {certificates.map((c) => (
                                <tr key={c.id} className="border-t border-[#eef2f7] align-top hover:bg-[#fafbfd]">
                                    <td className="px-3 py-3 font-medium text-[#1c2740]">{c.subject}</td>
                                    <td className="px-3 py-3 text-[#55617a]">{c.issuer}</td>
                                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[#55617a]">
                                        {formatDate(c.notAfter)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[#8b97ab]">
                                        {formatDateTime(c.registeredAt)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        {c.revokedAt
                                            ? (
                                                <Pill tone="bad">
                                                    {c.revokedReason
                                                        ? t("signingWorkplace.certificates.revokedWithReason", {reason: c.revokedReason})
                                                        : t("signingWorkplace.certificates.revoked")}
                                                </Pill>
                                            )
                                            : c.expired
                                                ? <Pill tone="warn">{t("signingWorkplace.certificates.expired")}</Pill>
                                                : <Pill tone="good">{t("signingWorkplace.certificates.valid")}</Pill>}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <div className="mt-4">
                <Clue>{t("signingWorkplace.privacyClue")}</Clue>
            </div>
        </div>
    );
}

/** Итог проверки в шапке: «Готово к подписи» / «Требует внимания» / «Проверяем…». */
function OverallBadge({state}: { state: StepState }) {
    const {t} = useTranslation();
    const view = {
        ready: {style: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]", icon: CircleCheck, text: t("signingWorkplace.overall.ready")},
        attention: {style: "border-[#f0dcae] bg-[#fdf3e0] text-[#8a5a00]", icon: TriangleAlert, text: t("signingWorkplace.overall.attention")},
        waiting: {style: "border-[#e5e9f0] bg-[#f6f8fb] text-[#8b97ab]", icon: LoaderCircle, text: t("signingWorkplace.overall.waiting")},
    }[state];

    return (
        <span className={`inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold ${view.style}`}>
            <view.icon className={`h-4 w-4 ${state === "waiting" ? "animate-spin" : ""}`} strokeWidth={2.2}/>
            {view.text}
        </span>
    );
}

function Pill({tone, children}: { tone: "good" | "warn" | "bad"; children: ReactNode }) {
    const style = {
        good: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
        warn: "border-[#f0dcae] bg-[#fdf3e0] text-[#8a5a00]",
        bad: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
    }[tone];
    return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${style}`}>{children}</span>;
}

interface StepProps {
    number: number;
    icon: LucideIcon;
    title: string;
    help: string;
    state: StepState;
    description: string;
    hint?: string;
}

/** Шаг проверки: что проверяем, результат и — если не пройден — что делать. */
function Step({number, icon: Icon, title, help, state, description, hint}: StepProps) {
    const {t} = useTranslation();
    const view = {
        ready: {
            box: "border-[#cfe3d6]", stripe: "bg-[#1c9c5c]", text: "text-[#1c7a4d]",
            badge: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]", StateIcon: CircleCheck,
            label: t("signingWorkplace.state.ready"),
        },
        attention: {
            box: "border-[#f0dcae]", stripe: "bg-[#e0a43a]", text: "text-[#8a5a00]",
            badge: "border-[#f0dcae] bg-[#fdf3e0] text-[#8a5a00]", StateIcon: TriangleAlert,
            label: t("signingWorkplace.state.attention"),
        },
        waiting: {
            box: "border-[#eef2f7]", stripe: "bg-[#dfe4ec]", text: "text-[#8b97ab]",
            badge: "border-[#e5e9f0] bg-[#f6f8fb] text-[#8b97ab]", StateIcon: LoaderCircle,
            label: t("signingWorkplace.state.waiting"),
        },
    }[state];

    return (
        <div className={`relative flex items-start gap-4 overflow-hidden rounded-2xl border bg-white p-4 pl-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] ${view.box}`}>
            <span className={`absolute inset-y-0 left-0 w-1 ${view.stripe}`}/>
            <span className="relative grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-[#ececfc] text-[#4e57d6]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2}/>
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#4e57d6] text-[10.5px] font-bold text-white ring-2 ring-white">
                    {number}
                </span>
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#1c2740]">{title}</span>
                    <HelpTooltip side="right" content={help} className="!h-6 !w-6"/>
                    <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${view.badge}`}>
                        <view.StateIcon className={`h-3.5 w-3.5 ${state === "waiting" ? "animate-spin" : ""}`} strokeWidth={2.2}/>
                        {view.label}
                    </span>
                </div>
                <div className={`text-[13px] leading-[1.6] ${view.text}`}>{description}</div>
                {hint && <Clue className="mt-1.5">{hint}</Clue>}
            </div>
        </div>
    );
}
