// Подробный список этапов маршрута: участник, его решение, комментарий и компактный значок подписи.
// Подробности подписи (хэш, сертификат, проверка у провайдера) — в журнале подписей ниже.
import {AlertTriangle, ShieldCheck} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {RouteInstance, RouteParticipant} from "@/service/workflowService/workflowService.ts";
import type {SzResolutionSignature} from "@/service/szService/szEcpService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

interface SzRouteStepsProps {
    route: RouteInstance;
    users: Record<number, string>;
    /** Подписи ЭЦП по участникам маршрута (routeParticipantId → запись журнала). */
    ecpByParticipant?: ReadonlyMap<number, SzResolutionSignature>;
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

export function SzRouteSteps({route, users, ecpByParticipant}: SzRouteStepsProps) {
    const {t} = useTranslation();

    const nameOf = (p: RouteParticipant) =>
        p.userFullName
        ?? (p.userId ? users[p.userId] ?? t("szCard.approval.userFallback", {id: p.userId}) : "—");

    return (
        <div className="flex flex-col gap-2.5">
            {route.steps.map((step) => (
                <div key={step.id} className="rounded-[12px] border border-[#eef2f7] bg-white">
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
                                            <span className={`rounded-full px-2.5 py-[2px] text-[11.5px] font-semibold ${statusTone(p)}`}>
                                                {p.resolution
                                                    ? t(`szCard.resolution.${p.resolution.type}`)
                                                    : t(`szCard.participantState.${p.state}`)}
                                            </span>
                                        </div>

                                        {p.resolution?.comment && (
                                            <div className="mt-1.5 border-l-2 border-[#e5e9f0] pl-2.5 text-[12.5px] leading-[1.55] text-[#55617a]">
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
                                                            : "border-[#d4d6f8] bg-[#f5f6fd] text-[#4e57d6]"}`}>
                                                    <ShieldCheck size={13} strokeWidth={2}/>
                                                    <span className="font-semibold">
                                                        {ecp.isTest ? t("szCard.signature.ecpTest") : t("szCard.signature.ecp")}
                                                    </span>
                                                    <span className="text-[#8b97ab]">· {formatDateTime(ecp.signedAt)}</span>
                                                </span>
                                                {!ecp.matchesCurrentContent && (
                                                    <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#fdf3e0] px-2 py-[3px] text-[11px] text-[#8a5a00]">
                                                        <AlertTriangle size={12}/>
                                                        {t("szCard.signature.otherVersion")}
                                                    </span>
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
