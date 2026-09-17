// Панель для главного редактора ВНД: заявки на доступ к актуализации, ожидающие решения.
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, ChevronUp, Inbox, Loader2} from "lucide-react";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";
import {ApproveActualizationRequestModal} from
    "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/ApproveActualizationRequestModal.tsx";
import {toast} from "@/service/toastService.ts";
import {formatDate} from "@/utils/dateUtils.ts";

export function ActualizationRequestsPanel() {
    const {t} = useTranslation();
    const [open, setOpen] = useState(true);
    const [requests, setRequests] = useState<VndActualizationRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [decidingId, setDecidingId] = useState<number | null>(null);
    const [approveTarget, setApproveTarget] = useState<VndActualizationRequestResponse | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError(null);
        actualizationService.getPendingRequests()
            .then(setRequests)
            .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : t("actualizationPage.requestsPanel.loadError")))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const handleApprove = async (requestId: number, shiftNextPeriod: boolean) => {
        setDecidingId(requestId);
        setApproveError(null);
        try {
            await actualizationService.decideRequest(requestId, {approve: true, shiftNextPeriod});
            toast.success(t("actualizationPage.requestsPanel.approveSuccess"));
            setApproveTarget(null);
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err) {
            setApproveError(err instanceof Error ? err.message : t("actualizationPage.requestsPanel.approveError"));
        } finally {
            setDecidingId(null);
        }
    };

    const handleReject = async (requestId: number) => {
        setDecidingId(requestId);
        try {
            await actualizationService.decideRequest(requestId, {approve: false});
            toast.success(t("actualizationPage.requestsPanel.rejectSuccess"));
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err) {
            toast.error(
                t("actualizationPage.requestsPanel.rejectErrorTitle"),
                err instanceof Error ? err.message : undefined,
            );
        } finally {
            setDecidingId(null);
        }
    };

    // Если заявок нет и всё загружено без ошибок - панель не отвлекает внимание, но остаётся
    // доступной свёрнутой, чтобы было видно, что раздел вообще есть.
    if (!loading && !error && requests.length === 0) return null;

    return (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[#e9edf3] bg-white">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-5 py-3.5 text-left"
            >
                <span className="flex items-center gap-2">
                    <Inbox size={16} className="text-[#4e57d6]" strokeWidth={1.8}/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">
                        {/* Заявки на доступ к актуализации */}
                        {t("actualizationPage.requestsPanel.title")}
                    </span>
                    {requests.length > 0 && (
                        <span className="rounded-full bg-[#ececfc] px-2 py-0.5 text-[11.5px] font-bold text-[#4e57d6]">
                            {requests.length}
                        </span>
                    )}
                </span>
                {open ? <ChevronUp size={16} className="text-[#a3adbd]"/> : <ChevronDown size={16} className="text-[#a3adbd]"/>}
            </button>

            {open && (
                <div className="border-t border-[#eef2f7]">
                    {loading && (
                        <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-[#8b97ab]">
                            <Loader2 size={14} className="animate-spin"/>
                            {/* Загрузка… */}
                            {t("actualizationPage.requestsPanel.loading")}
                        </div>
                    )}

                    {error && (
                        <div className="px-5 py-4 text-[12.5px] text-[#c0392b]">{error}</div>
                    )}

                    {!loading && !error && requests.length === 0 && (
                        <div className="px-5 py-4 text-[13px] text-[#8b97ab]">
                            {/* Заявок нет */}
                            {t("actualizationPage.requestsPanel.empty")}
                        </div>
                    )}

                    <div className="divide-y divide-[#eef2f7]">
                        {requests.map((r) => (
                            <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-semibold text-[#1c2740]">
                                        {r.vndCode} · {r.vndTitle}
                                    </div>
                                    <div className="text-[12px] text-[#8b97ab]">
                                        {r.requestedByName} · {r.requiresApproval
                                            ? t("actualizationPage.requestsPanel.requiresApproval")
                                            : t("actualizationPage.requestsPanel.noApprovalRequired")} · {formatDate(r.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-none gap-2">
                                    <button
                                        type="button"
                                        disabled={decidingId === r.id}
                                        onClick={() => { setApproveError(null); setApproveTarget(r); }}
                                        className="cursor-pointer h-8 rounded-[8px] bg-[#1c7a4d] px-3 text-[12px] font-semibold text-white hover:brightness-[1.06] disabled:opacity-50"
                                    >
                                        {/* Одобрить */}
                                        {t("actualizationPage.requestsPanel.approveAction")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={decidingId === r.id}
                                        onClick={() => handleReject(r.id)}
                                        className="cursor-pointer h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold text-[#c0392b] hover:bg-[#fdf1f1] disabled:opacity-50"
                                    >
                                        {/* Отклонить */}
                                        {t("actualizationPage.requestsPanel.rejectAction")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {approveTarget && (
                <ApproveActualizationRequestModal
                    requestedByName={approveTarget.requestedByName}
                    requestedShiftNextPeriod={approveTarget.shiftNextPeriod}
                    submitting={decidingId === approveTarget.id}
                    error={approveError}
                    onClose={() => { if (decidingId) return; setApproveTarget(null); setApproveError(null); }}
                    onConfirm={(shiftNextPeriod) => handleApprove(approveTarget.id, shiftNextPeriod)}
                />
            )}
        </div>
    );
}
