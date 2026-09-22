// Три модалки, общие для обоих видов (согласующего и инициатора) таба "Ход согласования" -
// подтверждение отзыва согласования, выбор нового согласующего и подтверждение его удаления.
// Раньше были продублированы в обеих ветках VndCoordinationTab дословно.
import {AlertTriangle} from "lucide-react";
import {useTranslation} from "react-i18next";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {
    VndSelectApproverModal, type ApproverOption
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";
import type {ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

interface VndCoordinationSharedModalsProps {
    cancelModalOpen: boolean;
    onCancelModalClose: () => void;
    onConfirmCancel: () => void;
    cancelling: boolean;

    addApproverModalOpen: boolean;
    activeApproverUserIds: Set<number>;
    onAddApproverModalClose: () => void;
    onSelectApprover: (approver: ApproverOption) => void;

    removingStage: ApprovalStageResponse | null;
    onRemovingStageClose: () => void;
    onConfirmRemoveApprover: () => void;
    removingApprover: boolean;
}

export function VndCoordinationSharedModals({
    cancelModalOpen, onCancelModalClose, onConfirmCancel, cancelling,
    addApproverModalOpen, activeApproverUserIds, onAddApproverModalClose, onSelectApprover,
    removingStage, onRemovingStageClose, onConfirmRemoveApprover, removingApprover,
}: VndCoordinationSharedModalsProps) {
    const {t} = useTranslation();

    return (
        <>
            <ConfirmActionModal
                open={cancelModalOpen}
                onClose={onCancelModalClose}
                onConfirm={onConfirmCancel}
                title={t("openVndPage.coordinationTab.cancelConfirmTitle")}
                message={t("openVndPage.coordinationTab.cancelConfirmMessage")}
                confirmLabel={t("openVndPage.coordinationTab.cancelButton")}
                loadingLabel={t("openVndPage.coordinationTab.cancelLoadingLabel")}
                loading={cancelling}
                variant="danger"
                icon={AlertTriangle}
            />

            {addApproverModalOpen && (
                <VndSelectApproverModal
                    excludedUserIds={activeApproverUserIds}
                    onClose={onAddApproverModalClose}
                    onSelect={onSelectApprover}
                />
            )}
            <ConfirmActionModal
                open={!!removingStage}
                onClose={onRemovingStageClose}
                onConfirm={onConfirmRemoveApprover}
                title="Убрать согласующего?"
                message={removingStage ? `${removingStage.approverName} будет убран из маршрута согласования, его задача снимется. Действие необратимо.` : ""}
                confirmLabel="Убрать"
                loadingLabel="Убираем…"
                loading={removingApprover}
                variant="danger"
                icon={AlertTriangle}
            />
        </>
    );
}
