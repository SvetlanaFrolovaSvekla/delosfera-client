import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Eye, FileStack, Loader2, Shield} from "lucide-react";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {activityLogService} from "@/service/activityLogService/activityLogService.ts";
import type {ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ApprovalProcessResponse,
    ApprovalStageDecisionResponse,
    ApprovalStageResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";
import {
    VndRedactionHistoryDetail
} from "@/components/componentsVND/componentsOpenVndPage/componentsHistoryTab/VndRedactionHistoryDetail.tsx";
import {
    FormattedResolutionComment
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";

interface VndHistoryTabProps {
    vnd: VndResponse;
    redactions: VndRedactionResponse[];
}

const ICON_DOT_COLOR: Record<string, string> = {
    check: "bg-emerald-500",
    x: "bg-red-500",
    doc: "bg-indigo-500",
    clock: "bg-amber-500",
    trash: "bg-red-500",
    info: "bg-[#c3ccd8]",
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ru-RU", {dateStyle: "short", timeStyle: "short"});
}

/** Финальное решение согласующего по этапу — самая поздняя из пройденных фаз
 * (финальная выдержка > повторное согласование > первичное), без "в ожидании". */
function stageFinalDecision(s: ApprovalStageResponse): {
    decisionKey: ApprovalStageDecisionResponse;
    decidedAt: string | null;
    comment: string | null;
} {
    if (s.finalHoldDecision && s.finalHoldDecision !== "pending") {
        return {decisionKey: s.finalHoldDecision, decidedAt: s.finalHoldDecidedAt, comment: s.finalHoldComment};
    }
    if (s.repeatDecision && s.repeatDecision !== "pending") {
        return {decisionKey: s.repeatDecision, decidedAt: s.repeatDecidedAt, comment: s.repeatComment};
    }
    if (s.primaryDecision !== "pending") {
        return {decisionKey: s.primaryDecision, decidedAt: s.primaryDecidedAt, comment: s.primaryComment};
    }
    return {decisionKey: "pending", decidedAt: null, comment: null};
}

export function VndHistoryTab({vnd, redactions}: VndHistoryTabProps) {
    const {t} = useTranslation();
    const [auditEntries, setAuditEntries] = useState<ActivityLogEntryResponse[] | null>(null);
    const [approvalHistory, setApprovalHistory] = useState<ApprovalProcessResponse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Id редакции, для которой открыт подробный лог (кнопка "Смотреть подробно" на панели
    // "Редакции и юридическая значимость") — вместо самой редакции храним id, чтобы после
    // перезагрузки/изменения списка редакций деталка всегда показывала актуальные данные.
    const [detailRedactionId, setDetailRedactionId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            activityLogService.getByEntity("vnd", vnd.id),
            coordinationService.getHistory(vnd.id),
        ])
            .then(([audit, approvals]) => {
                if (cancelled) return;
                setAuditEntries(audit);
                setApprovalHistory(approvals);
            })
            .catch(() => {
                if (!cancelled) setError(t("openVndPage.historyTab.loadError"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [vnd.id, t]);

    // Открытая по кнопке "Смотреть подробно" редакция относится к конкретному ВНД — при
    // переключении на другой документ (без размонтирования таба) детальный лог нужно закрыть.
    useEffect(() => {
        setDetailRedactionId(null);
    }, [vnd.id]);

    const maxNumber = redactions.reduce((max, r) => Math.max(max, r.number), 0);
    const sortedRedactions = [...redactions].sort((a, b) => b.number - a.number);
    const detailRedaction = detailRedactionId != null
        ? redactions.find((r) => r.id === detailRedactionId) ?? null
        : null;

    if (loading) {
        return (
            <div className="px-4 sm:px-6 flex items-center gap-2 text-sm text-[#8b97ab] py-10 justify-center">
                <Loader2 size={16} className="animate-spin"/>
                {t("openVndPage.historyTab.loading")}
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 sm:px-6 py-10 text-center text-sm text-red-600">{error}</div>
        );
    }

    // Подробный лог выбранной редакции — занимает место обеих панелей (аудит + редакции),
    // пока не нажата стрелочка "Назад к истории" (см. VndRedactionHistoryDetail.onBack).
    if (detailRedaction) {
        const displayStatus = getRedactionDisplayStatus(
            detailRedaction, vnd.status, detailRedaction.number === maxNumber, vnd.effectiveDate,
        );
        const processesForRedaction = (approvalHistory ?? []).filter(
            (p) => p.redactionId === detailRedaction.id,
        );

        return (
            <div className="px-4 sm:px-6">
                <VndRedactionHistoryDetail
                    vnd={vnd}
                    redaction={detailRedaction}
                    displayStatus={displayStatus}
                    processes={processesForRedaction}
                    onBack={() => setDetailRedactionId(null)}
                />
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
            {/* Левая колонка: журнал аудита */}
            <div className="flex flex-col gap-[18px]">
                <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                        <Shield size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                        <h2 className="m-0 text-sm font-semibold">{t("openVndPage.historyTab.auditLogTitle")}</h2>
                        <span className="ml-auto text-[11px] text-[#a3adbd]">{t("openVndPage.historyTab.auditLogSubtitle")}</span>
                    </div>
                    <div className="px-5 pt-1.5 pb-3.5">
                        {(auditEntries?.length ?? 0) === 0 ? (
                            <div className="py-4 text-[12.5px] text-[#a3adbd]">{t("openVndPage.historyTab.auditLogEmpty")}</div>
                        ) : (
                            auditEntries!.map((a) => (
                                <div key={a.id}
                                     className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                    <span
                                        className={`w-[7px] h-[7px] flex-none rounded-full mt-1.5 ${ICON_DOT_COLOR[a.icon] ?? "bg-[#c3ccd8]"}`}
                                    />
                                    <div className="min-w-0">
                                        {/* whitespace-pre-line — сервер разносит длинный список изменённых
                                            реквизитов по строкам через \n (см. VndService.BuildChangedFieldsList) */}
                                        <div className="whitespace-pre-line text-[12.5px] text-[#26324a] leading-[1.4]">{a.text}</div>
                                        <div className="text-[11px] text-[#8b97ab] mt-0.5">{formatDateTime(a.createdAt)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Правая колонка: редакции и юридическая значимость */}
            <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7]">
                    <h2 className="m-0 text-sm font-semibold">{t("openVndPage.historyTab.redactionsPanelTitle")}</h2>
                </div>
                <div className="px-5 pt-1.5 pb-3.5">
                    {sortedRedactions.length === 0 ? (
                        <EmptyState
                            embedded
                            icon={FileStack}
                            title={t("openVndPage.historyTab.redactionsEmptyTitle")}
                            description={t("openVndPage.historyTab.redactionsEmptyDescription")}
                        />
                    ) : (
                        sortedRedactions.map((r) => {
                            const displayStatus = getRedactionDisplayStatus(
                                r, vnd.status, r.number === maxNumber, vnd.effectiveDate,
                            );
                            const meta = REDACTION_STATUS_META[displayStatus];
                            // approvalHistory отсортирован сервером по убыванию CreatedAt — первое
                            // совпадение по redactionId и есть последний цикл согласования этой редакции.
                            const process = approvalHistory?.find((p) => p.redactionId === r.id) ?? null;

                            return (
                                <div key={r.id} className="flex items-start gap-[13px] py-3 border-b border-[#f3f6f9] last:border-b-0">
                                    <div className="flex-none text-center">
                                        <div className="font-mono text-[13px] font-bold text-[#1c2740]">{r.code}</div>
                                        <span
                                            className="inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                                            style={{color: meta.color, background: meta.bg}}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 border-l-2 border-[#eef2f7] pl-[13px]">
                                        <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                            {t("openVndPage.historyTab.developerLabel")}: {r.developerName}
                                        </div>
                                        <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                            {t("openVndPage.historyTab.approvalBodyLabel")}: {r.organName}
                                        </div>

                                        {process ? (
                                            <>
                                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                                    {t("openVndPage.historyTab.initiatorLabel")}: {process.initiatorName}
                                                    {process.initiatorPosition ? ` (${process.initiatorPosition})` : ""}
                                                    {" "}— {formatDateTime(process.primaryStartedAt)}
                                                </div>
                                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                                    {t("openVndPage.historyTab.statusLabel")}: {t(`openVndPage.historyTab.processStatuses.${process.status}`)}
                                                    {process.completedAt ? t("openVndPage.historyTab.completedSuffix", {date: formatDateTime(process.completedAt)}) : ""}
                                                </div>
                                                {process.stages.length > 0 && (
                                                    <div className="mt-1.5 flex flex-col gap-1">
                                                        {process.stages.map((s) => {
                                                            const decision = stageFinalDecision(s);
                                                            return (
                                                                <div key={s.id} className="text-[11.5px] text-[#26324a]">
                                                                    <span className="text-[#8b97ab]">{s.approverName}</span>
                                                                    {s.orgUnitName ? (
                                                                        <span className="text-[#a3adbd]"> ({s.orgUnitName})</span>
                                                                    ) : null}
                                                                    {" — "}
                                                                    <span>{t(`openVndPage.historyTab.decisionLabels.${decision.decisionKey}`)}</span>
                                                                    {decision.decidedAt ? (
                                                                        <span className="text-[#a3adbd]">
                                                                            {" · "}{formatDateTime(decision.decidedAt)}
                                                                        </span>
                                                                    ) : null}
                                                                    {decision.comment && (
                                                                        <div className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-[1.4] text-[#6b7488]">
                                                                            <FormattedResolutionComment text={decision.comment}/>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-[11.5px] text-[#a3adbd] mt-0.5">
                                                {t("openVndPage.historyTab.notStartedHint")}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDetailRedactionId(r.id)}
                                        className="flex-none self-start inline-flex items-center gap-1 rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4e57d6] hover:bg-[#ececfc] whitespace-nowrap cursor-pointer"
                                    >
                                        <Eye size={13}/>
                                        {t("openVndPage.historyTab.viewDetailsButton")}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
