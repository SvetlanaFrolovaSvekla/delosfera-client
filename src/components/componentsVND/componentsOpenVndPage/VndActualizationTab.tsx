// Вкладка «Актуализация» на странице ВНД — запуск цикла актуализации для
// действующего документа (напрямую или по запросу к главному редактору),
// шаг "Выполнить актуализацию", статус самого цикла, пока он идёт, и история
// всех прошлых актуализаций (кто и когда брал в актуализацию, кто выдавал доступ по заявке).
import {CheckCircle2, ClipboardList, Clock, History, Inbox, Loader2, RefreshCw, Send, XCircle} from "lucide-react";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate, formatDateTime} from "@/utils/dateUtils.ts";
import {StartActualizationModal} from "./componentsActualizationTab/StartActualizationModal.tsx";
import {
    RequestActualizationAccessModal,
} from "./componentsActualizationTab/RequestActualizationAccessModal.tsx";
import {
    ApproveActualizationRequestModal,
} from "./componentsActualizationTab/ApproveActualizationRequestModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {useVndActualizationFlow} from "@/hooks/vndHooks/useVndActualizationFlow.ts";
import {useVndActualizationHistory} from "@/hooks/vndHooks/useVndActualizationHistory.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {toast} from "@/service/toastService.ts";
import {useState} from "react";
import type {VndActualizationRecordResponse} from "@/service/vndService/vndServiceType.ts";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";

interface VndActualizationTabProps {
    vnd: VndResponse;
    onVndChanged: () => void;
    onGoToEditions: () => void;
    onGoToApproval: () => void;
}

export function VndActualizationTab({vnd, onVndChanged, onGoToEditions, onGoToApproval}: VndActualizationTabProps) {
    const {user} = useAuth();

    const {
        canDirectly, canByRequest,
        canWithoutApproval, canWithApproval,
        canRequestWithoutApproval, canRequestWithApproval,
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
            toast.success("Отсутствие изменений подтверждено", "Документ переведён в консолидацию");
            onVndChanged();
        } catch (err) {
            toast.error("Не удалось подтвердить", err instanceof Error ? err.message : undefined);
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
                                Актуализация начата — шаг «Выполнить актуализацию» ещё не пройден
                            </span>
                        </div>
                        <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                            {needsPerform
                                ? "Прежде чем работать с редакциями, укажите, нужно ли сдвинуть срок следующей актуализации и планируется ли актуализация без изменений документа — кнопка «Выполнить актуализацию» находится во вкладке «Редакции»."
                                : "Ответственный за актуализацию ещё не выполнил этот шаг — до этого загрузка новой редакции недоступна."}
                        </div>
                        {needsPerform && (
                            <div className="border-t border-[#eef2f7] px-5 py-[13px]">
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                >
                                    Перейти к редакциям
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
                            Документ находится в процессе актуализации
                        </span>
                        {vnd.actualizationPlannedNoChanges && (
                            <span className="ml-auto rounded-full bg-[#fdf6e8] px-[9px] py-[2px] text-[11px] font-semibold text-[#9a6408]">
                                Без изменений
                            </span>
                        )}
                    </div>

                    {vnd.actualizationPlannedNoChanges ? (
                        <>
                            <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                                Заявлено, что актуализация пройдёт без изменений документа — новая
                                редакция не потребуется. {vnd.actualizationRequiresApproval
                                ? "Отправьте существующую действующую редакцию на согласование во вкладке «Согласование», как есть, без загрузки нового файла. Новая редакция появится, только если согласующие попросят доработку."
                                : "Подтвердите отсутствие изменений — документ сразу перейдёт в статус «Консолидация», без согласования."}
                            </div>
                            <div className="border-t border-[#eef2f7] px-5 py-[13px] flex flex-wrap gap-2">
                                {vnd.actualizationRequiresApproval ? (
                                    <button
                                        type="button"
                                        onClick={onGoToApproval}
                                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                    >
                                        Перейти к согласованию
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleConfirmNoChanges}
                                        disabled={confirmingNoChanges}
                                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {confirmingNoChanges && <Loader2 size={14} className="animate-spin"/>}
                                        Подтвердить отсутствие изменений
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                                >
                                    Загрузить изменения всё же
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-5 py-4 text-[13px] leading-[1.6] text-[#55617a]">
                                Загрузите новую редакцию во вкладке «Редакции». Если актуализация требует
                                согласования — отправьте редакцию на согласование там же. После того как
                                документ окажется в статусе «Консолидация», подтвердите публикацию через
                                кнопку в шапке документа.
                            </div>
                            <div className="border-t border-[#eef2f7] px-5 py-[13px]">
                                <button
                                    type="button"
                                    onClick={onGoToEditions}
                                    className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                                >
                                    Перейти к редакциям
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
                    Редакция согласована и ждёт консолидации — используйте кнопку «Консолидировать
                    согласованную версию» в шапке документа.
                </div>

                <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
            </div>
        );
    }

    if (vnd.status !== "active") {
        return (
            <div className="px-4 sm:px-6 py-4">
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    Актуализация доступна только для действующего документа.
                </div>

                <ActualizationHistorySection history={history} historyLoading={historyLoading} requests={requests}/>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-5 sm:pb-4">
                <Loader label="Загрузка…" fullHeight={false}/>
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
                    <span className="text-[13.5px] font-bold text-[#1c2740]">Сроки актуализации</span>
                </div>
                <div className="grid grid-cols-2 gap-4 px-5 py-4 text-[13px]">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            Срок актуализации
                        </div>
                        <div className="mt-1 text-[#26324a]">{formatDate(vnd.dueActualizationDate)}</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            Последняя актуализация
                        </div>
                        <div className="mt-1 text-[#26324a]">
                            {formatDate(vnd.lastActualizationDate)}
                            {vnd.lastActualizationDate && (
                                <span className="ml-1.5 text-[#8b97ab]">
                                    ({vnd.lastActualizationHadChanges ? "с изменениями" : "без изменений"})
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
                                Заявки на доступ к актуализации этого документа
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
                                            {r.requiresApproval ? "с согласованием" : "без согласования"}
                                            {" · "}{r.shiftNextPeriod ? "сдвинуть срок" : "не сдвигать срок"}
                                            {" · "}{formatDate(r.createdAt)}
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
                                            Одобрить
                                        </button>
                                        <button
                                            type="button"
                                            disabled={approvingRequestId === r.id}
                                            onClick={() => handleRejectRequest(r.id)}
                                            className="cursor-pointer h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold text-[#c0392b] hover:bg-[#fdf1f1] disabled:opacity-50"
                                        >
                                            Отклонить
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
                        Отправлен запрос на актуализацию — дождитесь решения главного редактора ВНД.
                    </span>
                </div>
            )}

            {needsConfirmStartAfterRequest && myAccessState.kind === "approved" && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#cfe3d4] bg-[#eef8f0]">
                    <div className="flex items-center gap-2.5 px-5 py-4">
                        <CheckCircle2 size={16} strokeWidth={1.8} className="flex-none text-[#1c7a4d]"/>
                        <span className="text-[13px] text-[#1c7a4d]">
                            Заявка одобрена{myAccessState.decidedByName ? ` (${myAccessState.decidedByName})` : ""}.
                            Выполните актуализацию во вкладке «Редакции», чтобы начать цикл.
                        </span>
                    </div>
                    <div className="border-t border-[#cfe3d4] px-5 py-[13px]">
                        <button
                            type="button"
                            onClick={onGoToEditions}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#1c7a4d] px-3.5 text-[12.5px] font-semibold text-white hover:brightness-[1.06]"
                        >
                            <RefreshCw size={14} strokeWidth={1.8}/>
                            Перейти к редакциям
                        </button>
                    </div>
                </div>
            )}

            {canDirectly && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-5 py-4">
                    <div className="mb-1 text-[13.5px] font-bold text-[#1c2740]">Начать актуализацию</div>
                    <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                        У вас есть право взять этот документ в актуализацию напрямую.
                    </p>
                    <button
                        type="button"
                        onClick={() => setStartOpen(true)}
                        disabled={requestBlocked}
                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw size={14} strokeWidth={1.8}/>
                        Начать актуализацию
                    </button>
                </div>
            )}

            {!canDirectly && canByRequest && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-5 py-4">
                    <div className="mb-1 text-[13.5px] font-bold text-[#1c2740]">Доступ по запросу</div>
                    <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                        Запросите доступ к актуализации у главного редактора ВНД!
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setRequestOpen(true)}
                            disabled={requestBlocked}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send size={14} strokeWidth={1.8}/>
                            Запросить доступ
                        </button>
                    </div>
                </div>
            )}

            {!canDirectly && !canByRequest && (
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    У вас нет прав на актуализацию этого документа.
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
                    canWithoutApproval={canRequestWithoutApproval}
                    canWithApproval={canRequestWithApproval}
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
                    requestedShiftNextPeriod={approveTarget.shiftNextPeriod}
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

// ===== История актуализаций: кто когда брал, кто выдавал доступ =====

function ActualizationHistorySection({
                                          history, historyLoading, requests,
                                      }: {
    history: VndActualizationRecordResponse[];
    historyLoading: boolean;
    requests: VndActualizationRequestResponse[];
}) {
    // Заявки, которые дошли до решения - интересны только они (Pending уже виден выше как плашка)
    const decidedRequests = requests.filter((r) => r.status !== "pending");

    if (historyLoading) {
        return (
            <div className="mt-5">
                <Loader label="Загрузка истории актуализаций…" fullHeight={false}/>
            </div>
        );
    }

    if (history.length === 0 && decidedRequests.length === 0) return null;

    return (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
            {/* Циклы актуализации */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <History size={15} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">История актуализаций</span>
                </div>
                {history.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[12.5px] text-[#a3adbd]">
                        Актуализаций ещё не было
                    </div>
                ) : (
                    <div className="px-5 py-1.5">
                        {history.map((r) => (
                            <div key={r.id} className="flex gap-[11px] py-3 border-t border-[#f3f6f9] first:border-t-0">
                                <span
                                    className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${
                                        r.isCompleted ? "bg-[#1c7a4d]" : "bg-[#9a6408]"
                                    }`}
                                />
                                <div className="min-w-0 text-[12.5px] leading-[1.5] text-[#26324a]">
                                    <div>
                                        <span className="font-semibold">{r.responsibleUserName}</span> взял(а) в
                                        актуализацию {formatDateTime(r.startedAt)}
                                        {r.requiresApproval ? " (с согласованием)" : " (без согласования)"}
                                    </div>
                                    {!r.performedAt ? (
                                        <div className="mt-0.5 text-[#9a6408]">
                                            Шаг «Выполнить актуализацию» ещё не пройден
                                        </div>
                                    ) : (
                                        <div className="mt-0.5 text-[#8b97ab]">
                                            Выполнено {formatDateTime(r.performedAt)}
                                            {r.plannedNoChanges ? ", заявлено без изменений" : ""}
                                        </div>
                                    )}
                                    {r.isCompleted ? (
                                        <div className="mt-0.5 text-[#8b97ab]">
                                            Опубликовано {formatDateTime(r.publishedAt!)}
                                            {r.hadChanges !== null && (r.hadChanges ? " — с изменениями" : " — без изменений")}
                                        </div>
                                    ) : (
                                        <div className="mt-0.5 text-[#9a6408]">Цикл ещё не завершён</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Заявки на доступ к актуализации */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <Send size={15} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">Заявки на доступ к актуализации</span>
                </div>
                {decidedRequests.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[12.5px] text-[#a3adbd]">
                        Заявок ещё не было
                    </div>
                ) : (
                    <div className="px-5 py-1.5">
                        {decidedRequests.map((r) => (
                            <div key={r.id} className="flex gap-[11px] py-3 border-t border-[#f3f6f9] first:border-t-0">
                                {r.status === "approved" ? (
                                    <CheckCircle2 size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-[#1c7a4d]"/>
                                ) : (
                                    <XCircle size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-[#c0392b]"/>
                                )}
                                <div className="min-w-0 text-[12.5px] leading-[1.5] text-[#26324a]">
                                    <div>
                                        <span className="font-semibold">{r.requestedByName}</span> запросил(а)
                                        доступ {formatDateTime(r.createdAt)}
                                    </div>
                                    <div className={`mt-0.5 ${r.status === "approved" ? "text-[#1c7a4d]" : "text-[#c0392b]"}`}>
                                        {r.status === "approved" ? "Одобрено" : "Отклонено"}
                                        {r.decidedByName ? ` — ${r.decidedByName}` : ""}
                                        {r.decidedAt ? `, ${formatDateTime(r.decidedAt)}` : ""}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
