import {useState} from "react";
import {ApprovalStageKind} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {FIXED_KIND_ORDER, FIXED_STAGE_ORG_UNITS, MAX_STAGES} from "@/constants/coordinationParams.ts";
import type {ApproverOption} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";

export interface StageDraft {
    localId: string;
    kind: ApprovalStageKind; // вид этапа согласования
    orgUnitId?: number; // из какого СП согласующий фиксированного этапа
    approverUserId: number | null;
    approverName: string | null;
}

// Создание фиксированных этапов
function createInitialStages(): StageDraft[] {
    return FIXED_KIND_ORDER.map((kind) => ({
        localId: crypto.randomUUID(),
        kind,
        orgUnitId: FIXED_STAGE_ORG_UNITS[kind],
        approverUserId: null,
        approverName: null,
    }));
}

export function useStageDrafts() {
    const [stages, setStages] = useState<StageDraft[]>(createInitialStages);
    // Этап, для которого открыта VndSelectApproverModal (выбор согласующего)
    const [pickerStageId, setPickerStageId] = useState<string | null>(null);

    const addCustomStage = () => {
        setStages((prev) => {
            if (prev.length >= MAX_STAGES) return prev;
            return [
                ...prev,
                {
                    localId: crypto.randomUUID(),
                    kind: ApprovalStageKind.Custom,
                    approverUserId: null,
                    approverName: null,
                },
            ];
        });
    };

    const removeCustomStage = (localId: string) => {
        setStages((prev) => prev.filter((s) => s.localId !== localId));
    };

    const setStageApprover = (localId: string, user: ApproverOption) => {
        setStages((prev) =>
            prev.map((s) =>
                s.localId === localId ? {...s, approverUserId: user.id, approverName: user.fullName} : s,
            ),
        );
    };

    const selectedUserIds = new Set(
        stages.map((s) => s.approverUserId).filter((id): id is number => id !== null),
    );

    const activePickerStage = stages.find((s) => s.localId === pickerStageId) ?? null;
    const allApproversSelected = stages.every((s) => s.approverUserId !== null);

    return {
        stages,
        setStages,
        addCustomStage,
        removeCustomStage,
        setStageApprover,
        selectedUserIds,
        allApproversSelected,
        pickerStageId,
        setPickerStageId,
        activePickerStage,
    };
}

export type UseStageDraftsReturn = ReturnType<typeof useStageDrafts>;