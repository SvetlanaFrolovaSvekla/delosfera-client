// Модалки актуализации, открываемые прямо со вкладки "Редакции" (без перехода на "Актуализация")
import {useTranslation} from "react-i18next";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {EditionsActualization} from "@/hooks/vndHooks/useEditionsActualization.ts";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {
    StartActualizationModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/StartActualizationModal.tsx";
import {
    RequestActualizationAccessModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/RequestActualizationAccessModal.tsx";
import {
    PerformActualizationModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsActualizationTab/PerformActualizationModal.tsx";
import {
    ActualizationSettingsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/editionsActualizationModals/ActualizationSettingsModal.tsx";

interface EditionsActualizationModalsProps {
    vnd: VndResponse;
    actualization: EditionsActualization;
    currentUserId: number | undefined;
}

export function EditionsActualizationModals({vnd, actualization, currentUserId}: EditionsActualizationModalsProps) {
    const {t} = useTranslation();
    const {flow, discard} = actualization;

    // Закрыть модалку потока, если запрос не идёт, и сбросить ошибку
    const closeWith = (setOpen: (open: boolean) => void) => () => {
        if (flow.submitting) return;
        setOpen(false);
        flow.setError(null);
    };

    return (
        <>
            {/* Начать актуализацию (для прав ActualizeAnyVnd...) */}
            {flow.startOpen && currentUserId !== undefined && (
                <StartActualizationModal
                    canWithoutApproval={flow.canWithoutApproval}
                    canWithApproval={flow.canWithApproval}
                    submitting={flow.submitting}
                    error={flow.error}
                    currentUserId={currentUserId}
                    onClose={closeWith(flow.setStartOpen)}
                    onConfirm={flow.handleStart}
                />
            )}

            {/* Запросить доступ к актуализации (для прав ActualizeVnd...ByRequest) */}
            {flow.requestOpen && (
                <RequestActualizationAccessModal
                    submitting={flow.submitting}
                    error={flow.error}
                    onClose={closeWith(flow.setRequestOpen)}
                    onConfirm={flow.handleRequestAccess}
                />
            )}

            {/* Выполнить актуализацию - только для пути "напрямую" (needsPerform); путь "по
                заявке" стартует автоматически, без модалки (см. useEditionsActualization). */}
            {flow.performOpen && flow.needsPerform && (
                <PerformActualizationModal
                    mode={flow.performMode}
                    decidedShiftNextPeriod={flow.myAccessState.kind === "approved" ? flow.myAccessState.shiftNextPeriod : undefined}
                    submitting={flow.submitting}
                    error={flow.error}
                    onClose={closeWith(flow.setPerformOpen)}
                    onConfirm={flow.handlePerformConfirm}
                />
            )}

            {/* Подтверждение удаления черновика редакции при возврате "Актуализации без
                изменений" обратно на включено (см. togglePlannedNoChanges). */}
            <ConfirmActionModal
                open={discard.open}
                onClose={discard.close}
                onConfirm={discard.confirm}
                title={t("openVndPage.editionsTab.discardDraftConfirmTitle")}
                message={t("openVndPage.editionsTab.discardDraftConfirmMessage")}
                confirmLabel={t("openVndPage.editionsTab.discardDraftConfirmLabel")}
                loadingLabel={t("openVndPage.editionsTab.discardDraftLoadingLabel")}
                loading={discard.busy}
                error={discard.error}
                variant="danger"
            />

            {/* Настройки актуализации (сдвиг срока/"без изменений") - открывается ссылкой под
                основной кнопкой сайдбара. */}
            {actualization.settingsOpen && (
                <ActualizationSettingsModal
                    plannedNoChanges={vnd.actualizationPlannedNoChanges}
                    shiftNextPeriod={vnd.actualizationShiftNextPeriod}
                    submitting={flow.submitting}
                    onTogglePlannedNoChanges={actualization.togglePlannedNoChanges}
                    onClose={() => actualization.setSettingsOpen(false)}
                />
            )}
        </>
    );
}
