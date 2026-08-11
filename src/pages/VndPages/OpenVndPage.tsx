import {useLocation, useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {ArrowLeft} from "lucide-react";
import {useVndById} from "@/hooks/vndHooks/useVndById.ts";
import {useVndDictionaries} from "@/hooks/vndHooks/useVndDictionaries.ts";
import {useVndRedactions} from "@/hooks/vndHooks/useVndRedactions.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {getVndTabs, type VndTabId} from "@/constants/vndTabs.ts";
import {VndStatusBanner} from "@/components/componentsGeneral/knowledgeBaseComponents/VndStatusBanner.tsx";
import {formatDate} from "@/utils/dateUtils.ts";
import {VndPassportTab} from "@/components/componentsVND/componentsOpenVndPage/VndPassportTab.tsx";
import {VndEditionsTab} from "@/components/componentsVND/componentsOpenVndPage/VndEditionsTab.tsx";
import {VndCoordinationTab} from "@/components/componentsVND/componentsOpenVndPage/VndCoordinationTab.tsx";
import {ConsolidateVndModal} from "@/components/componentsVND/componentsOpenVndPage/ConsolidateVndModal.tsx";
import {VndActualizationTab} from "@/components/componentsVND/componentsOpenVndPage/VndActualizationTab.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndLinksTab} from "@/components/componentsVND/componentsOpenVndPage/VndLinksTab.tsx";
import {VndHistoryTab} from "@/components/componentsVND/componentsOpenVndPage/VndHistoryTab.tsx";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

export function OpenVndPage() {
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const {data: vnd, loading, error, refetch} = useVndById(id ? Number(id) : undefined);
    const dictionaries = useVndDictionaries();
    const {data: redactions} = useVndRedactions(id ? Number(id) : undefined);
    const navigate = useNavigate();
    const {user, hasPermission} = useAuth();

    const initialTab = (location.state as { tab?: VndTabId } | null)?.tab ?? "passport";
    const [tab, setTab] = useState<VndTabId>(initialTab);

    const [consolidateOpen, setConsolidateOpen] = useState(false);
    const [consolidating, setConsolidating] = useState(false);
    const [consolidateError, setConsolidateError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!vnd) return;
        if (!window.confirm(`Удалить черновик ВНД «${vnd.name}»? Действие необратимо.`)) return;
        setDeleting(true);
        try {
            await vndService.remove(vnd.id);
            toast.success("ВНД удалён", `«${vnd.name}» удалён`);
            navigate("/base-vnd");
        } catch (err) {
            toast.error("Не удалось удалить", err instanceof Error ? err.message : undefined);
            setDeleting(false);
        }
    };

    // Инициатор согласования нужен только как fallback права на консолидацию — когда у ВНД
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
                // но в рамках цикла актуализации) — тогда единственный путь консолидации это
                // ActualizationResponsibleUserId или главный редактор, инициатора просто нет
                if (!cancelled) setApprovalInitiatorId(null);
            });

        return () => {
            cancelled = true;
        };
    }, [vnd?.id, vnd?.status]);

    const lastRedactionNumber = redactions.reduce((max, r) => Math.max(max, r.number), 0);
    const isFirstRedaction = lastRedactionNumber <= 1;

    // Зеркалит право публикации из VndActualizationService.PublishAsync на бэке:
    // - если есть открытый цикл актуализации — только назначенный ответственный или главред;
    // - если цикла нет — только инициатор согласования или главред.
    const isChiefEditor =
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
            toast.success("ВНД консолидирован", "Документ теперь в статусе «Действующий»");
            refetch();
        } catch (err) {
            setConsolidateError(
                err instanceof Error ? err.message : "Не удалось консолидировать документ",
            );
        } finally {
            setConsolidating(false);
        }
    };

    if (loading || dictionaries.loading) {
        return <Loader label="Загрузка…" fullHeight={false}/>;
    }

    if (error) {
        return (
            <div className="my-4 mx-auto max-w-[1000px] rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                Не удалось загрузить документ: {error}
            </div>
        );
    }

    if (dictionaries.error) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
                <EmptyState variant="error" title="Не удалось загрузить данные!" description={dictionaries.error}/>
            </div>
        );
    }

    if (!vnd) return null;

    const meta = STATUS_META[vnd.status];
    const tabs = getVndTabs(vnd.status);
    // Если сменился статус и текущий выбранный таб для него больше не доступен — откатываемся на «Реквизиты»
    const activeTab = tabs.some((t) => t.id === tab) ? tab : "passport";

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/base-vnd")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            <div className="flex items-center gap-[9px] mb-1 flex-wrap mt-3">
                <span className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-[10px] py-[3px] rounded-[7px]">
                    {vnd.code}
                </span>
                <span className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono text-[12px] text-[#8b97ab]">
                    Дата создания: {formatDate(vnd.createdAt)}
                </span>
                <span
                    className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono rounded-full"
                    style={{color: meta.color, background: meta.bg}}
                >
                    {meta.label}
                </span>
            </div>

            <div className="flex items-start justify-between gap-4">
                <h1 className="m-0 mb-1 text-[23px] font-bold tracking-[-0.02em]">
                    {vnd.name}
                </h1>
                {vnd.status === "draft" && hasPermission(PermissionCode.DeleteVnd) && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="mt-1 shrink-0 rounded-[9px] border border-[#e0b4ae] bg-white px-[14px] py-[8px] text-[12.5px] font-semibold text-[#c0392b] cursor-pointer hover:bg-[#fbecea] disabled:opacity-60"
                    >
                        {deleting ? "Удаляю…" : "Удалить черновик"}
                    </button>
                )}
            </div>

            <VndStatusBanner
                status={vnd.status}
                onSecondaryAction={() => setConsolidateOpen(true)}
                canConsolidate={canConsolidate}
            />

            {/* Табы - состав зависит от статуса, «Реквизиты» есть всегда */}
            <div className="flex items-center gap-6 border-b border-[#e9edf3] mb-5 overflow-x-auto">
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
            {activeTab === "editions" && <VndEditionsTab vnd={vnd} onVndChanged={refetch}/>}
            {activeTab === "approval" && <VndCoordinationTab vnd={vnd} onVndChanged={refetch}/>}
            {activeTab === "actual" && (
                <VndActualizationTab vnd={vnd} onVndChanged={refetch} onGoToEditions={() => setTab("editions")}/>
            )}
            {activeTab === "links" && <VndLinksTab vndId={vnd.id}/>}
            {activeTab === "history" && <VndHistoryTab/>}

            {consolidateOpen && (
                <ConsolidateVndModal
                    isFirstRedaction={isFirstRedaction}
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
        </div>
    );
}