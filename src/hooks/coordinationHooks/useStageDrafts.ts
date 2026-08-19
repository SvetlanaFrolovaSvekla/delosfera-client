import {useEffect, useState} from "react";
import {FIXED_KIND_ORDER, FIXED_STAGE_ORG_UNITS, MAX_STAGES} from "@/constants/coordinationParams.ts";
import type {ApproverOption} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";

import {ApprovalStageKind} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    coordinationApproverService
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverService.ts";


import type {
    CoordinationStageKind
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";
import {useAuth} from "@/context/AuthContext.ts";

// crypto.randomUUID() доступен только в secure context (https или localhost).
// На http-проде (edo-test.keremetbank.kg) его нет — используем фолбэк.
function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export interface StageDraft {
    localId: string;
    kind: ApprovalStageKind; // вид этапа согласования
    orgUnitId?: number; // из какого СП согласующий фиксированного этапа
    approverUserId: number | null;
    approverName: string | null;
}

// Соответствие строковых kind из справочника (backend) значениям enum ApprovalStageKind (frontend)
const KIND_STRING_TO_ENUM: Record<CoordinationStageKind, ApprovalStageKind> = {
    legal: ApprovalStageKind.Legal,
    risk_management: ApprovalStageKind.RiskManagement,
    compliance: ApprovalStageKind.Compliance,
    methodology: ApprovalStageKind.Methodology,
};

// Создание фиксированных этапов
function createInitialStages(): StageDraft[] {
    return FIXED_KIND_ORDER.map((kind) => ({
        localId: generateUUID(),
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
    const {user: currentUser} = useAuth();

    // Подтягиваем дефолтных согласующих из справочника "Обязательные участники
    // процесса согласования" и заполняем ими фиксированные этапы, если пользователь
    // ещё не выбрал согласующего вручную
    useEffect(() => {
        let cancelled = false;

        coordinationApproverService
            .getAll()
            .then((defaults) => {
                if (cancelled) return;

                setStages((prev) =>
                    prev.map((stage) => {
                        if (stage.approverUserId !== null) return stage; // пользователь уже выбрал вручную

                        const enumKind = stage.kind;
                        const defaultEntry = defaults.find((d) => KIND_STRING_TO_ENUM[d.kind] === enumKind);

                        if (!defaultEntry?.approverUserId) return stage;

                        // Инициатор не может согласовывать сам себя — если дефолт совпадает
                        // с текущим пользователем, оставляем этап пустым, пусть выберет вручную
                        if (defaultEntry.approverUserId === currentUser?.id) return stage;

                        return {
                            ...stage,
                            approverUserId: defaultEntry.approverUserId,
                            approverName: defaultEntry.approverName,
                        };
                    }),
                );
            })
            .catch(() => {
                // Не удалось подтянуть дефолты — не критично, просто оставляем поля пустыми,
                // пользователь выберет согласующих вручную как раньше
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    const addCustomStage = () => {
        setStages((prev) => {
            if (prev.length >= MAX_STAGES) return prev;
            return [
                ...prev,
                {
                    localId: generateUUID(),
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