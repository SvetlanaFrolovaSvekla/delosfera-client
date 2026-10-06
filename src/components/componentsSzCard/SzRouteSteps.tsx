// Подробный список этапов маршрута: участники, их резолюции, комментарии и подписи.
import {useTranslation} from "react-i18next";
import {colors} from "@/design/tokens.ts";
import type {RouteInstance} from "@/service/workflowService/workflowService.ts";
import {SignatureStampView} from "@/components/signing/SignatureStampView.tsx";

interface SzRouteStepsProps {
    route: RouteInstance;
    users: Record<number, string>;
}

export function SzRouteSteps({route, users}: SzRouteStepsProps) {
    const {t} = useTranslation();

    return (
        <div className="flex flex-col gap-2.5">
            {route.steps.map((step) => (
                <div key={step.id} className="rounded-[10px] border border-[#eef2f7] px-4 py-3">
                    <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("szCard.approval.stage", {order: step.order})}
                        {step.kind === "Signing" && ` · ${t("szCard.approval.stageSigning")}`}
                        {step.isFinalMethodology && ` · ${t("szCard.approval.stageFinalControl")}`}
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                        {step.participants.map((p) => (
                            <div key={p.id} className="flex items-start justify-between gap-3 text-[13px]">
                                <div>
                                    <span className="text-[#1c2740]">
                                        {p.userFullName
                                            ?? (p.userId
                                                ? users[p.userId] ?? t("szCard.approval.userFallback", {id: p.userId})
                                                : "—")}
                                    </span>
                                    {p.resolution?.comment && (
                                        <div className="text-[12.5px] text-[#8b97ab]">{p.resolution.comment}</div>
                                    )}
                                    {p.resolution?.signature && (
                                        <SignatureStampView signature={p.resolution.signature}/>
                                    )}
                                </div>
                                <span className="text-[12px] font-semibold whitespace-nowrap"
                                      style={{
                                          color: p.resolution
                                              ? (p.resolution.type === "Rejected" ? colors.ryg.red.fg : colors.ryg.green.fg)
                                              : colors.inkSubtle,
                                      }}>
                                    {p.resolution
                                        ? t(`szCard.resolution.${p.resolution.type}`)
                                        : t(`szCard.participantState.${p.state}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
