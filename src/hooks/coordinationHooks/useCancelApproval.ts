// Отзыв согласования (инициатором или главным редактором - см.
// PermissionCode.CancelAnyVndApproval) - состояние модалки подтверждения и сам вызов отзыва.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {toast} from "@/service/toastService.ts";

export function useCancelApproval(vndId: number, onCancelled?: () => void) {
    const {t} = useTranslation();
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await coordinationService.cancel(vndId);
            toast.success(t("openVndPage.coordinationTab.cancelledToastTitle"), t("openVndPage.coordinationTab.cancelledToastDescription"));
            setCancelModalOpen(false);
            onCancelled?.();
        } catch (err) {
            toast.error(t("openVndPage.coordinationTab.cancelErrorTitle"), err instanceof Error ? err.message : undefined);
        } finally {
            setCancelling(false);
        }
    };

    return {
        cancelModalOpen,
        openCancelModal: () => setCancelModalOpen(true),
        closeCancelModal: () => setCancelModalOpen(false),
        cancelling,
        handleCancel,
    };
}

export type UseCancelApprovalReturn = ReturnType<typeof useCancelApproval>;
