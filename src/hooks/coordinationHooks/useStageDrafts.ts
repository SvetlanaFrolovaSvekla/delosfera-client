import {useEffect, useState} from "react";
import {MAX_STAGES, CUSTOM_STAGE_LABEL} from "@/constants/coordinationParams.ts";
import type {ApproverOption} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";

import {
    coordinationApproverService
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverService.ts";
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
    /** Id записи справочника обязательных этапов (dictionaries/coordination-users) - null для
     * произвольного (Custom) этапа, добавленного инициатором вручную. */
    coordinationStageId: number | null;
    title: string; // название этапа для отображения на карточке
    orgUnitId?: number; // из какого СП согласующий фиксированного этапа (только для обязательных)
    approverUserId: number | null;
    approverName: string | null;
}

export function useStageDrafts() {
    const [stages, setStages] = useState<StageDraft[]>([]);
    // Пока справочник обязательных этапов не загружен - список этапов рисовать рано
    // (иначе на долю секунды показался бы пустой маршрут, а потом форма запуска согласования
    // "прыгнула" бы, добавив обязательные этапы).
    const [catalogLoading, setCatalogLoading] = useState(true);
    // Этап, для которого открыта VndSelectApproverModal (выбор согласующего)
    const [pickerStageId, setPickerStageId] = useState<string | null>(null);
    const {user: currentUser} = useAuth();

    // Строим начальный список этапов из справочника "Обязательные этапы процесса
    // согласования" - название/СП/согласующий по умолчанию берутся из него целиком.
    useEffect(() => {
        let cancelled = false;

        coordinationApproverService
            .getAll()
            .then((defaults) => {
                if (cancelled) return;

                const sorted = [...defaults].sort((a, b) => a.order - b.order);

                setStages(
                    sorted.map((d) => {
                        // Инициатор не может согласовывать сам себя — если дефолт совпадает
                        // с текущим пользователем, оставляем этап пустым, пусть выберет вручную
                        const useDefault = d.approverUserId != null && d.approverUserId !== currentUser?.id;

                        return {
                            localId: generateUUID(),
                            coordinationStageId: d.id,
                            title: d.title,
                            orgUnitId: d.orgUnitId,
                            approverUserId: useDefault ? d.approverUserId : null,
                            approverName: useDefault ? d.approverName : null,
                        };
                    }),
                );
            })
            .catch(() => {
                // Не удалось подтянуть справочник — не критично для UI, но запустить
                // согласование без обязательных этапов сервер всё равно не даст (см.
                // BuildAndValidateStagesAsync), так что оставляем список пустым.
                if (!cancelled) setStages([]);
            })
            .finally(() => {
                if (!cancelled) setCatalogLoading(false);
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
                    coordinationStageId: null,
                    title: CUSTOM_STAGE_LABEL,
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
    const allApproversSelected = stages.length > 0 && stages.every((s) => s.approverUserId !== null);

    return {
        stages,
        setStages,
        catalogLoading,
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
