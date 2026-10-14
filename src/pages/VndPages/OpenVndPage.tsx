// Открытый документ ВНД в любом статусе
import {useLocation, useParams, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useEffect, useRef, useState} from "react";

import {useAuth} from "@/context/AuthContext.ts";

import {useVndById} from "@/hooks/vndHooks/useVndById.ts";
import {useVndDictionaries} from "@/hooks/vndHooks/useVndDictionaries.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {useAsyncAction} from "@/hooks/useAsyncAction.ts";
import {useIsVndEditor} from "@/hooks/vndHooks/useIsVndEditor.ts";
import {useVndDeleteFlow} from "@/hooks/vndHooks/useVndDeleteFlow.ts";
import {useVndLifecycleActions} from "@/hooks/vndHooks/useVndLifecycleActions.ts";
import {useApprovalInitiatorId} from "@/hooks/vndHooks/useApprovalInitiatorId.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {
    parseLinkFocusFromSearch, type VndLinkFocusRequest, type VndLinkSide,
} from "@/utils/vndProcess/vndLinkNavigation.ts";

import {collapseDocumentStatus, DOCUMENT_STATUS_META, getVndDisplayMeta} from "@/constants/vndStatus.ts";
import {getVndTabs, type VndTabId} from "@/constants/vndTabs.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {VndEditionsTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndEditionsTab.tsx";
import {VndPassportTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndPassportTab.tsx";
import {VndLinksTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndLinksTab.tsx";
import {VndHistoryTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndHistoryTab.tsx";
import {VndActualizationTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndActualizationTab.tsx";
import {VndCoordinationTab} from "@/components/componentsVND/componentsOpenVndPage/Tabs/VndCoordinationTab.tsx";
import {ConsolidateVndModal} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/ConsolidateVndModal.tsx";
import {CancelVndModal} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/CancelVndModal.tsx";
import {ProposalVndModal} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/ProposalVndModal.tsx";
import {VndFavoriteButton} from "@/components/componentsVND/componentsOpenVndPage/VndFavoriteButton.tsx";
import {SecrecyVndModal} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/SecrecyVndModal.tsx";
import {VndActionsMenu, type VndActionsMenuItem} from "@/components/componentsVND/componentsOpenVndPage/VndActionsMenu.tsx";
import {VndAccessDenied} from "@/components/componentsVND/componentsOpenVndPage/VndAccessDenied.tsx";
import {VndHeaderButton} from "@/components/componentsVND/componentsOpenVndPage/VndHeaderButton.tsx";
import {countPrintBundleFiles} from "@/utils/vndProcess/printBundleItems.ts";
import { MetaItem } from "@/components/componentsVND/componentsOpenVndPage/MetaItem";
import {StatusPill} from "@/components/componentsVND/componentsOpenVndPage/StatusPill.tsx";
import {
    PrintVndBundleModal
} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/PrintVndBundleModal.tsx";

import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import {DeleteVndModal} from "@/components/componentsVND/componentsOpenVndPage/componentsModal/DeleteVndModal.tsx";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndStatusBanner} from "@/components/componentsGeneral/knowledgeBaseComponents/VndStatusBanner.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

import {Archive, Eye, Lightbulb, Lock, Printer, Trash2} from "lucide-react";

// Переход с одного ВНД на другой
export function OpenVndPage() {
    const {id} = useParams<{ id: string }>();
    return <OpenVndPageContent key={id}/>;
}

function OpenVndPageContent() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const {data: vnd, loading, error, accessDenied, refetch} = useVndById(id ? Number(id) : undefined);
    const dictionaries = useVndDictionaries();
    const {data: redactions, refetch: refetchRedactions} = useVndRedactions(id ? Number(id) : undefined);
    const {user, hasPermission} = useAuth();
    // Хуки обязаны вызываться безусловно ДО ранних return ниже (Rules of Hooks)
    const isVndEditor = useIsVndEditor();

    // Список редакций на уровне страницы
    const handleVndOrRedactionsChanged = () => {
        refetch();
        refetchRedactions();
    };

    const deleteFlow = useVndDeleteFlow(vnd);
    const {consolidate, cancel} = useVndLifecycleActions(vnd, handleVndOrRedactionsChanged);
    const approvalInitiatorId = useApprovalInitiatorId(vnd);

    // Таб при открытии страницы: сначала react-router state (переход внутри приложения,
    // например с карточки задачи), затем ?tab= в URL (переход из уведомления — там нет
    // возможности передать state, только сам URL), иначе — «Редакции» по умолчанию.
    const tabFromQuery = searchParams.get("tab") as VndTabId | null;
    // ?link=...&side=... - открыть «Редакции» на месте ссылки (см. buildLinkFocusUrl).
    const linkFocusFromQuery = parseLinkFocusFromSearch(searchParams);
    const initialTab = linkFocusFromQuery
        ? "editions"
        : (location.state as { tab?: VndTabId } | null)?.tab ?? tabFromQuery ?? "editions";
    const [tab, setTab] = useState<VndTabId>(initialTab);
    const [linkFocus, setLinkFocus] = useState<VndLinkFocusRequest | null>(
        () => linkFocusFromQuery ? {...linkFocusFromQuery, nonce: Date.now()} : null,
    );
    // Тот же документ открыли по другой ссылке на место (страница не пересоздаётся - key
    // тот же): подхватываем новый ?link=... из адреса.
    const lastSearchRef = useRef(location.search);
    useEffect(() => {
        if (lastSearchRef.current === location.search) return;
        lastSearchRef.current = location.search;
        const focus = parseLinkFocusFromSearch(new URLSearchParams(location.search));
        if (!focus) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLinkFocus({...focus, nonce: Date.now()});
        setTab("editions");
    }, [location.search]);

    // "Лупа" на вкладке «Связанные документы» для места в ЭТОМ документе - переключаемся на
    // «Редакции» без перезагрузки страницы.
    const focusInEditions = (request: Omit<VndLinkFocusRequest, "nonce">) => {
        setLinkFocus({...request, nonce: Date.now()});
        setTab("editions");
    };
    const handleShowLinkInText = (linkId: number, side: VndLinkSide) => focusInEditions({linkId, side});
    const handleShowAttachmentInText = (redactionId: number, index: number, language: string | null) =>
        focusInEditions({linkId: 0, side: "source", attachment: {redactionId, index, language}});

    // Модалка «Настройки секретности» (три точки, право ManageVndSecrecy)
    const [secrecyOpen, setSecrecyOpen] = useState(false);
    // Кнопка-глазик "Масштабный просмотр редакции"
    const [viewRedactionOpen, setViewRedactionOpen] = useState(false);
    // Окно "+ Предложения по ВНД" (VndProposalModal)
    const [proposalOpen, setProposalOpen] = useState(false);
    // Кнопка-принтер "Документ для печати" - склейка выбранных файлов редакции в один .docx
    const [printBundleOpen, setPrintBundleOpen] = useState(false);
    const viewRedactionDownload = useAsyncAction<number>();
    const handleViewRedactionDownload = (fileId: number, name: string) =>
        viewRedactionDownload.run(fileId, () => downloadWithToast(fileId, name), t("openVndPage.editionsTab.downloadError"));

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
    // ConsolidateAnyVnd - отдельное узкое право именно для этого шага.
    const canConsolidate = !!vnd && (
        hasPermission(PermissionCode.ConsolidateAnyVnd) ||
        (vnd.actualizationResponsibleUserId
            ? vnd.actualizationResponsibleUserId === user?.id
            : approvalInitiatorId !== null && approvalInitiatorId === user?.id)
    );

    if (loading || dictionaries.loading) {
        return <Loader label={t("general.loading")} fullHeight={false}/>
    }

    if (accessDenied) return <VndAccessDenied/>;

    if (error) {
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
                <EmptyState variant="error" title={t("openVndPage.dictionariesErrorTitle")}
                            description={dictionaries.error}/>
            </div>
        );
    }

    if (!vnd) return null;

    const meta = getVndDisplayMeta(vnd.status, vnd.effectiveDate);
    // "Статус ВНД" (документ-уровня)
    const canViewVndRegistryExtended = hasPermission(PermissionCode.ViewVndRegistryExtended);

    // Меню «три точки» в шапке: секретность, удаление (черновик с DeleteVnd или любой статус
    // с DeleteAnyVnd, мягкое удаление) и архивация (любой статус, кроме черновика и архива, CancelVnd).
    const iconProps = {className: "w-3.5 h-3.5", strokeWidth: 2};
    const actionItems: VndActionsMenuItem[] = [];
    if (hasPermission(PermissionCode.ManageVndSecrecy)) {
        actionItems.push({
            key: "secrecy",
            label: t("openVndPage.secrecySettingsButton"),
            icon: <Lock {...iconProps}/>,
            onClick: () => setSecrecyOpen(true),
        });
    }
    if ((vnd.status === "draft" && hasPermission(PermissionCode.DeleteVnd))
        || hasPermission(PermissionCode.DeleteAnyVnd)) {
        actionItems.push({
            key: "delete",
            label: deleteFlow.deleting ? t("general.deleting")
                : t(vnd.status === "draft" ? "openVndPage.deleteDraftButton" : "openVndPage.deleteVndButton"),
            icon: <Trash2 {...iconProps}/>,
            onClick: deleteFlow.openModal,
            disabled: deleteFlow.deleting,
        });
    }
    if (vnd.status !== "draft" && vnd.status !== "arch" && hasPermission(PermissionCode.CancelVnd)) {
        actionItems.push({
            key: "archive",
            label: cancel.busy ? t("general.archiving") : t("openVndPage.archiveButton"),
            icon: <Archive {...iconProps}/>,
            onClick: cancel.openModal,
            disabled: cancel.busy,
        });
    }

    const documentStatusMeta =
        DOCUMENT_STATUS_META[collapseDocumentStatus(vnd.documentStatus, canViewVndRegistryExtended)];
    // Строка "Статус ВНД:" видна только "редакторам ВНД" и/или пользователям с расширенным
    // просмотром реестра (тот же набор прав, что canFilterLinkedToMe в BaseVndPage.tsx).
    const canSeeDocumentStatus = isVndEditor || canViewVndRegistryExtended;
    // Рядовому пользователю служебные вкладки («Согласование», «Актуализация», «История»)
    // не нужны. Остаются реквизиты, редакции и связи.
    const tabs = getVndTabs(vnd.status, t).filter((tabItem) =>
        canSeeDocumentStatus || !(["approval", "actual", "history"] as string[]).includes(tabItem.id));
    // Если сменился статус и текущий выбранный таб для него больше не доступен - откатываемся на «Реквизиты»
    const activeTab = tabs.some((tabItem) => tabItem.id === tab) ? tab : "passport";

    return (
        <div className={`w-full max-w-[1800px] mx-auto pt-5 sm:pt-[16px] ${
            activeTab === "editions" ? "" : "pb-10 sm:pb-[60px]"
        }`}>

            {/* Спец. Статус - Черновик, Консолидация, Ожидание вступления в силу и т.д. */}
            <div className="px-10">
                <VndStatusBanner
                    status={vnd.status}
                    effectiveDate={vnd.effectiveDate}
                    onSecondaryAction={consolidate.openModal}
                    canConsolidate={canConsolidate}
                    tidMissing={consolidateTidMissing}
                />
            </div>

            {/* Название и секретность */}
            <div className="px-4 sm:px-6 pb-2 flex items-center gap-3">
                <h1 className="min-w-0 text-[13px] font-bold leading-tight text-[#1c2740]">
                    {vnd.name}
                </h1>
                {vnd.isSecret && (
                    <Tooltip content={t("openVndPage.secretBadgeHint")}>
                        <span className="inline-flex flex-none items-center gap-1 rounded-full bg-[#fdf3e7] px-2.5 py-[3px] text-[11px] font-semibold text-[#9a6408]">
                            <Lock className="h-3 w-3" strokeWidth={2.2}/>
                            {t("openVndPage.secretBadge")}
                        </span>
                    </Tooltip>
                )}
            </div>

            {/* Табы + мета - состав зависит от статуса, "Реквизиты" есть всегда */}
            <div
                className="px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-[#e9edf3] mb-2 overflow-x-auto">
                <div className="flex items-center gap-6">
                    {tabs.map((tabItem) => (
                        <button
                            key={tabItem.id}
                            onClick={() => setTab(tabItem.id)}
                            className={`whitespace-nowrap pb-3 border-b-2 text-[13px] font-semibold cursor-pointer bg-transparent ${
                                activeTab === tabItem.id
                                    ? "border-[#4e57d6] text-[#4e57d6]"
                                    : "border-transparent text-[#8b97ab] hover:text-[#3a4560]"
                            }`}
                        >
                            {tabItem.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 flex-none pb-3 text-[12px] font-mono font-semibold">
                    {/* Код */}
                    <MetaItem label={t("openVndPage.vndCodeLabel")}>
                        <span className="text-[12px] text-[#4e57d6] bg-[#ececfc] px-2.5 py-0.5 rounded-[7px]">
                            {vnd.code}
                        </span>
                    </MetaItem>

                    {/* Дата создания */}
                    <MetaItem label={t("openVndPage.createdAtLabel")}>
                        <span className="text-[#2d3748] px-2 py-0.5 rounded-md">{formatDate(vnd.createdAt)}</span>
                    </MetaItem>

                    {/* Статус последней редакции (детальный - виден всем) */}
                    <MetaItem label={t("openVndPage.lastRedactionStatusLabel")}>
                        <StatusPill color={meta.color} bg={meta.bg} label={t(meta.label)}/>
                    </MetaItem>

                    {/* "Статус ВНД" (документ-уровня) */}
                    {canSeeDocumentStatus && (
                        <MetaItem label={t("openVndPage.documentStatusLabel")}>
                            <StatusPill color={documentStatusMeta.color} bg={documentStatusMeta.bg}
                                        label={t(documentStatusMeta.label)}/>
                        </MetaItem>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        {/* Масштабный просмотр последней редакции (глазик) - только на табе «Редакции» */}
                        {activeTab === "editions" && latestRedaction && (
                            <VndHeaderButton
                                tooltip={t("openVndPage.viewRedactionTooltip")}
                                onClick={() => setViewRedactionOpen(true)}
                                icon={<Eye {...iconProps}/>}
                            />
                        )}

                        {/* Документ для печати: выбранные тексты редакции, специальные вложения и
                            вложения в заданном порядке - одним .docx */}
                        {latestRedaction && redactions.some((r) => countPrintBundleFiles(r) > 1) && (
                            <VndHeaderButton
                                tooltip={t("printBundle.buttonTooltip")}
                                onClick={() => setPrintBundleOpen(true)}
                                icon={<Printer {...iconProps}/>}
                            />
                        )}

                        <VndFavoriteButton vndId={vnd.id} isFavorite={vnd.isFavorite}/>

                        {/* + Предложения по ВНД - предложение получает главный редактор ВНД */}
                        {activeTab === "editions" && canSendProposal && (
                            <VndHeaderButton
                                tooltip={t("vndProposals.buttonTooltip")}
                                onClick={() => setProposalOpen(true)}
                                variant="proposal"
                                icon={<Lightbulb {...iconProps}/>}
                                label={`+ ${t("vndProposals.button")}`}
                            />
                        )}

                        {/* Меню "три точки" - удалить, архивировать */}
                        <VndActionsMenu items={actionItems}/>
                    </div>
                </div>
            </div>

            {activeTab === "editions" && (
                <VndEditionsTab vnd={vnd} onVndChanged={handleVndOrRedactionsChanged}
                                onGoToApproval={() => setTab("approval")}
                                linkFocus={linkFocus}/>
            )}
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
            {activeTab === "approval" && <VndCoordinationTab vnd={vnd} onVndChanged={handleVndOrRedactionsChanged}/>}
            {activeTab === "links" && <VndLinksTab vnd={vnd} onShowInText={handleShowLinkInText}
                                                   onShowAttachmentInText={handleShowAttachmentInText}/>}
            {activeTab === "history" && <VndHistoryTab vnd={vnd} redactions={redactions}/>}
            {activeTab === "actual" && (
                <VndActualizationTab
                    vnd={vnd}
                    onVndChanged={handleVndOrRedactionsChanged}
                    onGoToEditions={() => setTab("editions")}
                    onGoToApproval={() => setTab("approval")}
                />)}

            {consolidate.open && (
                <ConsolidateVndModal
                    isFirstRedaction={isFirstRedaction}
                    plannedNoChanges={vnd.actualizationPlannedNoChanges}
                    initialRequisites={{
                        adoptionCode: vnd.adoptionCode ?? "",
                        adoptionDate: vnd.adoptionDate ?? "",
                        effectiveDate: vnd.effectiveDate ?? "",
                    }}
                    submitting={consolidate.busy}
                    error={consolidate.error}
                    onClose={consolidate.close}
                    onConfirm={consolidate.run}
                />
            )}

            {/* Архивация */}
            {cancel.open && (
                <CancelVndModal
                    hasActiveApproval={vnd.status === "review"}
                    submitting={cancel.busy}
                    error={cancel.error}
                    onClose={cancel.close}
                    onConfirm={cancel.run}
                />
            )}

            {/* Настройки секретности */}
            {secrecyOpen && (
                <SecrecyVndModal
                    vndId={vnd.id}
                    vndCode={vnd.code}
                    onClose={() => setSecrecyOpen(false)}
                    onSaved={() => void refetch()}
                />
            )}

            {/* Удаление */}
            <DeleteVndModal flow={deleteFlow} vnd={vnd}/>

            {/* Масштабный просмотр редакции - без approvalProcess, без кнопки "Комментарии" */}
            {viewRedactionOpen && latestRedaction && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={latestRedaction}
                    downloadingId={viewRedactionDownload.activeId}
                    onDownload={handleViewRedactionDownload}
                    onClose={() => setViewRedactionOpen(false)}
                />
            )}

            {/* Документ для печати */}
            {printBundleOpen && latestRedaction && (
                <PrintVndBundleModal
                    vnd={vnd}
                    redactions={redactions}
                    initialRedactionId={latestRedaction.id}
                    onClose={() => setPrintBundleOpen(false)}
                />
            )}

            {/* Предложения по ВНД */}
            {proposalOpen && proposalRedaction && (
                <ProposalVndModal
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
