// Вкладка «Актуализация» на странице ВНД — запуск цикла актуализации для
// действующего документа (напрямую или по запросу к главному редактору),
// шаг "Выполнить актуализацию", статус самого цикла, пока он идёт, и история
// всех прошлых актуализаций (кто и когда брал в актуализацию, кто выдавал доступ по заявке).
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {toast} from "@/service/toastService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {useVndActualizationFlow} from "@/hooks/vndHooks/useVndActualizationFlow.ts";
import {useVndActualizationHistory} from "@/hooks/vndHooks/useVndActualizationHistory.ts";

import {StartActualizationModal} from "./componentsActualizationTab/StartActualizationModal.tsx";
import {
    RequestActualizationAccessModal,
} from "./componentsActualizationTab/RequestActualizationAccessModal.tsx";
import {
    ApproveActualizationRequestModal,
} from "./componentsActualizationTab/ApproveActualizationRequestModal.tsx";
import {
    ActualizationHistorySection
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/ActualizationHistorySection.tsx";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {CheckCircle2, ClipboardList, Clock, Inbox, Loader2, RefreshCw, Send} from "lucide-react";

interface VndActualizationTabProps {
    vnd: VndResponse;
    onVndChanged: () => void;
    onGoToEditions: () => void;
    onGoToApproval: () => void;
}

export function VndActualizationTab({vnd, onVndChanged, onGoToEditions, onGoToApproval}: VndActualizationTabProps) {
    const {t} = useTranslation();
    const {user} = useAuth();

    const {
        canDirectly, canByRequest,
        canWithoutApproval, canWithApproval,
        startOpen, setStartOpen, requestOpen, setRequestOpen,
        approveTarget, setApproveTarget,
        submitting, error, setError,
        handleStart, handleRequestAccess,
        myAccessState, requests,
        handleApproveRequest, handleRejectRequest, approvingRequestId,
        needsPerform, needsConfirmStartAfterRequest,
    } = useVndActualizationFlow(vnd, onVndChanged);

    const {data: history, loading: historyLoading} = useVndActualizationHistory(vnd.id);

    const [confirmingNoChanges, setConfirmingNoChanges] = useState(false);
    const handleConfirmNoChanges = async () => {
        setConfirmingNoChanges(true);
        try {
            await actualizationService.confirmNoChanges(vnd.id);
            toast.success(
                t("openVndPage.actualizationTab.toast.noChangesConfirmedTitle"),
                t("openVndPage.actualizationTab.toast.noChangesConfirmedDescription"),
            );
            onVndChanged();
        } catch (err) {
            toast.error(t("openVndPage.actualizationTab.toast.confirmErrorTitle"), err instanceof Error ? err.message : undefined);
        } finally {
            setConfirmingNoChanges(false);
        }
    };

    if (vnd.status === "onact") {
        // Шаг "Выполнить актуализацию" ещё не пройден — до него ни "без изменений", ни "с
        // изменениями" ветки не имеют смысла (соответствующие поля ещё не окончательные), и
        // загрузка новой редакции на вкладке «Редакции» заблокирована на бэке. Сам шаг
        // выполняется во вкладке «Редакции» (кнопка сайдбара «Выполнить актуализацию»), не здесь.
        if (!vnd.actualizationPerformed) {
            return (
                <div className="px-4 sm:px-6 py-4">
                    <div className="overflow-hidden rounded-[14px] border border-[#e2c98a] bg-[#fdf6e8]">
                        <div className="flex items-center gap-2.5 border-b border-[#f0dcae] px-5 py-[13px]">
                            <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#fdf6e8] text-[#9a6408]">
                                <RefreshCw size={15} strokeWidth={1.8}/>
                            </span>
                            <span className="text-[13.5px] font-bold text-[#7a5006]">
                                {t("openVndPage.actualizationTab.performStepTitle")}
                            </span>
                        </div>
                        <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                            {needsPerform
                                ? t("openVndPage.actualizationTab.performStepHintNeedsPerform")
                                : t("openVndPage.actualizationTab.performStepHintWaiting")}
                        </div>
                        {needsPerform && (
                            <div className="border-t border-[#eef2f7] px-5 py-[13px]">
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                >
                                    {t("openVndPage.actualizationTab.goToEditionsButton")}
                                </button>
                            </div>
                        )}
                    </div>

                    <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
                </div>
            );
        }

        return (
            <div className="px-4 sm:px-6 py-4">
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#eef0f3] text-[#5b6472]">
                            <RefreshCw size={15} strokeWidth={1.8}/>
                        </span>
                        <span className="text-[13.5px] font-bold text-[#1c2740]">
                            {t("openVndPage.actualizationTab.inProgressTitle")}
                        </span>
                        {vnd.actualizationPlannedNoChanges && (
                            <span className="ml-auto rounded-full bg-[#fdf6e8] px-[9px] py-[2px] text-[11px] font-semibold text-[#9a6408]">
                                {t("openVndPage.actualizationTab.noChangesBadge")}
                            </span>
                        )}
                    </div>

                    {vnd.actualizationPlannedNoChanges ? (
                        <>
                            <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                                {vnd.actualizationRequiresApproval
                                    ? t("openVndPage.actualizationTab.noChangesHintWithApproval")
                                    : t("openVndPage.actualizationTab.noChangesHintWithoutApproval")}
                            </div>
                            <div className="border-t border-[#eef2f7] px-5 py-[13px] flex flex-wrap gap-2">
                                {vnd.actualizationRequiresApproval ? (
                                    <button
                                        type="button"
                                        onClick={onGoToApproval}
                                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                    >
                                        {t("openVndPage.actualizationTab.goToApprovalButton")}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleConfirmNoChanges}
                                        disabled={confirmingNoChanges}
                                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {confirmingNoChanges && <Loader2 size={14} className="animate-spin"/>}
                                        {t("openVndPage.actualizationTab.confirmNoChangesButton")}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                                >
                                    {t("openVndPage.actualizationTab.uploadChangesAnywayButton")}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                                {t("openVndPage.actualizationTab.withChangesHint")}
                            </div>
                            <div className="border-t border-[#eef2f7] px-5 py-[13px]">
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                >
                                    {t("openVndPage.actualizationTab.goToEditionsButton")}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
            </div>
        );
    }

    if (vnd.status === "consol") {
        return (
            <div className="px-4 sm:px-6 py-4">
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    {t("openVndPage.actualizationTab.consolStatusHint")}
                </div>

                <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
            </div>
        );
    }

    if (vnd.status !== "active") {
        return (
            <div className="px-4 sm:px-6 py-4">
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    {t("openVndPage.actualizationTab.notActiveHint")}
                </div>

                <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
                <Loader label={t("general.loading")} fullHeight={false}/>
            </div>
        );
    }

    const requestBlocked = myAccessState.kind === "pending" || myAccessState.kind === "approved";

    return (
        <div className="px-4 sm:px-6 py-4">
            <div className="mb-5 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#ececfc] text-[#4e57d6]">
                        <ClipboardList size={15} strokeWidth={1.8}/>
                    </span>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.dueDatesTitle")}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 px-5 py-4 text-[13px]">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            {t("openVndPage.passportTab.dueActualizationDateLabel")}
                        </div>
                        <div className="mt-1 text-[#26324a]">{formatDate(vnd.dueActualizationDate)}</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            {t("openVndPage.actualizationTab.lastActualizationLabel")}
                        </div>
                        <div className="mt-1 text-[#26324a]">
                            {formatDate(vnd.lastActualizationDate)}
                            {vnd.lastActualizationDate && (
                                <span className="ml-1.5 text-[#8b97ab]">
                                    ({vnd.lastActualizationHadChanges
                                        ? t("openVndPage.actualizationTab.withChangesSuffix")
                                        : t("openVndPage.actualizationTab.withoutChangesSuffix")})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {canDirectly && (() => {
                const pendingRequests = requests.filter((r) => r.status === "pending");
                if (pendingRequests.length === 0) return null;

                return (
                    <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e2c98a] bg-[#fdf6e8]">
                        <div className="flex items-center gap-2.5 border-b border-[#f0dcae] px-5 py-[13px]">
                            <Inbox size={16} strokeWidth={1.8} className="flex-none text-[#9a6408]"/>
                            <span className="text-[13.5px] font-bold text-[#7a5006]">
                                {t("openVndPage.actualizationTab.pendingRequestsTitle")}
                            </span>
                        </div>
                        <div className="px-5 py-1.5">
                            {pendingRequests.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex flex-wrap items-center gap-3 py-3 border-t border-[#f0dcae] first:border-t-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-semibold text-[#1c2740]">{r.requestedByName}</div>
                                        <div className="text-[11.5px] text-[#9a6408]">
                                            {/* requiresApproval/shiftNextPeriod заявки до решения ничего не
                                            несут (requiresApproval всегда true, shiftNextPeriod - заглушка,
                                            см. RequestAccessAsync) - решает главный редактор при одобрении,
                                            поэтому здесь показываем только имя и дату подачи. */}
                                            {formatDate(r.createdAt)}
                                        </div>
                                    </div>
                                    <div className="flex flex-none gap-2">
                                        <button
                                            type="button"
                                            disabled={approvingRequestId === r.id}
                                            onClick={() => setApproveTarget(r)}
                                            className="cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#1c7a4d] px-3 text-[12px] font-semibold text-white hover:brightness-[1.06] disabled:opacity-50"
                                        >
                                            {approvingRequestId === r.id && <Loader2 size={13} className="animate-spin"/>}
                                            {t("openVndPage.actualizationTab.approveButton")}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={approvingRequestId === r.id}
                                            onClick={() => handleRejectRequest(r.id)}
                                            className="cursor-pointer h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold text-[#c0392b] hover:bg-[#fdf1f1] disabled:opacity-50"
                                        >
                                            {t("openVndPage.actualizationTab.rejectButton")}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {myAccessState.kind === "pending" && (
                <div className="mb-3 flex items-center gap-2.5 overflow-hidden rounded-[14px] border border-[#f0dcae] bg-[#fdf6e8] px-5 py-4">
                    <Clock size={16} strokeWidth={1.8} className="flex-none text-[#9a6408]"/>
                    <span className="text-[13px] text-[#9a6408]">
                        {t("openVndPage.redactionsSidebar.pendingRequestHint")}
                    </span>
                </div>
            )}

            {needsConfirmStartAfterRequest && myAccessState.kind === "approved" && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#cfe3d4] bg-[#eef8f0]">
                    <div className="flex items-center gap-2.5 px-5 py-4">
                        <CheckCircle2 size={16} strokeWidth={1.8} className="flex-none text-[#1c7a4d]"/>
                        <span className="text-[13px] text-[#1c7a4d]">
                            {t("openVndPage.actualizationTab.approvedHint", {
                                decidedBy: myAccessState.decidedByName ? ` (${myAccessState.decidedByName})` : "",
                            })}
                        </span>
                    </div>
                    <div className="border-t border-[#cfe3d4] px-5 py-[13px]">
                        <button
                            type="button"
                            onClick={onGoToEditions}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#1c7a4d] px-3.5 text-[12.5px] font-semibold text-white hover:brightness-[1.06]"
                        >
                            <RefreshCw size={14} strokeWidth={1.8}/>
                            {t("openVndPage.actualizationTab.goToEditionsButton")}
                        </button>
                    </div>
                </div>
            )}

            {canDirectly && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-5 py-4">
                    <div className="mb-1 text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.startDirectlyTitle")}</div>
                    <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                        {t("openVndPage.actualizationTab.startDirectlyHint")}
                    </p>
                    <button
                        type="button"
                        onClick={() => setStartOpen(true)}
                        disabled={requestBlocked}
                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw size={14} strokeWidth={1.8}/>
                        {t("openVndPage.actualizationTab.startDirectlyButton")}
                    </button>
                </div>
            )}

            {!canDirectly && canByRequest && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-5 py-4">
                    <div className="mb-1 text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.accessByRequestTitle")}</div>
                    <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                        {t("openVndPage.actualizationTab.accessByRequestHint")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setRequestOpen(true)}
                            disabled={requestBlocked}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send size={14} strokeWidth={1.8}/>
                            {t("openVndPage.actualizationTab.requestAccessButton")}
                        </button>
                    </div>
                </div>
            )}

            {!canDirectly && !canByRequest && (
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    {t("openVndPage.redactionsSidebar.noPermissionHint")}
                </div>
            )}

            {startOpen && (
                <StartActualizationModal
                    canWithoutApproval={canWithoutApproval}
                    canWithApproval={canWithApproval}
                    submitting={submitting}
                    error={error}
                    currentUserId={user.id}
                    onClose={() => { if (submitting) return; setStartOpen(false); setError(null); }}
                    onConfirm={handleStart}
                />
            )}

            {requestOpen && (
                <RequestActualizationAccessModal
                    submitting={submitting}
                    error={error}
                    onClose={() => {
                        if (submitting) return;
                        setRequestOpen(false);
                        setError(null);
                    }}
                    onConfirm={handleRequestAccess}
                />
            )}

            {approveTarget && (
                <ApproveActualizationRequestModal
                    requestedByName={approveTarget.requestedByName}
                    submitting={approvingRequestId === approveTarget.id}
                    error={error}
                    onClose={() => { if (approvingRequestId) return; setApproveTarget(null); setError(null); }}
                    onConfirm={(shiftNextPeriod) => handleApproveRequest(approveTarget.id, shiftNextPeriod)}
                />
            )}

            <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
        </div>
    );
}

