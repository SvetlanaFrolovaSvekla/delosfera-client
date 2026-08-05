// Вкладка «Актуализация» на странице ВНД — запуск цикла актуализации для
// действующего документа (напрямую или по запросу к главному редактору),
// и статус самого цикла, пока он идёт.
import {useState} from "react";
import {ClipboardList, RefreshCw, Send} from "lucide-react";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions.ts";
import {toast} from "@/service/toastService.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {StartActualizationModal} from "./componentsActualizationTab/StartActualizationModal.tsx";
import {
    RequestActualizationAccessModal,
} from "./componentsActualizationTab/RequestActualizationAccessModal.tsx";

interface VndActualizationTabProps {
    vnd: VndResponse;
    onVndChanged: () => void;
    onGoToEditions: () => void;
}

export function VndActualizationTab({vnd, onVndChanged, onGoToEditions}: VndActualizationTabProps) {
    const {hasPermission} = useAuth();

    const canWithoutApproval = hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);
    const canWithApproval = hasPermission(PermissionCode.ActualizeAnyVndWithApproval);
    const canDirectly = canWithoutApproval || canWithApproval;

    const canRequestWithApproval = hasPermission(PermissionCode.ActualizeVndWithApprovalByRequest);
    const canRequestWithoutApproval = hasPermission(PermissionCode.ActualizeVndWithoutApprovalByRequest);
    const canByRequest = canRequestWithApproval || canRequestWithoutApproval;

    const [startOpen, setStartOpen] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async (data: {requiresApproval: boolean; shiftNextPeriod: boolean}) => {
        setSubmitting(true);
        setError(null);
        try {
            await actualizationService.start(vnd.id, {
                shiftNextPeriod: data.shiftNextPeriod,
                requiresApproval: data.requiresApproval,
            });
            setStartOpen(false);
            toast.success("Актуализация начата", "Загрузите новую редакцию во вкладке «Редакции»");
            onVndChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось начать актуализацию");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestAccess = async (data: {requiresApproval: boolean}) => {
        setSubmitting(true);
        setError(null);
        try {
            await actualizationService.requestAccess(vnd.id, {requiresApproval: data.requiresApproval});
            setRequestOpen(false);
            toast.success("Заявка отправлена", "Дождитесь решения главного редактора ВНД");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmStart = async () => {
        setConfirming(true);
        try {
            await actualizationService.confirmStart(vnd.id, {shiftNextPeriod: true});
            toast.success("Актуализация начата", "Загрузите новую редакцию во вкладке «Редакции»");
            onVndChanged();
        } catch (err) {
            toast.error(
                "Не удалось подтвердить старт",
                err instanceof Error ? err.message : "Возможно, одобренной заявки ещё нет",
            );
        } finally {
            setConfirming(false);
        }
    };

    if (vnd.status === "onact") {
        return (
            <div className="py-4">
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#eef0f3] text-[#5b6472]">
                            <RefreshCw size={15} strokeWidth={1.8}/>
                        </span>
                        <span className="text-[13.5px] font-bold text-[#1c2740]">
                            Документ находится в процессе актуализации
                        </span>
                    </div>
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
                </div>
            </div>
        );
    }

    if (vnd.status === "consol") {
        return (
            <div className="py-4">
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    Редакция согласована и ждёт консолидации — используйте кнопку «Консолидировать
                    согласованную версию» в шапке документа.
                </div>
            </div>
        );
    }

    if (vnd.status !== "active") {
        return (
            <div className="py-4">
                <div className="rounded-[14px] border border-[#e9edf3] bg-white px-5 py-6 text-center text-[13px] text-[#8b97ab]">
                    Актуализация доступна только для действующего документа.
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
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

            {canDirectly && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-5 py-4">
                    <div className="mb-1 text-[13.5px] font-bold text-[#1c2740]">Начать актуализацию</div>
                    <p className="mb-3 text-[13px] leading-[1.6] text-[#55617a]">
                        У вас есть право взять этот документ в актуализацию напрямую.
                    </p>
                    <button
                        type="button"
                        onClick={() => setStartOpen(true)}
                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
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
                        Запросите доступ к актуализации у главного редактора ВНД. После одобрения
                        заявки подтвердите старт кнопкой ниже.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setRequestOpen(true)}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#4e57d6] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            <Send size={14} strokeWidth={1.8}/>
                            Запросить доступ
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmStart}
                            disabled={confirming}
                            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50"
                        >
                            Подтвердить старт (после одобрения)
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
                    onClose={() => {
                        if (submitting) return;
                        setStartOpen(false);
                        setError(null);
                    }}
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
        </div>
    );
}
