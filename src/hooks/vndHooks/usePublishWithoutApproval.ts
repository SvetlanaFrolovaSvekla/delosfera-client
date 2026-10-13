// "Сделать актуальной редакцией без согласования" (только для прав ...WithoutApproval)
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {vndService} from "@/service/vndService/vndService.ts";

export function usePublishWithoutApproval(vndId: number, onPublished: () => void) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (redactionId: number) => {
        setBusy(true);
        setError(null);
        try {
            await vndService.publishRedactionWithoutApproval(vndId, redactionId);
            setOpen(false);
            toast.success(
                t("openVndPage.editionsTab.publishWithoutApprovalSuccessTitle"),
                t("openVndPage.editionsTab.publishWithoutApprovalSuccessDescription")
            );
            onPublished();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("openVndPage.editionsTab.publishWithoutApprovalErrorDefault"));
        } finally {
            setBusy(false);
        }
    };

    const close = () => {
        if (busy) return;
        setOpen(false);
        setError(null);
    };

    return {open, openModal: () => setOpen(true), busy, error, close, run};
}

export type PublishWithoutApprovalFlow = ReturnType<typeof usePublishWithoutApproval>;
