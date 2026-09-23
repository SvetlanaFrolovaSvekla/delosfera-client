// Таб "Редакции" открытой страницы ВНД
import {useMemo, useRef} from "react";
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {useTranslation} from "react-i18next";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";

import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useRedactionSelection} from "@/hooks/vndHooks/useRedactionSelection.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useAvailableHeight} from "@/hooks/vndHooks/useAvailableHeight.ts";
import {useVndActualizationFlow} from "@/hooks/vndHooks/useVndActualizationFlow.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {getRedactionDisplayStatus, isRedactionVisibleToRegularUser} from "@/utils/vndProcess/redactionStatus.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import {isVndPendingEffective} from "@/constants/vndStatus.ts";
import {buildRedactionFileName} from "@/utils/downloadFiles/fileNaming.ts";
import {
    getAvailableLanguages,
    getRedactionFileId,
    type RedactionLanguage
} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {
    VndUploadRedactionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndUploadRedactionModal.tsx";
import {
    VndUploadTidModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndUploadTidModal.tsx";
import {
    RedactionsSidebar, type RedactionsPrimaryActionVariant
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";
import {
    ActualizationSettingsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/ActualizationSettingsModal.tsx";
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
    RedactionLanguageTabsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionLanguageTabsPanel.tsx";
import {
    RedactionStatusBanner
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionStatusBanner.tsx";
import {
    RedactionTextView, type RedactionTextViewHandle
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {
    RedactionAttachmentsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionAttachmentsModal.tsx";
import {
    RedactionTidModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTidModal.tsx";
import {
    RedactionApprovalSheetModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionApprovalSheetModal.tsx";
import {
    RedactionDisagreementMatrixModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionDisagreementMatrixModal.tsx";
import {
    RedactionCompareModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionCompareModal.tsx";
import {
    VndStartApprovalModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndStartApprovalModal.tsx";
import {
    VndEditLastRevisionModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/VndEditLastRevisionModal.tsx";
import {
    RedactionContentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionContentsPanel.tsx";
import {
    RejectedApprovalDetailsModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RejectedApprovalDetailsModal.tsx";

import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Upload} from "lucide-react";

interface VndEditionsTabProps {
    vnd: VndResponse;
    onVndChanged?: () => void;
    /** Переключить страницу ВНД на таб «Ход согласования» — вызывается сразу после
     * успешного запуска согласования, чтобы пользователь увидел маршрут, а не
     * остался на «Редакциях», где дальше делать нечего. */
    onGoToApproval?: () => void;
}

// ВАЖНО: только права "...WithoutApproval" реально дают возможность обойти согласование.
// CreateVndWithApproval/ActualizeAnyVndWithApproval позволяют создавать/актуализировать ВНД,
// но по итогу всё равно требуют согласования - наличие только этих прав (например, у роли
// "Редактор ВНД") не должно давать кнопку "Сделать актуальной редакцией без согласования"
const PUBLISH_WITHOUT_APPROVAL_PERMISSIONS: number[] = [
    PermissionCode.CreateVndWithoutApproval,
    PermissionCode.ActualizeAnyVndWithoutApproval,
];

export function VndEditionsTab({vnd, onVndChanged, onGoToApproval}: VndEditionsTabProps) {
    const {t} = useTranslation();
    const {data: redactions, loading, error, refetch} = useVndRedactions(vnd.id);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [contentsOpen, setContentsOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const textViewRef = useRef<RedactionTextViewHandle>(null);

    const {sortedDesc, lastByNumber, current, selected: rawSelected, compareTarget: rawCompareTarget, uploadBlocked} =
        useRedactionSelection(redactions, selectedId);

    // "Рядовой" пользователь (не редактор ВНД) не должен видеть редакции, которые ещё не стали
    // официальным текстом документа - черновик/на согласовании/отклонена/на консолидации.
    // isVndEditor решает, применять ли фильтр вовсе.
    const isVndEditor = useIsVndEditor();
    const visibleRedactions = useMemo(
        () => isVndEditor
            ? sortedDesc
            : sortedDesc.filter((r) =>
                isRedactionVisibleToRegularUser(r, vnd.status, r.id === lastByNumber?.id, vnd.effectiveDate)
            ),
        [isVndEditor, sortedDesc, vnd.status, vnd.effectiveDate, lastByNumber]
    );

    // Если то, что выбрано по умолчанию (или явно) из ПОЛНОГО списка редакций - скрыто от
    // рядового пользователя, откатываемся на самую свежую из видимых ему редакций вместо того,
    // чтобы показать скрытое содержимое в центральной панели.
    const selected = isVndEditor || (rawSelected && visibleRedactions.some((r) => r.id === rawSelected.id))
        ? rawSelected
        : visibleRedactions[0];

    const compareTarget = useMemo(() => {
        if (isVndEditor) return rawCompareTarget;
        if (!selected) return undefined;
        const idx = visibleRedactions.findIndex((r) => r.id === selected.id);
        if (idx === -1) return undefined;
        return visibleRedactions[idx + 1] ?? visibleRedactions[idx - 1];
    }, [isVndEditor, rawCompareTarget, selected, visibleRedactions]);

    const hasStatusBannerAbove =
        vnd.status === "draft" || vnd.status === "consol" || isVndPendingEffective(vnd.status, vnd.effectiveDate);

    const {ref: containerRef, height: rawAvailableHeight} = useAvailableHeight();
    const availableHeight =
        rawAvailableHeight !== undefined && hasStatusBannerAbove
            ? rawAvailableHeight - 30
            : rawAvailableHeight;

    const download = useAsyncAction<number>();
    const submit = useAsyncAction<number>();

    const [approvalModalOpen, setApprovalModalOpen] = useState(false);

    const {hasPermission, user} = useAuth();
    const [editOpen, setEditOpen] = useState(false);

    // Зеркалит бэковый IsChiefEditor() (VndService/VndApprovalService) - см. те же права
    // в VndCoordinationTab.tsx/OpenVndPage.tsx. Только главному редактору доступна кнопка
    // "Сделать актуальной редакцией без согласования".
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    // Системная роль "Администратор" - id === 1 (см. комментарий у RoleResponse в
    // userServiceType.ts: 1 - Администратор, 2 - Рядовой пользователь, 3 - Редактор ВНД,
    // 4 - Главный редактор ВНД).
    const isAdmin = user?.roles.some((role) => role.id === 1) ?? false;

    // Право менять поле "Разработчик" сформированного ТИД (VndUploadTidModal) - доступно
    // главному редактору и администратору; остальные видят поле без выпадающего списка.
    const canChangeTidDeveloper = isChiefEditor || isAdmin;

    const [publishWithoutApprovalConfirmOpen, setPublishWithoutApprovalConfirmOpen] = useState(false);
    const [publishingWithoutApproval, setPublishingWithoutApproval] = useState(false);
    const [publishWithoutApprovalError, setPublishWithoutApprovalError] = useState<string | null>(null);

    // Именно право обойти согласование (см. комментарий у PUBLISH_WITHOUT_APPROVAL_PERMISSIONS
    // выше) - уже, чем isChiefEditor, чтобы кнопку/право "Сделать актуальной редакцией без
    // согласования" не получал тот, у кого есть только CreateVndWithApproval/
    // ActualizeAnyVndWithApproval (например, роль "Редактор ВНД").
    const canPublishWithoutApproval =
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    const publishWithoutApprovalRoleNames = useMemo(() => {
        if (!canPublishWithoutApproval || !user) return [];
        return user.roles
            .filter((role) =>
                role.permissionCodes.some((code) =>
                    PUBLISH_WITHOUT_APPROVAL_PERMISSIONS.includes(code)
                )
            )
            .map((role) => role.name);
    }, [canPublishWithoutApproval, user]);

    // Роли, дающие право "Редактировать последнюю редакцию напрямую" (см. canEditLastRevision
    // ниже) - для подсказки в самой модалке VndEditLastRevisionModal, тот же паттерн, что и
    // publishWithoutApprovalRoleNames выше.
    const editLastRevisionRoleNames = useMemo(() => {
        if (!user) return [];
        return user.roles
            .filter((role) => role.permissionCodes.includes(PermissionCode.EditLastRevisionDirectly))
            .map((role) => role.name);
    }, [user]);

    // Процесс согласования - нужен, только чтобы решить, кому показать кнопку "Перейти к
    // согласованию" в статус-баннере редакции ("pending"): участвующему согласующему,
    // инициатору согласования и инициатору самой ВНД. Грузим один раз при открытии вкладки -
    // отсутствие процесса (ВНД ещё не отправлялась) не ошибка, просто кнопка не покажется.
    const [approvalProcess, setApprovalProcess] = useState<ApprovalProcessResponse | null>(null);
    useEffect(() => {
        let cancelled = false;
        coordinationService.getByVndId(vnd.id)
            .then((data) => {
                if (!cancelled) setApprovalProcess(data);
            })
            .catch(() => {
                if (!cancelled) setApprovalProcess(null);
            });
        return () => {
            cancelled = true;
        };
    }, [vnd.id]);

    // Модалка "Подробнее" по ссылке из подсказки об отклонённой редакции (см.
    // RedactionsSidebar/RedactionListItem.wasRejected) - показывает approvalProcess как есть,
    // он уже и является тем самым отклонённым процессом (см. rejectedRedactionId выше).
    const [rejectedDetailsOpen, setRejectedDetailsOpen] = useState(false);

    const {
        canDirectly, canByRequest,
        myAccessState, needsPerform, needsConfirmStartAfterRequest,
        startOpen: actualizeStartOpen, setStartOpen: setActualizeStartOpen,
        requestOpen: actualizeRequestOpen, setRequestOpen: setActualizeRequestOpen,
        performOpen: actualizePerformOpen, setPerformOpen: setActualizePerformOpen, performMode: actualizePerformMode,
        submitting: actualizeSubmitting, error: actualizeError, setError: setActualizeError,
        handleStart: handleActualizeStart, handleRequestAccess: handleActualizeRequestAccess,
        handlePerformConfirm: handleActualizePerformConfirm,
        handleUpdatePerformedSettings: handleActualizeUpdatePerformedSettings,
        canWithoutApproval, canWithApproval,
    } = useVndActualizationFlow(vnd, () => onVndChanged?.());

    // Заявка одобрена (needsConfirmStartAfterRequest) - раньше здесь открывался отдельный
    // модальный шаг "Выполнить актуализацию" (PerformActualizationModal, mode="afterRequest"),
    // где редактор подтверждал старт. Убрано по просьбе - редактор просто открывает вкладку
    // «Редакции» и сразу видит рабочее состояние: цикл стартует автоматически, "с изменениями"
    // по умолчанию (plannedNoChanges: false) - см. модалку «Настройки актуализации» ниже, где
    // это значение можно переключить. Ref - чтобы не вызвать confirmStart повторно, пока
    // первый запрос ещё не отработал (needsConfirmStartAfterRequest остаётся true до ответа
    // сервера, а не только на один рендер).
    const autoConfirmStartFiredRef = useRef(false);
    useEffect(() => {
        if (needsConfirmStartAfterRequest && !autoConfirmStartFiredRef.current) {
            autoConfirmStartFiredRef.current = true;
            void handleActualizePerformConfirm({shiftNextPeriod: false, plannedNoChanges: false});
        }
    }, [needsConfirmStartAfterRequest, handleActualizePerformConfirm]);

    // "Без изменений" без согласования — подтвердить прямо здесь (кнопка сайдбара
    // "confirmNoChanges"), без захода на вкладку «Актуализация» (см. handleConfirmNoChanges
    // в VndActualizationTab.tsx — та же логика, продублирована здесь по той же причине, по
    // которой сюда переехал шаг "Выполнить актуализацию").
    const [confirmingNoChanges, setConfirmingNoChanges] = useState(false);
    const handleConfirmNoChanges = async () => {
        setConfirmingNoChanges(true);
        try {
            await actualizationService.confirmNoChanges(vnd.id);
            toast.success(
                t("openVndPage.editionsTab.confirmNoChangesSuccessTitle"),
                t("openVndPage.editionsTab.confirmNoChangesSuccessDescription")
            );
            onVndChanged?.();
        } catch (err) {
            toast.error(t("openVndPage.editionsTab.confirmNoChangesErrorTitle"), err instanceof Error ? err.message : undefined);        } finally {
            setConfirmingNoChanges(false);
        }
    };

    // Переключение чекбокса "Актуализация без изменений" ОБРАТНО на включено, когда в рамках
    // текущего цикла уже загружена редакция-черновик (и, возможно, файлы/ТИД к ней) - это
    // необратимо удалит черновик, поэтому сначала спрашиваем подтверждение (см.
    // handleTogglePlannedNoChanges ниже). Если черновика ещё нет -
    // переключаем сразу, без вопросов (нечего терять).
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [discardError, setDiscardError] = useState<string | null>(null);

    // Модалка «Настройки актуализации» — открывается ссылкой под основной кнопкой сайдбара
    // (см. primarySecondaryLabel/Action в ветках ниже), пока цикл актуализации идёт.
    const [actualizeSettingsOpen, setActualizeSettingsOpen] = useState(false);

    const handleTogglePlannedNoChanges = (next: boolean) => {
        const hasDraft = lastByNumber?.approvalStatus === "Draft" && lastByNumber.number > 1;
        if (next && hasDraft) {
            setDiscardError(null);
            setDiscardConfirmOpen(true);
            return;
        }
        void handleActualizeUpdatePerformedSettings({
            shiftNextPeriod: vnd.actualizationShiftNextPeriod,
            plannedNoChanges: next,
        });
    };

    const handleConfirmDiscard = async () => {
        setDiscarding(true);
        setDiscardError(null);
        try {
            await actualizationService.discardDraft(vnd.id);
            setDiscardConfirmOpen(false);
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

    const [activeLanguage, setActiveLanguage] = useState<RedactionLanguage>("ru");

    const [attachmentsRedaction, setAttachmentsRedaction] = useState<VndRedactionResponse | null>(null);
    const [tidRedaction, setTidRedaction] = useState<VndRedactionResponse | null>(null);
    const [approvalSheetRedaction, setApprovalSheetRedaction] = useState<VndRedactionResponse | null>(null);
    const [disagreementMatrixRedaction, setDisagreementMatrixRedaction] = useState<VndRedactionResponse | null>(null);
    // Модалка "Сформировать или загрузить ТИД" - открывается кнопкой в RedactionStatusBanner,
    // когда у актуализационной редакции (Number > 1) ещё нет файла ТИД (см. tidMissing ниже).
    const [uploadTidOpen, setUploadTidOpen] = useState(false);

    useEffect(() => {
        if (!selected) return;
        const available = getAvailableLanguages(selected);
        if (!available.includes(activeLanguage)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveLanguage(available[0] ?? "ru");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchQuery("");
    }, [selected?.id]);

    const handleDownload = (fileId: number, name: string) =>
        download.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.editionsTab.downloadError"));

    const selectedFileId = selected ? getRedactionFileId(selected, activeLanguage) : null;
    const handleDownloadSelected = () => {
        if (!selected || selectedFileId === null) return;
        void handleDownload(selectedFileId, buildRedactionFileName(selected.code, vnd.name, activeLanguage));
    };

    const handleRedactionUploaded = (redaction: VndRedactionResponse) => {
        setUploadOpen(false);
        refetch();
        onVndChanged?.();

        if (redaction.isCurrent) {
            toast.success(
                t("openVndPage.editionsTab.redactionBecameCurrentTitle"),
                t("openVndPage.editionsTab.redactionBecameCurrentDescription", {code: redaction.code})
            );
        } else {
            toast.info(
                t("openVndPage.editionsTab.redactionAddedToDraftTitle"),
                t("openVndPage.editionsTab.redactionAddedToDraftDescription", {
                    vndCode: vnd.code,
                    redactionCode: redaction.code
                })
            );
        }
    };

    const handleTidUploaded = (redaction: VndRedactionResponse) => {
        setUploadTidOpen(false);
        refetch();
        onVndChanged?.();
        toast.success(
            t("openVndPage.editionsTab.tidUploadedTitle"),
            t("openVndPage.editionsTab.tidUploadedDescription", {code: redaction.code})
        );
    };

    const handleEditRedaction = (redactionId: number) => {
        setSelectedId(redactionId);
        setEditOpen(true);
    };

    if (loading) {
        return <Loader label={t("openVndPage.editionsTab.loadingRedactions")} fullHeight={false}/>
    }

    if (error) {
        return (
            <EmptyState
                variant="error"
                title={t("openVndPage.editionsTab.loadErrorTitle")}
                description={error}
                actionLabel={t("openVndPage.editionsTab.retry")}
                onAction={refetch}
            />
        );
    }

    /* Ни одной редакции у документа ещё нет вовсе */
    if (!rawSelected) {
        return (
            <div className="mx-auto mt-30 max-w-[420px]">
                <EmptyState
                    icon={Upload}
                    title={t("openVndPage.editionsTab.emptyTitle")}
                    description={t("openVndPage.editionsTab.emptyDescription")}
                    actionLabel={t("openVndPage.editionsTab.uploadFirstAction")}
                    actionIcon={Upload}
                    actionVariant="primary"
                    onAction={() => setUploadOpen(true)}
                />
                {uploadOpen && (
                    <VndUploadRedactionModal
                        vndId={vnd.id}
                        onClose={() => setUploadOpen(false)}
                        onUploaded={handleRedactionUploaded}
                    />
                )}
            </div>
        );
    }

    /* Редакции у документа есть, но все они пока черновик/на согласовании/на консолидации -
       рядовому пользователю (не редактору ВНД) их показывать нельзя, а действующей или ранее
       официально принятой редакции у документа ещё не было (см. isRedactionVisibleToRegularUser) */
    if (!selected) {
        return (
            <div className="mx-auto mt-30 max-w-[420px]">
                <EmptyState
                    title={t("openVndPage.editionsTab.redactionNotAvailableTitle")}
                    description={t("openVndPage.editionsTab.redactionNotAvailableDescription")}
                />
            </div>
        );
    }

    const selectedStatus = getRedactionDisplayStatus(
        selected, vnd.status, lastByNumber?.id === selected.id, vnd.effectiveDate
    );

    // Кнопка "Перейти к согласованию" в статус-баннере ("pending") — только для тех, кому есть
    // смысл сразу перейти на "Ход согласования": участвующий согласующий, инициатор
    // согласования, инициатор самой ВНД.
    const isApprovalParticipant = !!approvalProcess && !!user &&
        approvalProcess.stages.some((s) => s.approverUserId === user.id);
    const isApprovalInitiator = !!approvalProcess && approvalProcess.initiatorUserId === user?.id;
    const isVndInitiator = vnd.createdByUserId !== null && vnd.createdByUserId === user?.id;
    const canGoToApprovalFromBanner = isApprovalParticipant || isApprovalInitiator || isVndInitiator;

    // Редакция, по которой последний процесс согласования был отклонён - она вернулась в
    // черновик (как и после отзыва), поэтому по одному только approvalStatus не отличить
    // "никогда не отправлялась" от "отклонена, нужно доработать". Сверяемся с историей
    // процесса согласования, чтобы показать в сайдбаре подсказку именно для этого случая.
    const rejectedRedactionId =
        approvalProcess?.status === "rejected" ? approvalProcess.redactionId : undefined;

    // Актуализационная редакция (Number > 1) без файла ТИД - нельзя отправить на согласование
    // или опубликовать без согласования (см. VndApprovalService.StartAsync и
    // VndService.PublishRedactionWithoutApprovalAsync на бэке), поэтому в статус-баннере вместо
    // этих кнопок показывается "Сформировать или загрузить ТИД".
    const selectedTidMissing = selected.number > 1 && selected.tidFileId === null;

    const handlePublishWithoutApproval = async () => {
        setPublishingWithoutApproval(true);
        setPublishWithoutApprovalError(null);
        try {
            await vndService.publishRedactionWithoutApproval(vnd.id, selected.id);
            setPublishWithoutApprovalConfirmOpen(false);
            toast.success(
                t("openVndPage.editionsTab.publishWithoutApprovalSuccessTitle"),
                t("openVndPage.editionsTab.publishWithoutApprovalSuccessDescription")
            );
            refetch();
            onVndChanged?.();
        } catch (err) {
            setPublishWithoutApprovalError(
                err instanceof Error ? err.message : t("openVndPage.editionsTab.publishWithoutApprovalErrorDefault"));
        } finally {
            setPublishingWithoutApproval(false);
        }
    };

    // --- Главная кнопка сайдбара редакций: что она делает, зависит от того, есть ли у ВНД уже
    // действующая редакция, и, если да, от текущего статуса цикла актуализации.
    const hasCurrentRedaction = !!current;
    const uploadMode: "default" | "actualization" = vnd.status === "onact" ? "actualization" : "default";

    let primaryVariant: RedactionsPrimaryActionVariant;
    let primaryDisabled: boolean;
    let primaryHint: string | undefined;
    let primaryAction: () => void;
    let primarySecondaryLabel: string | undefined;
    let primarySecondaryAction: (() => void) | undefined;
    let primarySecondaryTooltip: string | undefined;
    let primaryHintTooltip: string | undefined;

    if (vnd.status === "arch") {
        // Архивация необратима (см. VndService.CancelAsync и проверки в StartAsync/
        // PublishRedactionWithoutApprovalAsync на бэке) - никаких действий с редакциями
        // архивированного ВНД быть не может, в т.ч. "Новая редакция" для того случая, когда
        // документ был архивирован ещё ДО того, как у него появилась хоть одна действующая
        // редакция (CurrentRedactionId == null => hasCurrentRedaction тоже false - без этой
        // проверки, идущей РАНЬШЕ !hasCurrentRedaction, попали бы в ветку "new" ниже).
        primaryVariant = "actualize";
        primaryDisabled = true;
        primaryHint = t("openVndPage.redactionsSidebar.archivedHint");
        primaryAction = () => {
        };
    } else if (vnd.status === "consol") {
        // Согласованная редакция ещё не консолидирована - загружать новую редакцию рано, сначала
        // документ должен пройти консолидацию. ВАЖНО: эта проверка обязана идти РАНЬШЕ
        // !hasCurrentRedaction - CurrentRedactionId не проставляется при входе в консолидацию
        // (см. комментарий в VndApprovalService про VndActualizationService.PublishAsync), поэтому
        // для самой первой редакции ВНД (ещё не было ни одной "действующей") hasCurrentRedaction
        // в статусе "Консолидация" тоже false, и без этой проверки выше по цепочке ветка
        // "!hasCurrentRedaction" ошибочно предлагала бы загрузить новую редакцию напрямую.
        primaryVariant = "actualize";
        primaryDisabled = true;
        primaryHint = t("openVndPage.redactionsSidebar.consolidationHint");
        primaryAction = () => {
        };
    } else if (!hasCurrentRedaction) {
        // Нет предыдущих актуальных редакций - добавление новой редакции напрямую, без актуализации
        primaryVariant = "new";
        primaryDisabled = uploadBlocked;
        primaryHint = uploadBlocked
            ? t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: lastByNumber?.number})
            : undefined;
        primaryAction = () => setUploadOpen(true);
    } else if (vnd.status === "onact") {
        if (vnd.actualizationPerformed) {
            if (vnd.actualizationPlannedNoChanges) {
                // Заявлено "без изменений" на шаге "Выполнить актуализацию" - новая редакция не
                // нужна. Дальше два пути в зависимости от того, требует ли цикл согласования:
                if (vnd.actualizationRequiresApproval) {
                    // Отправляем действующую редакцию на согласование как есть (открывает тот
                    // же VndStartApprovalModal, что и обычная отправка черновика на
                    // согласование - бэк сам разрешает это для actualizationPlannedNoChanges,
                    // см. VndApprovalService.StartAsync/isNoChangesReviewRound)
                    primaryVariant = "startApprovalNoChanges";
                    primaryDisabled = false;
                    primaryHint = t("openVndPage.redactionsSidebar.noChangesApprovalHint");
                    primaryAction = () => setApprovalModalOpen(true);
                    // Перед отправкой на согласование ответственный/главный редактор может ещё раз
                    // изменить настройки, зафиксированные на шаге "Выполнить актуализацию"
                    // (сдвиг срока/"без изменений") - ссылка открывает модалку "Настройки актуализации".
                    if (vnd.actualizationResponsibleUserId === user?.id || isChiefEditor) {
                        primarySecondaryLabel = t("openVndPage.redactionsSidebar.actualizationSettings.title");
                        primarySecondaryAction = () => setActualizeSettingsOpen(true);
                    }
                } else {
                    // Согласование не требуется - подтверждаем отсутствие изменений напрямую,
                    // документ сразу уходит в консолидацию
                    primaryVariant = "confirmNoChanges";
                    primaryDisabled = confirmingNoChanges;
                    primaryHint = t("openVndPage.redactionsSidebar.noChangesConfirmHint");
                    primaryAction = () => void handleConfirmNoChanges();
                }
            } else {
                // Цикл актуализации уже идёт, шаг "Выполнить актуализацию" пройден, заявлены
                // изменения - загружаем актуализированную версию
                primaryVariant = "uploadActualized";
                primaryDisabled = uploadBlocked;
                if (uploadBlocked) {
                    primaryHint = t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: lastByNumber?.number});
                } else {
                    // Заявлено "с изменениями" - в отличие от ветки "без изменений" выше здесь
                    // нужно явно загрузить новую редакцию, прежде чем можно будет отправить на
                    // согласование (кнопка сама по себе только открывает загрузку файла).
                    primaryHint = t("openVndPage.redactionsSidebar.changesUploadHint");
                    primaryHintTooltip = t("openVndPage.redactionsSidebar.changesUploadHintTooltip");
                }
                primaryAction = () => setUploadOpen(true);
                // Тот же путь, что и в ветке "без изменений" выше - настройки, зафиксированные на
                // шаге "Выполнить актуализацию", можно поменять и здесь, до загрузки новой версии
                // (например, снова отметить "без изменений", если галочку сняли по ошибке - тогда
                // сработает подтверждение удаления черновика, см. handleTogglePlannedNoChanges).
                if (vnd.actualizationResponsibleUserId === user?.id || isChiefEditor) {
                    primarySecondaryLabel = t("openVndPage.redactionsSidebar.actualizationSettings.title");
                    primarySecondaryAction = () => setActualizeSettingsOpen(true);
                }
            }
        } else if (needsPerform) {
            // Шаг "Выполнить актуализацию" ещё не пройден, но я могу его выполнить (ответственный
            // или главный редактор) — загрузка новой редакции заблокирована на бэке (см.
            // VndDocument.ActualizationPerformed). Кнопка сама открывает PerformActualizationModal
            // прямо здесь, без перехода на вкладку «Актуализация».
            primaryVariant = "performActualization";
            primaryDisabled = false;
            primaryHint = undefined;
            primaryAction = () => setActualizePerformOpen(true);
        } else {
            // Шаг ещё не пройден, но выполнить его должен кто-то другой (не я)
            primaryVariant = "performActualization";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.waitingPerformHint");
            primaryAction = () => {
            };
        }
    } else if (vnd.status === "active") {
        if (myAccessState.kind === "pending") {
            primaryVariant = "actualize";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.pendingRequestHint");
            primaryAction = () => {
            };
        } else if (needsConfirmStartAfterRequest) {
            // Заявка одобрена - цикл стартует автоматически, без модалки (см. useEffect с
            // autoConfirmStartFiredRef выше). Пока запрос не отработал - кнопка неактивна.
            primaryVariant = "performActualization";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.autoStartingActualizationHint");
            primaryAction = () => {
            };
        } else if (!canDirectly && !canByRequest) {
            primaryVariant = "actualize";
            primaryDisabled = true;
            primaryHint = t("openVndPage.redactionsSidebar.noPermissionHint");
            primaryAction = () => {
            };
        } else {
            primaryVariant = "actualize";
            primaryDisabled = false;
            primaryHint = undefined;
            primaryAction = () => {
                if (canDirectly) setActualizeStartOpen(true);
                else setActualizeRequestOpen(true);
            };
        }
    } else {
        // Согласование/черновик - актуализацию сейчас не начать (статусы "Архив" и "Консолидация"
        // обработаны отдельными ветками в самом начале цепочки - см. выше)
        primaryVariant = "actualize";
        primaryDisabled = true;
        primaryHint = undefined;
        primaryAction = () => {
        };
    }

    return (
        <div
            ref={containerRef}
            style={{height: availableHeight}}
            className={`px-2 grid items-start gap-[15px] overflow-hidden ${
                contentsOpen ? "grid-cols-[260px_1fr_260px]" : "grid-cols-[260px_1fr]"
            } ${hasStatusBannerAbove ? "mb-[20px]" : ""}`}
        >

            {/* Левая панель */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 flex-col gap-[10px]"
            >

                <SearchBar
                    variant="white"
                    placeholder={t("openVndPage.editionsTab.searchPlaceholder")}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={() => textViewRef.current?.goNext()}
                />

                {/* Редакции документа */}
                <RedactionsSidebar
                    redactions={visibleRedactions}
                    lastRedactionId={lastByNumber?.id}
                    selectedId={selected.id}
                    vndStatus={vnd.status}
                    effectiveDate={vnd.effectiveDate}
                    rejectedRedactionId={rejectedRedactionId}
                    onShowRejectedDetails={
                        rejectedRedactionId !== undefined && approvalProcess
                            ? () => setRejectedDetailsOpen(true)
                            : undefined
                    }
                    onSelect={setSelectedId}
                    primaryActionVariant={primaryVariant}
                    primaryActionDisabled={primaryDisabled}
                    primaryActionHint={primaryHint}
                    primaryActionHintTooltip={primaryHintTooltip}
                    onPrimaryAction={primaryAction}
                    secondaryActionLabel={primarySecondaryLabel}
                    onSecondaryAction={primarySecondaryAction}
                    secondaryActionTooltip={primarySecondaryTooltip}
                    compareMode={compareMode}
                    onToggleCompare={() => {
                        // Модалка сравнения требует обе стороны - если у выбранной редакции нет
                        // соседней (единственная редакция ВНД), сравнивать пока не с чем.
                        if (compareTarget) setCompareMode(true);
                    }}
                    contentsOpen={contentsOpen}
                    onToggleContents={() => setContentsOpen((v) => !v)}
                    canEditLastRevision={hasPermission(PermissionCode.EditLastRevisionDirectly)}
                    onEditRedaction={handleEditRedaction}
                    onOpenAttachments={setAttachmentsRedaction}
                    onOpenTid={setTidRedaction}
                    onDownloadSelected={handleDownloadSelected}
                    downloadDisabled={selectedFileId === null}
                    downloading={download.activeId === selectedFileId}
                />
                {/* Языки редакции */}
                <RedactionLanguageTabsPanel
                    selected={selected}
                    activeLanguage={activeLanguage}
                    onChange={setActiveLanguage}
                />
            </div>

            {/* Центральная панель */}
            {/* Закреплённый статус-баннер сверху + прокручиваемое содержимое ниже */}
            <div
                style={{height: availableHeight}}
                className="flex min-h-0 max-h-[750px] flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            >
                <RedactionStatusBanner
                    status={selectedStatus}
                    currentNumber={current?.number}
                    effectiveDate={vnd.effectiveDate}
                    isSubmitting={false}
                    onSubmit={vnd.status === "arch" ? undefined : () => setApprovalModalOpen(true)}
                    onGoToApproval={canGoToApprovalFromBanner ? onGoToApproval : undefined}
                    onPublishWithoutApproval={
                        vnd.status !== "arch" && canPublishWithoutApproval
                            ? () => setPublishWithoutApprovalConfirmOpen(true)
                            : undefined
                    }
                    isPublishingWithoutApproval={publishingWithoutApproval}
                    tidMissing={selectedTidMissing}
                    onUploadTid={() => setUploadTidOpen(true)}
                />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {submit.error && (
                        <div
                            className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {submit.error}
                        </div>
                    )}

                    {download.error && (
                        <div
                            className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                            {download.error}
                        </div>
                    )}

                    <RedactionTextView
                        ref={textViewRef}
                        vnd={vnd}
                        selected={selected}
                        activeLanguage={activeLanguage}
                        downloadingId={download.activeId}
                        onDownload={handleDownload}
                        searchQuery={searchQuery}
                        onClearSearch={() => setSearchQuery("")}
                    />
                </div>
            </div>

            {/* Правая панель - содержание */}
            {contentsOpen && selected && (
                <div style={{height: availableHeight}} className="min-h-0">
                    <RedactionContentsPanel
                        fileId={selectedFileId}
                        getContainer={() => textViewRef.current?.getContainer() ?? null}
                        onClose={() => setContentsOpen(false)}
                    />
                </div>
            )}

            {/* --- Другие модальные окна --- */}
            {/* Загрузка новой редакции (или актуализированной версии - см. uploadMode) */}
            {uploadOpen && (
                <VndUploadRedactionModal
                    vndId={vnd.id}
                    mode={uploadMode}
                    lockedRequiresApproval={vnd.actualizationRequiresApproval}
                    previousAttachments={selected.attachments}
                    onClose={() => setUploadOpen(false)}
                    onUploaded={handleRedactionUploaded}
                />
            )}

            {/* Сформировать или загрузить ТИД - для актуализационной редакции без файла ТИД */}
            {uploadTidOpen && selected && (
                <VndUploadTidModal
                    vndId={vnd.id}
                    redactionCode={selected.code}
                    vndTitle={vnd.titleRu}
                    previousFileId={current && current.id !== selected.id ? current.docFileRuId : null}
                    draftFileId={selected.docFileRuId}
                    // "Разработчик" по умолчанию - тот, кто сейчас формирует ТИД (т.е. будущий
                    // инициатор согласования), а не обязательно ответственный за актуализацию -
                    // это разные роли, и раньше поле по умолчанию неверно показывало последнего
                    // даже тем, кто не может его изменить (см. canChangeTidDeveloper выше).
                    // Ответственный за актуализацию остаётся запасным вариантом только на случай,
                    // если текущий пользователь почему-то ещё не загрузился.
                    defaultResponsibleUserId={user?.id ?? vnd.actualizationResponsibleUserId}
                    defaultResponsibleUserName={user?.fullName ?? vnd.actualizationResponsibleUserName}
                    canSelectResponsible={canChangeTidDeveloper}
                    canUploadWithoutApproval={canWithoutApproval}
                    onClose={() => setUploadTidOpen(false)}
                    onUploaded={handleTidUploaded}
                />
            )}

            {/* Начать актуализацию (для прав ActualizeAnyVnd...) */}
            {actualizeStartOpen && user && (
                <StartActualizationModal
                    canWithoutApproval={canWithoutApproval}
                    canWithApproval={canWithApproval}
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    currentUserId={user.id}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizeStartOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizeStart}
                />
            )}

            {/* Запросить доступ к актуализации (для прав ActualizeVnd...ByRequest) */}
            {actualizeRequestOpen && (
                <RequestActualizationAccessModal
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizeRequestOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizeRequestAccess}
                />
            )}

            {/* Выполнить актуализацию (прямо во вкладке «Редакции», без перехода на «Актуализация»).
                Только для пути "напрямую" (needsPerform) - путь "по заявке" стартует автоматически,
                без модалки, см. useEffect с autoConfirmStartFiredRef выше. */}
            {actualizePerformOpen && needsPerform && (
                <PerformActualizationModal
                    mode={actualizePerformMode}
                    decidedShiftNextPeriod={myAccessState.kind === "approved" ? myAccessState.shiftNextPeriod : undefined}
                    submitting={actualizeSubmitting}
                    error={actualizeError}
                    onClose={() => {
                        if (actualizeSubmitting) return;
                        setActualizePerformOpen(false);
                        setActualizeError(null);
                    }}
                    onConfirm={handleActualizePerformConfirm}
                />
            )}

            {/* Подтверждение удаления черновика редакции при возврате "Актуализации без изменений"
                обратно на включено, когда в рамках текущего цикла уже загружена редакция (и,
                возможно, файлы/ТИД к ней) - см. handleTogglePlannedNoChanges выше. */}
            <ConfirmActionModal
                open={discardConfirmOpen}
                onClose={() => {
                    if (discarding) return;
                    setDiscardConfirmOpen(false);
                    setDiscardError(null);
                }}
                onConfirm={handleConfirmDiscard}
                title={t("openVndPage.editionsTab.discardDraftConfirmTitle")}
                message={t("openVndPage.editionsTab.discardDraftConfirmMessage")}
                confirmLabel={t("openVndPage.editionsTab.discardDraftConfirmLabel")}
                loadingLabel={t("openVndPage.editionsTab.discardDraftLoadingLabel")}
                loading={discarding}
                error={discardError}
                variant="danger"
            />

            {/* Настройки актуализации (сдвиг срока/"без изменений") — модалка, открывается
                ссылкой под основной кнопкой сайдбара (см. primarySecondaryLabel/Action выше). */}
            {actualizeSettingsOpen && (
                <ActualizationSettingsModal
                    plannedNoChanges={vnd.actualizationPlannedNoChanges}
                    shiftNextPeriod={vnd.actualizationShiftNextPeriod}
                    submitting={actualizeSubmitting}
                    onTogglePlannedNoChanges={handleTogglePlannedNoChanges}
                    onClose={() => setActualizeSettingsOpen(false)}
                />
            )}

            {/* Запуск согласования */}
            {approvalModalOpen && (
                <VndStartApprovalModal
                    vndId={vnd.id}
                    // Кто фактически подготовил редакцию/ТИД, отправляемые на согласование именно
                    // сейчас: если сейчас идёт цикл актуализации - это её ответственный
                    // (actualizationResponsibleUserId, тот, кто взял ВНД в актуализацию и всё
                    // загрузил), а не тот, кто когда-то создал сам документ (createdByUserId).
                    // Иначе, когда согласование запускает главный редактор, который к тому же и
                    // есть первоначальный создатель ВНД (а актуализацию по факту вёл кто-то
                    // другой), выбор инициатора не предлагался бы вовсе - хотя настоящий автор
                    // ЭТОЙ редакции не он. Зеркалит draftOwnerId в VndApprovalService.StartAsync
                    // на бэке; тот же принцип уже применён у defaultResponsibleUserId в
                    // VndUploadTidModal ("Разработчик" ТИД).
                    draftOwnerUserId={vnd.actualizationResponsibleUserId ?? vnd.createdByUserId}
                    draftOwnerUserName={vnd.actualizationResponsibleUserName ?? vnd.createdByUserName}
                    currentUserId={user?.id}
                    // Не isChiefEditor: тот широкий набор прав (CreateVndWith(out)Approval/
                    // ActualizeAnyVndWith(out)Approval) практически есть у любого автора ВНД,
                    // включая обычных редакторов (см. комментарий у PermissionCode.
                    // EditAnyVndApprovalRoute и VndApprovalService.StartAsync на бэке) - из-за
                    // этого обычный редактор с одним лишь CreateVndWithApproval тоже видел выбор
                    // инициатора. Нужно узкое право EditAnyVndApprovalRoute ("роль главного
                    // редактора"), а не широкий isChiefEditor.
                    canChooseInitiator={hasPermission(PermissionCode.EditAnyVndApprovalRoute)}
                    onClose={() => setApprovalModalOpen(false)}
                    onStarted={() => {
                        setApprovalModalOpen(false);
                        onVndChanged?.();
                        onGoToApproval?.();
                    }}
                />
            )}

            {/* Сделать редакцию действующей без согласования (только главный редактор) */}
            <ConfirmActionModal
                open={publishWithoutApprovalConfirmOpen}
                onClose={() => {
                    if (publishingWithoutApproval) return;
                    setPublishWithoutApprovalConfirmOpen(false);
                    setPublishWithoutApprovalError(null);
                }}
                onConfirm={handlePublishWithoutApproval}
                title={t("openVndPage.editionsTab.publishWithoutApprovalConfirmTitle")}
                message={t("openVndPage.editionsTab.publishWithoutApprovalConfirmMessage")}
                confirmLabel={t("openVndPage.editionsTab.publishWithoutApprovalConfirmLabel")}
                loadingLabel={t("openVndPage.editionsTab.publishWithoutApprovalLoadingLabel")}
                loading={publishingWithoutApproval}
                error={publishWithoutApprovalError}
                variant="primary"
            >
                {publishWithoutApprovalRoleNames.length > 0 && (
                    <Clue>
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                            <span>
                              {publishWithoutApprovalRoleNames.length === 1
                                  ? t("openVndPage.editionsTab.roleGrantLabelSingular")
                                  : t("openVndPage.editionsTab.roleGrantLabelPlural")}
                            </span>
                            {publishWithoutApprovalRoleNames.map((name) => (
                                <span
                                    key={name}
                                    className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#ececfc] text-[11.5px] font-semibold text-[#4e57d6] whitespace-nowrap"
                                >
                                    {name}
                                </span>
                            ))}
                        </span>
                    </Clue>
                )}
            </ConfirmActionModal>

            {/* Редактирование редакции */}
            {editOpen && selected && (
                <VndEditLastRevisionModal
                    vndId={vnd.id}
                    vnd={vnd}
                    redaction={selected}
                    roleNames={editLastRevisionRoleNames}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => {
                        setEditOpen(false);
                        refetch();
                        onVndChanged?.();
                        toast.success(
                            t("openVndPage.editionsTab.redactionUpdatedTitle"),
                            t("openVndPage.editionsTab.redactionUpdatedDescription", {code: selected.code})
                        );
                    }}
                />
            )}

            {/* Вложения редакции */}
            {attachmentsRedaction && (
                <RedactionAttachmentsModal
                    redaction={attachmentsRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onView={(target) => {
                        if (target === "tid") setTidRedaction(attachmentsRedaction);
                        else if (target === "approvalSheet") setApprovalSheetRedaction(attachmentsRedaction);
                        else setDisagreementMatrixRedaction(attachmentsRedaction);
                    }}
                    onClose={() => setAttachmentsRedaction(null)}
                />
            )}

            {/* Просмотр ТИД редакции */}
            {tidRedaction && (
                <RedactionTidModal
                    vnd={vnd}
                    redaction={tidRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setTidRedaction(null)}
                />
            )}

            {/* Просмотр Листа согласования редакции */}
            {approvalSheetRedaction && (
                <RedactionApprovalSheetModal
                    vnd={vnd}
                    redaction={approvalSheetRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setApprovalSheetRedaction(null)}
                />
            )}

            {/* Просмотр матрицы разногласий редакции */}
            {disagreementMatrixRedaction && (
                <RedactionDisagreementMatrixModal
                    vnd={vnd}
                    redaction={disagreementMatrixRedaction}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setDisagreementMatrixRedaction(null)}
                />
            )}

            {/* Просмотр и сравнение редакций - слева выбранная сейчас редакция, справа
                соседняя по номеру; обе стороны можно переключить на любую другую редакцию
                прямо в модалке. Вне контекста согласования - без пометки "необходимо
                согласовать". */}
            {compareMode && compareTarget && (
                <RedactionCompareModal
                    vnd={vnd}
                    redactions={sortedDesc}
                    initialLeft={selected}
                    initialRight={compareTarget}
                    downloadingId={download.activeId}
                    onDownload={handleDownload}
                    onClose={() => setCompareMode(false)}
                />
            )}

            {rejectedDetailsOpen && approvalProcess && (() => {
                // Редакция, к которой относится отклонённый процесс - именно её нужно открывать
                // при клике "Показать в тексте" внутри модалки (см. RejectedApprovalDetailsModal).
                const rejectedRedaction = redactions?.find((r) => r.id === approvalProcess.redactionId);
                return rejectedRedaction ? (
                    <RejectedApprovalDetailsModal
                        vnd={vnd}
                        redaction={rejectedRedaction}
                        process={approvalProcess}
                        onClose={() => setRejectedDetailsOpen(false)}
                    />
                ) : null;
            })()}
        </div>
    );
}