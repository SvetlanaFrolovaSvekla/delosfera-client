import {useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {toast} from "@/service/toastService.ts";
import type {ApprovalProcessResponse, StartApprovalRequest} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {StageDraft} from "./useStageDrafts";

interface UseStartApprovalParams {
    vndId: number;
    stages: StageDraft[];
    allApproversSelected: boolean;
    normsValid: boolean;
    primaryHours: number | "";
    repeatHours: number | "";
    finalHoldHours: number | "";
    onStarted: (process: ApprovalProcessResponse) => void;
}

export function useStartApproval({
                                     vndId,
                                     stages,
                                     allApproversSelected,
                                     normsValid,
                                     primaryHours,
                                     repeatHours,
                                     finalHoldHours,
                                     onStarted,
                                 }: UseStartApprovalParams) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = allApproversSelected && normsValid && !submitting && stages.length > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const request: StartApprovalRequest = {
                stages: stages.map((s) => ({
                    kind: s.kind,
                    approverUserId: s.approverUserId as number,
                })),
                primaryDeadlineHours: Number(primaryHours),
                repeatDeadlineHours: Number(repeatHours),
                finalHoldDeadlineHours: Number(finalHoldHours),
            };
            const result = await coordinationService.start(vndId, request);

            // Тост переживёт закрытие модалки (onStarted обычно сразу её закрывает),
            // поэтому уведомление об успехе — тут, а не завязано на видимость самой модалки
            toast.success("Согласование запущено!", "Маршрут и нормативы сроков сохранены.");

            onStarted(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось запустить согласование!");
        } finally {
            setSubmitting(false);
        }
    };

    return {submitting, error, canSubmit, handleSubmit};
}

export type UseStartApprovalReturn = ReturnType<typeof useStartApproval>;