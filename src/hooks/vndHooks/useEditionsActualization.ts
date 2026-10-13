// Актуализация прямо со вкладки "Редакции": общий поток useVndActualizationFlow +
// действия, которые раньше жили только на вкладке "Актуализация"
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useVndActualizationFlow} from "@/hooks/vndHooks/useVndActualizationFlow.ts";

export function useEditionsActualization(
    vnd: VndResponse,
    lastByNumber: VndRedactionResponse | undefined,
    refetch: () => void,
    onVndChanged?: () => void,
) {
    const {t} = useTranslation();
    const flow = useVndActualizationFlow(vnd, () => onVndChanged?.());
    const {needsConfirmStartAfterRequest, handlePerformConfirm, handleUpdatePerformedSettings} = flow;

    // Заявка одобрена (needsConfirmStartAfterRequest) - цикл стартует автоматически, без
    // отдельного модального шага, "с изменениями" по умолчанию (plannedNoChanges: false) -
    // переключить можно в модалке "Настройки актуализации". Ref - чтобы не вызвать
    // confirmStart повторно, пока первый запрос ещё не отработал (needsConfirmStartAfterRequest
    // остаётся true до ответа сервера, а не только на один рендер).
    const autoConfirmStartFiredRef = useRef(false);
    useEffect(() => {
        if (needsConfirmStartAfterRequest && !autoConfirmStartFiredRef.current) {
            autoConfirmStartFiredRef.current = true;
            void handlePerformConfirm({shiftNextPeriod: false, plannedNoChanges: false});
        }
    }, [needsConfirmStartAfterRequest, handlePerformConfirm]);

    // "Без изменений" без согласования - подтвердить прямо здесь (кнопка сайдбара
    // "confirmNoChanges"), та же логика, что и handleConfirmNoChanges в VndActualizationTab.tsx.
    const [confirmingNoChanges, setConfirmingNoChanges] = useState(false);
    const confirmNoChanges = async () => {
        setConfirmingNoChanges(true);
        try {
            await actualizationService.confirmNoChanges(vnd.id);
            toast.success(
                t("openVndPage.editionsTab.confirmNoChangesSuccessTitle"),
                t("openVndPage.editionsTab.confirmNoChangesSuccessDescription")
            );
            onVndChanged?.();
        } catch (err) {
            toast.error(t("openVndPage.editionsTab.confirmNoChangesErrorTitle"), err instanceof Error ? err.message : undefined);
        } finally {
            setConfirmingNoChanges(false);
        }
    };

    // Модалка "Настройки актуализации" - открывается ссылкой под основной кнопкой сайдбара
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Возврат "Актуализации без изменений" обратно на включено, когда в рамках текущего цикла
    // уже загружена редакция-черновик (и, возможно, файлы/ТИД к ней) - это необратимо удалит
    // черновик, поэтому сначала спрашиваем подтверждение. Нет черновика - переключаем сразу.
    const [discardOpen, setDiscardOpen] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [discardError, setDiscardError] = useState<string | null>(null);

    const togglePlannedNoChanges = (next: boolean) => {
        const hasDraft = lastByNumber?.approvalStatus === "Draft" && lastByNumber.number > 1;
        if (next && hasDraft) {
            setDiscardError(null);
            setDiscardOpen(true);
            return;
        }
        void handleUpdatePerformedSettings({
            shiftNextPeriod: vnd.actualizationShiftNextPeriod,
            plannedNoChanges: next,
        });
    };

    const confirmDiscard = async () => {
        setDiscarding(true);
        setDiscardError(null);
        try {
            await actualizationService.discardDraft(vnd.id);
            setDiscardOpen(false);
            refetch();
            onVndChanged?.();
            toast.success(
                t("openVndPage.editionsTab.discardDraftSuccessTitle"),
                t("openVndPage.editionsTab.discardDraftSuccessDescription")
            );
        } catch (err) {
            setDiscardError(err instanceof Error ? err.message : t("openVndPage.editionsTab.discardDraftErrorDefault"));
        } finally {
            setDiscarding(false);
        }
    };

    const closeDiscard = () => {
        if (discarding) return;
        setDiscardOpen(false);
        setDiscardError(null);
    };

    return {
        flow,
        confirmingNoChanges, confirmNoChanges,
        settingsOpen, setSettingsOpen, togglePlannedNoChanges,
        discard: {open: discardOpen, busy: discarding, error: discardError, close: closeDiscard, confirm: confirmDiscard},
    };
}

export type EditionsActualization = ReturnType<typeof useEditionsActualization>;
