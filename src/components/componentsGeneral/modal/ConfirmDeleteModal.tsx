// Модалка подтверждения удаления - тонкая обёртка над ConfirmActionModal
import {useTranslation} from "react-i18next";
import {AlertTriangle} from "lucide-react";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

// TODO: Исправить предыдущие места, где использовалась ConfirmDeleteModal (сделала её оберткой)

interface ConfirmDeleteModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    loading?: boolean;
    error?: string | null;
}

export function ConfirmDeleteModal({
                                       open,
                                       onClose,
                                       onConfirm,
                                       title,
                                       message,
                                       loading = false,
                                       error = null,
                                   }: ConfirmDeleteModalProps) {
    const {t} = useTranslation();

    return (
        <ConfirmActionModal
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message}
            loading={loading}
            error={error}
            variant="danger"
            icon={AlertTriangle}
            confirmLabel={t("general.delete")}
            loadingLabel={t("general.deleting")}
        />
    );
}