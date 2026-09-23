// Открытый документ ВНД в любом статусе
import {useLocation, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useEffect, useState} from "react";

import {useAuth} from "@/context/AuthContext.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";

import {useVndById} from "@/hooks/vndHooks/useVndById.ts";
import {useVndDictionaries} from "@/hooks/vndHooks/useVndDictionaries.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {collapseDocumentStatus, DOCUMENT_STATUS_META, getVndDisplayMeta} from "@/constants/vndStatus.ts";
import {getVndTabs, type VndTabId} from "@/constants/vndTabs.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";

import {VndEditionsTab} from "@/components/componentsVND/componentsOpenVndPage/VndEditionsTab.tsx";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import {VndPassportTab} from "@/components/componentsVND/componentsOpenVndPage/VndPassportTab.tsx";
import {VndLinksTab} from "@/components/componentsVND/componentsOpenVndPage/VndLinksTab.tsx";
import {VndHistoryTab} from "@/components/componentsVND/componentsOpenVndPage/VndHistoryTab.tsx";
import {VndActualizationTab} from "@/components/componentsVND/componentsOpenVndPage/VndActualizationTab.tsx";
import {VndCoordinationTab} from "@/components/componentsVND/componentsOpenVndPage/VndCoordinationTab.tsx";
import {
    ConsolidateVndModal, type ConsolidateRequisites
} from "@/components/componentsVND/componentsOpenVndPage/ConsolidateVndModal.tsx";
import {
    CancelVndModal, type CancelVndFields
} from "@/components/componentsVND/componentsOpenVndPage/CancelVndModal.tsx";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndStatusBanner} from "@/components/componentsGeneral/knowledgeBaseComponents/VndStatusBanner.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {VndProposalModal} from "@/components/componentsVND/componentsOpenVndPage/VndProposalModal.tsx";
import {Archive, Eye, Lightbulb, Trash2} from "lucide-react";

export function OpenVndPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const {data: vnd, loading, error, refetch} = useVndById(id ? Number(id) : undefined);
    const dictionaries = useVndDictionaries();
    const {data: redactions, refetch: refetchRedactions} = useVndRedactions(id ? Number(id) : undefined);

    // Список редакций на уровне страницы (используется в шапке — консолидация/ТИД, «Масштабный
    // просмотр», таб «История») раньше не обновлялся после действий в соседних вкладках:
    // VndEditionsTab держит и обновляет свою ОТДЕЛЬНУЮ копию редакций внутри себя, а сюда
    // наверх это не всплывало. onVndChanged дергается всеми вкладками при любом действии,
    // которое могло затронуть редакции (загрузка новой, ТИД, согласование, актуализация,
    // консолидация) — используем этот же момент, чтобы обновить и список здесь.
    const handleVndOrRedactionsChanged = () => {
        refetch();
        refetchRedactions();
    };
    const navigate = useNavigate();
    const {user, hasPermission} = useAuth();
    // Хук, а не просто вызов hasPermission(...) по месту - обязан вызываться безусловно на
    // каждом рендере, ДО возможных ранних return'ов ниже (loading/error/!vnd), иначе порядок
    // хуков между рендерами разъедется (Rules of Hooks). Сам результат используется только
    // ниже, у canSeeDocumentStatus.
    const isVndEditor = useIsVndEditor();

    // Таб при открытии страницы: сначала react-router state (переход внутри приложения,
    // например с карточки задачи), затем ?tab= в URL (переход из уведомления — там нет
    // возможности передать state, только сам URL), иначе — «Редакции» по умолчанию.
    const tabFromQuery = searchParams.get("tab") as VndTabId | null;
    const initialTab = (location.state as { tab?: VndTabId } | null)?.tab ?? tabFromQuery ?? "editions";
    const [tab, setTab] = useState<VndTabId>(initialTab);

    const [consolidateOpen, setConsolidateOpen] = useState(false);
    const [consolidating, setConsolidating] = useState(false);
    const [consolidateError, setConsolidateError] = useState<string | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Кнопка-глазик "Масштабный просмотр редакции" рядом с "Код ВНД"/"Удалить черновик" на
    // табе «Редакции» — открывает ту же модалку RedactionViewModal, что и в "Ход согласования"
    // (RedactionViewModal), но без approvalProcess: без него панель "Комментарии" не рендерится
    // вовсе (см. approvalProcess && (...) в RedactionViewModal), поэтому кнопки комментариев
    // здесь нарочно нет. Показываем последнюю по номеру редакцию - именно её показывает сама
    // вкладка «Редакции», если явно не выбрать другую (см. useRedactionSelection: selected по
    // умолчанию совпадает с lastByNumber).
    const [viewRedactionOpen, setViewRedactionOpen] = useState(false);
    // Окно "+ Предложения по ВНД" (VndProposalModal)
    const [proposalOpen, setProposalOpen] = useState(false);
    const viewRedactionDownload = useAsyncAction<number>();
    const handleViewRedactionDownload = (fileId: number, name: string) =>
        viewRedactionDownload.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.editionsTab.downloadError"));

    const handleDelete = async () => {
        if (!vnd) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await vndService.remove(vnd.id);
            toast.success(t("openVndPage.deletedToastTitle"), t("openVndPage.deletedToastDescription", {name: vnd.name}));
            navigate("/base-vnd");
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : t("openVndPage.deleteError"));
            toast.error(t("openVndPage.deleteFailedToastTitle"), err instanceof Error ? err.message : undefined);
            setDeleting(false);
        }
    };

    // Кнопка "Архивировать" — на любом статусе, кроме черновика (тот только удаляется выше) и
    // уже архивированного. Если ВНД сейчас "На согласовании" — согласование отзывается
    // автоматически на бэке в рамках той же операции (см. VndService.CancelAsync).
    const [cancelOpen, setCancelOpen] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const handleCancel = async (fields: CancelVndFields) => {
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
            handleVndOrRedactionsChanged();
        } catch (err) {
            setCancelError(err instanceof Error ? err.message : t("openVndPage.archiveError"));
        } finally {
            setCanceling(false);
        }
    };

    // Инициатор согласования нужен только как fallback права на консолидацию - когда у ВНД
    // нет открытого цикла актуализации (ActualizationResponsibleUserId пуст). Подгружаем только
    // для статуса "Консолидация", чтобы не дёргать эндпоинт согласования лишний раз.
    const [approvalInitiatorId, setApprovalInitiatorId] = useState<number | null>(null);

    useEffect(() => {
        if (!vnd || vnd.status !== "consol") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setApprovalInitiatorId(null);
            return;
        }

        let cancelled = false;
        coordinationService
            .getByVndId(vnd.id)
            .then((process) => {
                if (!cancelled) setApprovalInitiatorId(process.initiatorUserId);
            })
            .catch(() => {
                // Согласования могло не быть вовсе (например, редакция без RequiresApproval,
                // но в рамках цикла актуализации) - тогда единственный путь консолидации это
                // ActualizationResponsibleUserId или главный редактор, инициатора просто нет
                if (!cancelled) setApprovalInitiatorId(null);
            });

        return () => {
            cancelled = true;
        };
    }, [vnd, vnd?.id, vnd?.status]);

    const lastRedactionNumber = redactions.reduce((max, r) => Math.max(max, r.number), 0);
    const isFirstRedaction = lastRedactionNumber <= 1;
    // Актуализационная редакция (Number > 1) без файла ТИД — консолидировать документ нельзя
    // (см. VndActualizationService.PublishAsync), поэтому кнопку "Консолидировать" в
    // VndStatusBanner прячем, пока ТИД не приложен (во вкладке «Редакции»).
    const latestRedaction = redactions.find((r) => r.number === lastRedactionNumber);
    const consolidateTidMissing = !isFirstRedaction && !!latestRedaction && latestRedaction.tidFileId === null;

    // "+ Предложения по ВНД" - по опубликованным документам (не черновик и не архив). Предложение
    // пишется к действующей редакции (из неё же берутся цитаты), если её нет - к последней.
    const proposalRedaction = redactions.find((r) => r.isCurrent) ?? latestRedaction;
    const canSendProposal = !!vnd && vnd.status !== "draft" && vnd.status !== "arch" && !!proposalRedaction;

    // Зеркалит право публикации из VndActualizationService.PublishAsync на бэке:
    // - если есть открытый цикл актуализации - только назначенный ответственный или главный методолог;
    // - если цикла нет - только инициатор согласования или главный методолог.
    // Раньше здесь стоял общий IsChiefEditor() (CreateVnd.../ActualizeAnyVnd...) - тот же набор
    // прав, что почти у любого автора ВНД, из-за чего консолидировать чужую редакцию мог
    // практически кто угодно. ConsolidateAnyVnd - отдельное узкое право именно для этого шага.
    const canConsolidateAnyVnd = hasPermission(PermissionCode.ConsolidateAnyVnd);

    const canConsolidate = vnd
        ? canConsolidateAnyVnd ||
        (vnd.actualizationResponsibleUserId
            ? vnd.actualizationResponsibleUserId === user?.id
            : approvalInitiatorId !== null && approvalInitiatorId === user?.id)
        : false;

    const handleConsolidate = async (hadChanges: boolean, requisites: ConsolidateRequisites) => {
        if (!vnd) return;
        setConsolidating(true);
        setConsolidateError(null);
        try {
            await actualizationService.publish(vnd.id, {hadChanges, ...requisites});
            setConsolidateOpen(false);
            toast.success(t("openVndPage.consolidatedToastTitle"), t("openVndPage.consolidatedToastDescription"));
            handleVndOrRedactionsChanged();
        } catch (err) {
            setConsolidateError(
                err instanceof Error ? err.message : t("openVndPage.consolidateError"),
            );
        } finally {
            setConsolidating(false);
        }
    };

    if (loading || dictionaries.loading) {
        return <Loader label={t("general.loading")} fullHeight={false}/>
    }

    if (error) {
        {/* Не удалось загрузить документ: {error} */
        }
        return (
            <div
                className="my-4 mx-auto max-w-[1000px] rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                {t("openVndPage.loadError", {error})}
            </div>
        );
    }

    if (dictionaries.error) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
                {/* Не удалось загрузить данные! */}
                <EmptyState variant="error" title={t("openVndPage.dictionariesErrorTitle")}
                            description={dictionaries.error}/>
            </div>
        );
    }

    if (!vnd) return null;

    const meta = getVndDisplayMeta(vnd.status, vnd.effectiveDate);
    // "Статус ВНД" (документ-уровня) — см. DOCUMENT_STATUS_META. Сервер уже свернул значение
    // с 3 до 2 вариантов для пользователей без ViewVndRegistryExtended (см.
    // VndService.CollapseDocumentStatus); collapseDocumentStatus здесь — защитный дубль того же
    // правила на фронте (идемпотентно, если пришедшие данные уже свёрнуты).
    const canViewVndRegistryExtended = hasPermission(PermissionCode.ViewVndRegistryExtended);
    const documentStatusMeta =
        DOCUMENT_STATUS_META[collapseDocumentStatus(vnd.documentStatus, canViewVndRegistryExtended)];
    // Строка "Статус ВНД:" видна только "редакторам ВНД" (isVndEditor выше - тот же набор прав,
    // что и canFilterLinkedToMe в BaseVndPage.tsx и фильтр редакций в VndEditionsTab.tsx) и/или
    // пользователям с расширенным просмотром реестра. Рядовой пользователь без этих прав строку
    // вообще не видит (не просто свёрнутое значение — сам блок не рендерится).
    const canSeeDocumentStatus = isVndEditor || canViewVndRegistryExtended;
    const tabs = getVndTabs(vnd.status, t);
    // Если сменился статус и текущий выбранный таб для него больше не доступен - откатываемся на «Реквизиты»
    const activeTab = tabs.some((tabItem) => tabItem.id === tab) ? tab : "passport";

    return (
        <div className={`w-full max-w-[1800px] mx-auto pt-5 sm:pt-[16px] ${
            activeTab === "editions" ? "" : "pb-10 sm:pb-[60px]"
        }`}>

            <div className="px-10">
                <VndStatusBanner
                    status={vnd.status}
                    effectiveDate={vnd.effectiveDate}
                    onSecondaryAction={() => setConsolidateOpen(true)}
                    canConsolidate={canConsolidate}
                    tidMissing={consolidateTidMissing}
                />
            </div>

            <div className="px-4 sm:px-6 pb-2">
                <h1 className="text-[13px] font-bold leading-tight text-[#1c2740]">
                    {vnd.name}
                </h1>
            </div>

            {/* Табы - состав зависит от статуса, «Реквизиты» есть всегда */}
            <div
                className="px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-[#e9edf3] mb-2 overflow-x-auto">
                <div className="flex items-center gap-6">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`whitespace-nowrap pb-3 border-b-2 text-[13px] font-semibold cursor-pointer bg-transparent ${
                                activeTab === t.id
                                    ? "border-[#4e57d6] text-[#4e57d6]"
                                    : "border-transparent text-[#8b97ab] hover:text-[#3a4560]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 flex-none pb-3 text-[12px] font-mono font-semibold">
                    {/* Блок 1: Код */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[#8b97ab]">{/*Код ВНД:*/}{t("openVndPage.vndCodeLabel")}</span>
                        <span className="text-[12px] text-[#4e57d6] bg-[#ececfc] px-2.5 py-0.5 rounded-[7px]">
                            {vnd.code}
                        </span>
                    </div>


                    {/* Блок 2: Дата создания */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[#8b97ab]">{t("openVndPage.createdAtLabel")}</span>
                        <span className="text-[#2d3748] px-2 py-0.5 rounded-md">
                            {formatDate(vnd.createdAt)}
                        </span>
                    </div>


                    {/* Блок 3: Статус последней редакции (детальный, как и раньше — виден всем,
                        без изменений) */}
                    <div className="flex items-center gap-1.5">
                        <span
                            className="text-[#8b97ab]">{/*Статус последней редакции ВНД:*/}{t("openVndPage.lastRedactionStatusLabel")}</span>
                        <span
                            className="px-2.5 py-0.5 rounded-full text-[12px]"
                            style={{color: meta.color, background: meta.bg}}
                        >
                            {t(meta.label)}
                        </span>
                    </div>

                    {/* Блок 3б: "Статус ВНД" (документ-уровня) — новое поле, отдельное от блока
                        выше. Видно только "редакторам ВНД" и/или пользователям с
                        ViewVndRegistryExtended (см. canSeeDocumentStatus) — рядовой пользователь
                        без этих прав блок не видит вовсе. Значение при этом ещё и свёрнуто до
                        действующий/архивированный для тех, кто без ViewVndRegistryExtended, но
                        всё же попал сюда как редактор ВНД (см. documentStatusMeta). */}
                    {canSeeDocumentStatus && (
                        <div className="flex items-center gap-1.5">
                            <span
                                className="text-[#8b97ab]">{/*Статус ВНД:*/}{t("openVndPage.documentStatusLabel")}</span>
                            <span
                                className="px-2.5 py-0.5 rounded-full text-[12px]"
                                style={{color: documentStatusMeta.color, background: documentStatusMeta.bg}}
                            >
                                {t(documentStatusMeta.label)}
                            </span>
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        {/* Масштабный просмотр редакции (глазик) — только на табе «Редакции»,
                            открывает последнюю по номеру редакцию в модалке RedactionViewModal */}
                        {activeTab === "editions" && latestRedaction && (
                            <Tooltip content={t("openVndPage.viewRedactionTooltip")} side="bottom">
                                <button
                                    onClick={() => setViewRedactionOpen(true)}
                                    className="shrink-0 grid h-7 w-7 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#3a4560] cursor-pointer hover:border-[#4e57d6]/40 hover:bg-[#ececfc] hover:text-[#4e57d6] transition-colors"
                                >
                                    <Eye className="w-3.5 h-3.5" strokeWidth={2}/>
                                </button>
                            </Tooltip>
                        )}

                        {/* + Предложения по ВНД - любой сотрудник может предложить изменения/дополнения,
                            предложение получает главный редактор ВНД (см. VndProposalModal) */}
                        {activeTab === "editions" && canSendProposal && (
                            <Tooltip content={t("vndProposals.buttonTooltip")} side="bottom">
                                <button
                                    onClick={() => setProposalOpen(true)}
                                    className="shrink-0 flex h-7 items-center gap-1.5 rounded-[9px] border border-[#f0dcae] bg-[#fffaf0] px-2.5 text-[12px] font-semibold text-[#9a6408] cursor-pointer hover:border-[#e0b95c] hover:bg-[#fff3d6] transition-colors"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" strokeWidth={2}/>
                                    + {t("vndProposals.button")}
                                </button>
                            </Tooltip>
                        )}

                        {/* Кнопка удаления (только черновик) */}
                        {vnd.status === "draft" && hasPermission(PermissionCode.DeleteVnd) && (
                            <button
                                onClick={() => setDeleteOpen(true)}
                                disabled={deleting}
                                className="shrink-0 flex items-center gap-1.5 rounded-[9px] border border-[#e0b4ae] bg-white px-3 py-1 text-[12px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2}/>
                                {deleting ? t("general.deleting") : t("openVndPage.deleteDraftButton")}
                            </button>
                        )}

                        {/* Кнопка архивации (любой статус, кроме черновика и уже архивированного) */}
                        {vnd.status !== "draft" && vnd.status !== "arch" && hasPermission(PermissionCode.CancelVnd) && (
                            <button
                                onClick={() => setCancelOpen(true)}
                                disabled={canceling}
                                className="shrink-0 flex items-center gap-1.5 rounded-[9px] border border-[#e0b4ae] bg-white px-3 py-1 text-[12px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] transition-colors"
                            >
                                <Archive className="w-3.5 h-3.5" strokeWidth={2}/>
                                {canceling ? t("general.archiving") : t("openVndPage.archiveButton")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Редакции */}
            {activeTab === "editions" && (
                <VndEditionsTab vnd={vnd} onVndChanged={handleVndOrRedactionsChanged}
                                onGoToApproval={() => setTab("approval")}/>
            )}
            {/* Реквизиты */}
            {activeTab === "passport" && (
                <VndPassportTab
                    vnd={vnd}
                    onVndChanged={handleVndOrRedactionsChanged}
                    typeOptions={dictionaries.typeOptions}
                    organOptions={dictionaries.organOptions}
                    developerOptions={dictionaries.orgUnitOptions}
                    curatorOptions={dictionaries.curatorOptions}
                    executorOptions={dictionaries.orgUnitOptions}
                    keywordOptions={dictionaries.keywordOptions}
                    rubricOptions={dictionaries.rubricOptions}
                    secrecyOptions={dictionaries.secrecyOptions}
                    userGroupOptions={dictionaries.userGroupOptions}
                />
            )}
            {/* Согласование */}
            {activeTab === "approval" && <VndCoordinationTab vnd={vnd} onVndChanged={handleVndOrRedactionsChanged}/>}
            {/* Связи */}
            {activeTab === "links" && <VndLinksTab vndId={vnd.id}/>}
            {/* История */}
            {activeTab === "history" && <VndHistoryTab vnd={vnd} redactions={redactions}/>}
            {/* Актуализация */}
            {activeTab === "actual" && (
                <VndActualizationTab
                    vnd={vnd}
                    onVndChanged={handleVndOrRedactionsChanged}
                    onGoToEditions={() => setTab("editions")}
                    onGoToApproval={() => setTab("approval")}
                />)}

            {/* Модальное окно консолидации */}
            {consolidateOpen && (
                <ConsolidateVndModal
                    isFirstRedaction={isFirstRedaction}
                    plannedNoChanges={vnd.actualizationPlannedNoChanges}
                    initialRequisites={{
                        adoptionCode: vnd.adoptionCode ?? "",
                        adoptionDate: vnd.adoptionDate ?? "",
                        effectiveDate: vnd.effectiveDate ?? "",
                    }}
                    submitting={consolidating}
                    error={consolidateError}
                    onClose={() => {
                        if (consolidating) return;
                        setConsolidateOpen(false);
                        setConsolidateError(null);
                    }}
                    onConfirm={handleConsolidate}
                />
            )}

            {/* Модальное окно архивации */}
            {cancelOpen && (
                <CancelVndModal
                    hasActiveApproval={vnd.status === "review"}
                    submitting={canceling}
                    error={cancelError}
                    onClose={() => {
                        if (canceling) return;
                        setCancelOpen(false);
                        setCancelError(null);
                    }}
                    onConfirm={handleCancel}
                />
            )}

            {/* Модальное окно удаления */}
            <ConfirmActionModal
                open={deleteOpen}
                onClose={() => {
                    if (deleting) return;
                    setDeleteOpen(false);
                    setDeleteError(null);
                }}
                onConfirm={handleDelete}
                title={t("openVndPage.deleteConfirmTitle")}
                message={t("openVndPage.deleteConfirmMessage", {name: vnd.name})}
                confirmLabel={t("general.delete")}
                loadingLabel={t("general.deleting")}
                loading={deleting}
                error={deleteError}
                variant="danger"
            />

            {/* Масштабный просмотр редакции — без approvalProcess, поэтому без кнопки
                "Комментарии" (см. комментарий у viewRedactionOpen выше) */}
            {viewRedactionOpen && latestRedaction && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={latestRedaction}
                    downloadingId={viewRedactionDownload.activeId}
                    onDownload={handleViewRedactionDownload}
                    onClose={() => setViewRedactionOpen(false)}
                />
            )}

            {/* + Предложения по ВНД */}
            {proposalOpen && proposalRedaction && (
                <VndProposalModal
                    vnd={vnd}
                    redaction={proposalRedaction}
                    downloadingId={viewRedactionDownload.activeId}
                    onDownload={handleViewRedactionDownload}
                    onClose={() => setProposalOpen(false)}
                />
            )}
        </div>
    );
}