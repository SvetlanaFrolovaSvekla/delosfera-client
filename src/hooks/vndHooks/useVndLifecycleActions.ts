// Архивация и консолидация (публикация) ВНД: состояние модалок и вызовы сервисов
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {ConsolidateRequisites} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/ConsolidateVndModal.tsx";
import type {CancelVndFields} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/CancelVndModal.tsx";

export function useVndLifecycleActions(vnd: VndResponse | null | undefined, onChanged: () => void) {
    const {t} = useTranslation();

    const [consolidateOpen, setConsolidateOpen] = useState(false);
    const [consolidating, setConsolidating] = useState(false);
    const [consolidateError, setConsolidateError] = useState<string | null>(null);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const closeConsolidate = () => {
        if (consolidating) return;
        setConsolidateOpen(false);
        setConsolidateError(null);
    };
    const closeCancel = () => {
        if (canceling) return;
        setCancelOpen(false);
        setCancelError(null);
    };

    const consolidate = async (hadChanges: boolean, requisites: ConsolidateRequisites) => {
        if (!vnd) return;
        setConsolidating(true);
        setConsolidateError(null);
        try {
            await actualizationService.publish(vnd.id, {hadChanges, ...requisites});
            setConsolidateOpen(false);
            toast.success(t("openVndPage.consolidatedToastTitle"), t("openVndPage.consolidatedToastDescription"));
            onChanged();
        } catch (err) {
            setConsolidateError(err instanceof Error ? err.message : t("openVndPage.consolidateError"));
        } finally {
            setConsolidating(false);
        }
    };

    // Если ВНД сейчас "На согласовании" — согласование отзывается автоматически на бэке
    const cancel = async (fields: CancelVndFields) => {
        if (!vnd) return;
        setCanceling(true);
        setCancelError(null);
        try {
            await vndService.cancel(vnd.id, {
                cancelCode: fields.cancelCode,
                cancelDate: fields.cancelDate,
                cancelReason: fields.cancelReason || null,
            });
            setCancelOpen(false);
            toast.success(t("openVndPage.archivedToastTitle"), t("openVndPage.archivedToastDescription", {name: vnd.name}));
            onChanged();
        } catch (err) {
            setCancelError(err instanceof Error ? err.message : t("openVndPage.archiveError"));
        } finally {
            setCanceling(false);
        }
    };

    return {
        consolidate: {
            open: consolidateOpen, busy: consolidating, error: consolidateError,
            openModal: () => setConsolidateOpen(true), close: closeConsolidate, run: consolidate,
        },
        cancel: {
            open: cancelOpen, busy: canceling, error: cancelError,
            openModal: () => setCancelOpen(true), close: closeCancel, run: cancel,
        },
    };
}
