// Подробный список этапов маршрута: участник, его решение, комментарий и компактный значок подписи.
// Подробности подписи (хэш, сертификат, проверка у провайдера) — в журнале подписей ниже.
import {AlertTriangle, ShieldCheck, UserCog, X} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {RouteInstance, RouteParticipant} from "@/service/workflowService/workflowService.ts";
import type {SzResolutionSignature} from "@/service/szService/szEcpService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

interface SzRouteStepsProps {
    route: RouteInstance;
    users: Record<number, string>;
    /** Подписи ЭЦП по участникам маршрута (routeParticipantId → запись журнала). */
    ecpByParticipant?: ReadonlyMap<number, SzResolutionSignature>;
    /** Убрать участника, ещё не вынесшего решение (автор или право CorrectSzOnApproval). Не задан — кнопки нет. */
    onRemove?: (participant: RouteParticipant) => void;
    /** Заменить участника (согласующего или подписанта), ещё не вынесшего решение. Не задан — кнопки нет. */
    onReplace?: (participant: RouteParticipant) => void;
}

/** Цвет решения/состояния — пилюля справа от ФИО. */
function statusTone(p: RouteParticipant): string {
    switch (p.resolution?.type) {
        case "Approved": return "bg-[#eaf6ef] text-[#1c7a4d]";
        case "ApprovedWithRemarks": return "bg-[#fdf3e0] text-[#8a5a00]";
        case "Rejected":
        case "Veto": return "bg-[#fbeae7] text-[#c0392b]";
    }
    return p.state === "Active" ? "bg-[#eaf1ff] text-[#2f68f5]" : "bg-[#f1f3f7] text-[#8b97ab]";
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—";
}

export function SzRouteSteps({route, users, ecpByParticipant, onRemove, onReplace}: SzRouteStepsProps) {
    const {t} = useTranslation();

    const nameOf = (p: RouteParticipant) =>
        p.userFullName
        ?? (p.userId ? users[p.userId] ?? t("szCard.approval.userFallback", {id: p.userId}) : "—");

    return (
        <div className="flex flex-col gap-2.5">
            {route.steps.map((step) => (
                <div key={step.id} className="rounded-[12px] border border-[#eef2f7] bg-[#fbfcff]">
                    <div className="flex items-center gap-2 border-b border-[#f1f4f8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-[#a3adbd]">
                        {t("szCard.approval.stage", {order: step.order})}
                        {step.kind === "Signing" && <span>· {t("szCard.approval.stageSigning")}</span>}
                        {step.isFinalMethodology && <span>· {t("szCard.approval.stageFinalControl")}</span>}
                    </div>

                    <div className="divide-y divide-[#f4f6f9]">
                        {step.participants.map((p) => {
                            const name = nameOf(p);
                            const ecp = ecpByParticipant?.get(p.id);
                            const stamp = p.resolution?.signature;
                            const active = p.state === "Active";
                            return (
                                <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[11px] font-bold ${
                                        active ? "bg-[#eaf1ff] text-[#2f68f5]" : "bg-[#f1f3f7] text-[#6b7688]"}`}>
                                        {initials(name)}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                            <span className="text-[13px] font-medium text-[#1c2740]">{name}</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className={`rounded-full px-2.5 py-[2px] text-[11.5px] font-semibold ${statusTone(p)}`}>
                                                    {p.resolution
                                                        ? t(`szCard.resolution.${p.resolution.type}`)
                                                        : t(`szCard.participantState.${p.state}`)}
                                                </span>
                                                {onReplace && !p.resolution && (p.state === "Pending" || p.state === "Active") && (
                                                    <button type="button" onClick={() => onReplace(p)}
                                                            title={t(step.kind === "Signing" ? "szCard.correction.replaceSigner" : "szCard.correction.replaceParticipant")}
                                                            aria-label={t(step.kind === "Signing" ? "szCard.correction.replaceSigner" : "szCard.correction.replaceParticipant")}
                                                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-[6px] border-none bg-transparent text-[#a3adbd] hover:bg-[#eaf1ff] hover:text-[#2f68f5]">
                                                        <UserCog size={14}/>
                                                    </button>
                                                )}
                                                {onRemove && step.kind !== "Signing" && !p.resolution && (p.state === "Pending" || p.state === "Active") && (
                                                    <button type="button" onClick={() => onRemove(p)}
                                                            title={t("szCard.correction.removeParticipant")}
                                                            aria-label={t("szCard.correction.removeParticipant")}
                                                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-[6px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]">
                                                        <X size={14}/>
                                                    </button>
                                                )}
                                            </span>
                                        </div>

                                        {p.resolution?.comment && (
                                            <div className="mt-1.5 whitespace-pre-line break-words border-l-2 border-[#e5e9f0] pl-2.5 text-[12.5px] font-normal leading-[1.55] text-[#55617a]">
                                                {p.resolution.comment}
                                            </div>
                                        )}

                                        {/* Подпись ЭЦП — компактный значок; подробности и проверка — в журнале. */}
                                        {ecp ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <span
                                                    title={`SHA-256: ${ecp.hash}`}
                                                    className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-[3px] text-[11.5px] ${
                                                        ecp.isTest
                                                            ? "border-[#f0dcae] bg-[#fffaf0] text-[#8a5a00]"
                                                            // Локальная подпись системы «Делосфера» — зелёная, как в ВНД.
                                                            : ecp.isSystem
                                                                ? "border-[#bfe3dd] bg-[#eef8f6] text-[#0f5e5a]"
                                                                : "border-[#d4d6f8] bg-[#f5f6fd] text-[#4e57d6]"}`}>
                                                    <ShieldCheck size={13} strokeWidth={2}/>
                                                    <span className="font-semibold">
                                                        {ecp.isTest ? t("szCard.signature.ecpTest")
                                                            : ecp.isSystem ? t("szCard.signature.system") : t("szCard.signature.ecp")}
                                                    </span>
                                                    <span className="text-[#8b97ab]">· {formatDateTime(ecp.signedAt)}</span>
                                                </span>
                                                {!ecp.matchesCurrentContent && (
                                                    ecp.decision === "ApprovedWithRemarks" ? (
                                                        // Согласовано с замечаниями: подпись на версии до правок — штатно, без тревоги.
                                                        <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#f3f5f9] px-2 py-[3px] text-[11px] text-[#6b7791]">
                                                            {t("szCard.signature.otherVersionRemarksShort")}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#fdf3e0] px-2 py-[3px] text-[11px] text-[#8a5a00]">
                                                            <AlertTriangle size={12}/>
                                                            {t("szCard.signature.otherVersion")}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        ) : stamp && (
                                            <div className="mt-2">
                                                <span className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-[3px] text-[11.5px] ${
                                                    stamp.revoked
                                                        ? "border-[#f1c9c2] bg-[#fbeae7] text-[#c0392b]"
                                                        : "border-[#e5e9f0] bg-[#f8fafc] text-[#55617a]"}`}>
                                                    <span className="font-semibold">{stamp.levelTitle}</span>
                                                    <span className="text-[#8b97ab]">· {formatDateTime(stamp.at)}</span>
                                                    {stamp.revoked && <span>· {t("szCard.signature.revoked")}</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
