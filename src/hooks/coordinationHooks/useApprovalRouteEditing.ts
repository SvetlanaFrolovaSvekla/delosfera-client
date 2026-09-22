// Главный редактор добавляет/убирает согласующего в уже запущенном процессе согласования (см.
// PermissionCode.EditAnyVndApprovalRoute) - состояние обеих модалок и сами вызовы.
import {useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {toast} from "@/service/toastService.ts";
import type {ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {
    ApproverOption
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";

export function useApprovalRouteEditing(vndId: number, reload: () => Promise<void>) {
    const [addApproverModalOpen, setAddApproverModalOpen] = useState(false);
    // Этап, который сейчас предлагается убрать (открывает модалку подтверждения) - null, если
    // модалка закрыта.
    const [removingStage, setRemovingStage] = useState<ApprovalStageResponse | null>(null);
    const [removingApprover, setRemovingApprover] = useState(false);

    // Обязательный (не custom) этап, для которого сейчас открыта модалка выбора нового
    // согласующего (замена вместо удаления - см. StageCardView.onReplaceApprover) - null, если
    // модалка закрыта.
    const [replacingStage, setReplacingStage] = useState<ApprovalStageResponse | null>(null);

    // Модалка выбора (VndSelectApproverModal) закрывается сама сразу после выбора - не ждёт
    // ответа сервера, поэтому здесь нет отдельного состояния загрузки.
    const handleAddApprover = async (approver: ApproverOption) => {
        try {
            await coordinationService.addApprover(vndId, {approverUserId: approver.id});
            await reload();
            toast.success("Согласующий добавлен", `${approver.fullName} добавлен в маршрут согласования`);
        } catch (err) {
            toast.error("Не удалось добавить согласующего", err instanceof Error ? err.message : undefined);
        }
    };

    // Клик по кнопке "Убрать" на карточке этапа - открывает модалку подтверждения. Принимает
    // список этапов текущего процесса от вызывающей стороны (а не хранит process целиком) -
    // это позволяет вызывать этот хук безусловно в VndCoordinationTab ещё до того, как процесс
    // согласования гарантированно загружен (см. Rules of Hooks).
    const handleRequestRemoveApprover = (stageId: number, stages: ApprovalStageResponse[]) => {
        const stage = stages.find((s) => s.id === stageId);
        if (stage) setRemovingStage(stage);
    };

    // Этап помечается недействующим, задача с него снимается (см.
    // VndApprovalService.RemoveApproverAsync).
    const handleConfirmRemoveApprover = async () => {
        if (!removingStage) return;
        setRemovingApprover(true);
        try {
            await coordinationService.removeApprover(vndId, removingStage.id, {});
            await reload();
            toast.success("Согласующий убран", `${removingStage.approverName} убран из маршрута согласования`);
            setRemovingStage(null);
        } catch (err) {
            toast.error("Не удалось убрать согласующего", err instanceof Error ? err.message : undefined);
        } finally {
            setRemovingApprover(false);
        }
    };

    // Клик по кнопке "Заменить" на карточке обязательного этапа - открывает модалку выбора
    // нового согласующего (тот же приём, что и handleRequestRemoveApprover выше).
    const handleRequestReplaceApprover = (stageId: number, stages: ApprovalStageResponse[]) => {
        const stage = stages.find((s) => s.id === stageId);
        if (stage) setReplacingStage(stage);
    };

    // Модалка выбора закрывается сама сразу после выбора - см. комментарий у handleAddApprover.
    const handleReplaceApprover = async (approver: ApproverOption) => {
        if (!replacingStage) return;
        try {
            await coordinationService.replaceApprover(vndId, replacingStage.id, {newApproverUserId: approver.id});
            await reload();
            toast.success("Согласующий заменён", `${approver.fullName} назначен(а) на этап «${replacingStage.title}»`);
        } catch (err) {
            toast.error("Не удалось заменить согласующего", err instanceof Error ? err.message : undefined);
        } finally {
            setReplacingStage(null);
        }
    };

    return {
        addApproverModalOpen,
        openAddApproverModal: () => setAddApproverModalOpen(true),
        closeAddApproverModal: () => setAddApproverModalOpen(false),
        removingStage,
        removingApprover,
        handleAddApprover,
        handleRequestRemoveApprover,
        handleConfirmRemoveApprover,
        closeRemoveApproverModal: () => setRemovingStage(null),
        replacingStage,
        handleRequestReplaceApprover,
        handleReplaceApprover,
        closeReplaceApproverModal: () => setReplacingStage(null),
    };
}

export type UseApprovalRouteEditingReturn = ReturnType<typeof useApprovalRouteEditing>;
