import {useEffect, useState} from "react";
import {Loader2, Shield} from "lucide-react";
import {activityLogService} from "@/service/activityLogService/activityLogService.ts";
import type {ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ApprovalProcessResponse,
    ApprovalProcessStatus,
    ApprovalStageDecisionResponse,
    ApprovalStageResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";

interface VndHistoryTabProps {
    vnd: VndResponse;
    redactions: VndRedactionResponse[];
}

const PROCESS_STATUS_LABEL: Record<ApprovalProcessStatus, string> = {
    primary: "Первичное согласование",
    revision_needed: "На доработке",
    repeated: "Повторное согласование",
    final_hold: "Финальная выдержка",
    approved: "Согласовано",
    cancelled: "Отозвано",
    rejected: "Отклонено",
};

const DECISION_LABEL: Record<ApprovalStageDecisionResponse, string> = {
    pending: "в ожидании",
    approved: "Согласовано",
    approved_with_comment: "Согласовано с замечаниями",
    rejected: "Отклонено",
    auto_approved_timeout: "Согласовано автоматически (истёк срок)",
};

const ICON_DOT_COLOR: Record<string, string> = {
    check: "bg-emerald-500",
    x: "bg-red-500",
    doc: "bg-indigo-500",
    clock: "bg-amber-500",
    info: "bg-[#c3ccd8]",
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ru-RU", {dateStyle: "short", timeStyle: "short"});
}

/** Финальное решение согласующего по этапу — самая поздняя из пройденных фаз
 * (финальная выдержка > повторное согласование > первичное), без "в ожидании". */
function stageFinalDecision(s: ApprovalStageResponse): {
    label: string;
    decidedAt: string | null;
    comment: string | null;
} {
    if (s.finalHoldDecision && s.finalHoldDecision !== "pending") {
        return {label: DECISION_LABEL[s.finalHoldDecision], decidedAt: s.finalHoldDecidedAt, comment: s.finalHoldComment};
    }
    if (s.repeatDecision && s.repeatDecision !== "pending") {
        return {label: DECISION_LABEL[s.repeatDecision], decidedAt: s.repeatDecidedAt, comment: s.repeatComment};
    }
    if (s.primaryDecision !== "pending") {
        return {label: DECISION_LABEL[s.primaryDecision], decidedAt: s.primaryDecidedAt, comment: s.primaryComment};
    }
    return {label: DECISION_LABEL.pending, decidedAt: null, comment: null};
}

export function VndHistoryTab({vnd, redactions}: VndHistoryTabProps) {
    const [auditEntries, setAuditEntries] = useState<ActivityLogEntryResponse[] | null>(null);
    const [approvalHistory, setApprovalHistory] = useState<ApprovalProcessResponse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                if (!cancelled) setError("Не удалось загрузить историю ВНД");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [vnd.id]);

    const maxNumber = redactions.reduce((max, r) => Math.max(max, r.number), 0);
    const sortedRedactions = [...redactions].sort((a, b) => b.number - a.number);

    if (loading) {
        return (
            <div className="px-4 sm:px-6 flex items-center gap-2 text-sm text-[#8b97ab] py-10 justify-center">
                <Loader2 size={16} className="animate-spin"/>
                Загрузка истории…
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 sm:px-6 py-10 text-center text-sm text-red-600">{error}</div>
        );
    }

    return (
        <div className="px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
            {/* Левая колонка: журнал аудита */}
            <div className="flex flex-col gap-[18px]">
                <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                        <Shield size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                        <h2 className="m-0 text-sm font-semibold">Журнал аудита</h2>
                        <span className="ml-auto text-[11px] text-[#a3adbd]">История всех действий с данной ВНД</span>
                    </div>
                    <div className="px-5 pt-1.5 pb-3.5">
                        {(auditEntries?.length ?? 0) === 0 ? (
                            <div className="py-4 text-[12.5px] text-[#a3adbd]">Записей пока нет</div>
                        ) : (
                            auditEntries!.map((a) => (
                                <div key={a.id}
                                     className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                    <span
                                        className={`w-[7px] h-[7px] flex-none rounded-full mt-1.5 ${ICON_DOT_COLOR[a.icon] ?? "bg-[#c3ccd8]"}`}
                                    />
                                    <div className="min-w-0">
                                        <div className="text-[12.5px] text-[#26324a] leading-[1.4]">{a.text}</div>
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
                    <h2 className="m-0 text-sm font-semibold">Редакции и юридическая значимость</h2>
                </div>
                <div className="px-5 pt-1.5 pb-3.5">
                    {sortedRedactions.length === 0 ? (
                        <div className="py-4 text-[12.5px] text-[#a3adbd]">Редакций пока нет</div>
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
                                <div key={r.id} className="flex gap-[13px] py-3 border-b border-[#f3f6f9] last:border-b-0">
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
                                            Разработчик: {r.developerName}
                                        </div>
                                        <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                            Орган утверждения: {r.organName}
                                        </div>

                                        {process ? (
                                            <>
                                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                                    Инициатор согласования: {process.initiatorName}
                                                    {process.initiatorPosition ? ` (${process.initiatorPosition})` : ""}
                                                    {" "}— {formatDateTime(process.primaryStartedAt)}
                                                </div>
                                                <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                                    Статус согласования: {PROCESS_STATUS_LABEL[process.status]}
                                                    {process.completedAt ? ` (завершено ${formatDateTime(process.completedAt)})` : ""}
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
                                                                    <span>{decision.label}</span>
                                                                    {decision.decidedAt ? (
                                                                        <span className="text-[#a3adbd]">
                                                                            {" · "}{formatDateTime(decision.decidedAt)}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-[11.5px] text-[#a3adbd] mt-0.5">
                                                Согласование не запускалось
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
