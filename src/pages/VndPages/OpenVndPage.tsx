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
import {formatDate} from "@/utils/dateUtils.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {getVndTabs, type VndTabId} from "@/constants/vndTabs.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {VndEditionsTab} from "@/components/componentsVND/componentsOpenVndPage/VndEditionsTab.tsx";
import {VndPassportTab} from "@/components/componentsVND/componentsOpenVndPage/VndPassportTab.tsx";
import {VndLinksTab} from "@/components/componentsVND/componentsOpenVndPage/VndLinksTab.tsx";
import {VndHistoryTab} from "@/components/componentsVND/componentsOpenVndPage/VndHistoryTab.tsx";
import {VndActualizationTab} from "@/components/componentsVND/componentsOpenVndPage/VndActualizationTab.tsx";
import {VndCoordinationTab} from "@/components/componentsVND/componentsOpenVndPage/VndCoordinationTab.tsx";
import {ConsolidateVndModal} from "@/components/componentsVND/componentsOpenVndPage/ConsolidateVndModal.tsx";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndStatusBanner} from "@/components/componentsGeneral/knowledgeBaseComponents/VndStatusBanner.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Trash2} from "lucide-react";

export function OpenVndPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const {data: vnd, loading, error, refetch} = useVndById(id ? Number(id) : undefined);
    const dictionaries = useVndDictionaries();
    const {data: redactions} = useVndRedactions(id ? Number(id) : undefined);
    const navigate = useNavigate();
    const {user, hasPermission} = useAuth();

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

    // Зеркалит право публикации из VndActualizationService.PublishAsync на бэке (после унификации
    // с общим IsChiefEditor() — тем же, что используют VndService/VndApprovalService/
    // VndCoordinationTab: CreateVnd... тоже считается главным редактором, не только Actualize...):
    // - если есть открытый цикл актуализации - только назначенный ответственный или главред;
    // - если цикла нет - только инициатор согласования или главред.
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    const canConsolidate = vnd
        ? isChiefEditor ||
        (vnd.actualizationResponsibleUserId
            ? vnd.actualizationResponsibleUserId === user?.id
            : approvalInitiatorId !== null && approvalInitiatorId === user?.id)
        : false;

    const handleConsolidate = async (hadChanges: boolean) => {
        if (!vnd) return;
        setConsolidating(true);
        setConsolidateError(null);
        try {
            await actualizationService.publish(vnd.id, {hadChanges});
            setConsolidateOpen(false);
            toast.success(t("openVndPage.consolidatedToastTitle"), t("openVndPage.consolidatedToastDescription"));
            refetch();
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
        {/* Не удалось загрузить документ: {error} */}
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

    const meta = STATUS_META[vnd.status];
    const tabs = getVndTabs(vnd.status);
    // Если сменился статус и текущий выбранный таб для него больше не доступен - откатываемся на «Реквизиты»
    const activeTab = tabs.some((t) => t.id === tab) ? tab : "passport";

    return (
        <div className={`w-full max-w-[1800px] mx-auto pt-5 sm:pt-[16px] ${
            activeTab === "editions" ? "" : "pb-10 sm:pb-[60px]"
        }`}>

            <div className="px-10">
                <VndStatusBanner
                    status={vnd.status}
                    onSecondaryAction={() => setConsolidateOpen(true)}
                    canConsolidate={canConsolidate}
                />
            </div>

            {/*TODO: Ограничить длину названия, при навидении полный текст*/}
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

                <div className="flex items-center gap-[9px] flex-none pb-3">
                    <span
                        className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-[10px] py-[3px] rounded-[7px]">
                        {vnd.code}
                    </span>
                    <span
                        className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono text-[12px] text-[#8b97ab]">
                        {/* Дата создания: */}
                        {t("openVndPage.createdAtLabel", {date: formatDate(vnd.createdAt)})}
                    </span>
                    <span
                        className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono rounded-full"
                        style={{color: meta.color, background: meta.bg}}
                    >
                        {meta.label}
                    </span>

                    {vnd.status === "draft" && hasPermission(PermissionCode.DeleteVnd) && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            disabled={deleting}
                            className="shrink-0 flex items-center gap-1.5 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea]"
                        >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2}/>
                            {deleting ? t("general.deleting") : t("openVndPage.deleteDraftButton")}
                        </button>
                    )}
                </div>
            </div>

            {/* Редакции */}
            {activeTab === "editions" && (
                <VndEditionsTab vnd={vnd} onVndChanged={refetch} onGoToApproval={() => setTab("approval")}/>
            )}
            {/* Реквизиты */}
            {activeTab === "passport" && (
                <VndPassportTab
                    vnd={vnd}
                    onVndChanged={refetch}
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
            {activeTab === "approval" && <VndCoordinationTab vnd={vnd} onVndChanged={refetch}/>}
            {/* Связи */}
            {activeTab === "links" && <VndLinksTab vndId={vnd.id}/>}
            {/* История */}
            {activeTab === "history" && <VndHistoryTab/>}
            {/* Актуализация */}
            {activeTab === "actual" && (
                <VndActualizationTab
                    vnd={vnd}
                    onVndChanged={refetch}
                    onGoToEditions={() => setTab("editions")}
                    onGoToApproval={() => setTab("approval")}
                />)}

            {/* Модальное окно консолидации */}
            {consolidateOpen && (
                <ConsolidateVndModal
                    isFirstRedaction={isFirstRedaction}
                    plannedNoChanges={vnd.actualizationPlannedNoChanges}
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
        </div>
    );
}