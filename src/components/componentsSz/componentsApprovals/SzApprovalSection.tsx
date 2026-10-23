// Блок "Согласование": цепочка этапов, подробный список с резолюциями, решение
// текущего пользователя, окна подписания и замечания к устранению.
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {szEcpService, type SzResolutionSignature} from "@/service/szService/szEcpService.ts";
import {SzSignatureJournal} from "@/components/componentsSz/componentsApprovals/SzSignatureJournal.tsx";
import type {SzDetails} from "@/service/szService/szService.ts";
import type {RouteInstance} from "@/service/workflowService/workflowService.ts";
import type {SzApprovalState} from "@/hooks/sz/useSzApproval.ts";
import {RouteFlowView} from "@/components/componentsWorkflow/RouteFlowView.tsx";
import {QualifiedSignDialog} from "@/components/componentsSigning/QualifiedSignDialog.tsx";
import {OepSignModal} from "@/components/componentsSigning/OepSignModal.tsx";
import {EcpSignModal} from "@/components/componentsSigning/EcpSignModal.tsx";
import {SzPanel} from "@/components/componentsSz/SzPanel.tsx";
import {SzRouteSteps} from "@/components/componentsSz/componentsApprovals/SzRouteSteps.tsx";
import {SzDecisionPanel} from "@/components/componentsSz/componentsApprovals/SzDecisionPanel.tsx";
import {SzRemarksPanel} from "@/components/componentsSz/componentsApprovals/SzRemarksPanel.tsx";
import {SzUserMultiPickerModal} from "@/components/componentsSz/componentsSzCard/controls/SzUserMultiPickerModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {szService} from "@/service/szService/szService.ts";
import {toast} from "@/service/toastService.ts";
import {serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import type {RouteParticipant} from "@/service/workflowService/workflowService.ts";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {UserMinus, UserPlus} from "lucide-react";

interface SzApprovalSectionProps {
    sz: SzDetails;
    route: RouteInstance;
    users: Record<number, string>;
    approval: SzApprovalState;
    currentUserId: number | undefined;
    saving: boolean;
    /** Право менять участников маршрута на согласовании (CorrectSzOnApproval). */
    canEditRoute?: boolean;
    /** Кого можно добавить в маршрут. */
    people?: PickableUser[];
    /** Маршрут изменён — перечитать карточку. */
    onRouteChanged?: () => Promise<void> | void;
}

export function SzApprovalSection({
    sz, route, users, approval, currentUserId, saving, canEditRoute, people = [], onRouteChanged,
}: SzApprovalSectionProps) {
    const {t} = useTranslation();

    // Правка состава маршрута на согласовании: добавить согласующего (новым этапом) и
    // убрать того, кто ещё не вынес решения. Подписанное содержимое не меняется — круг не перезапускается.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [picked, setPicked] = useState<number[]>([]);
    const [beforeStep, setBeforeStep] = useState<number | "">("");
    const [removing, setRemoving] = useState<RouteParticipant | null>(null);
    const [routeBusy, setRouteBusy] = useState(false);
    const laterSteps = route.steps.filter((s) => s.order > route.currentStepOrder);

    const addPicked = async (ids: number[]) => {
        if (ids.length === 0) return;
        setRouteBusy(true);
        try {
            // По одному: каждый — отдельный этап, в выбранном порядке.
            for (const userId of ids) {
                await szService.addRouteParticipant(sz.id, userId, beforeStep === "" ? undefined : beforeStep);
            }
            toast.success(t("szCard.correction.participantsAdded", {count: ids.length}));
        } catch (e) {
            toast.error(serverMessage(e) ?? t("szCard.correction.routeChangeFailed"));
        } finally {
            setRouteBusy(false);
            setPicked([]);
            await onRouteChanged?.();
        }
    };

    const confirmRemove = async () => {
        if (!removing) return;
        setRouteBusy(true);
        try {
            await szService.removeRouteParticipant(sz.id, removing.id);
            toast.success(t("szCard.correction.participantRemoved"));
        } catch (e) {
            toast.error(serverMessage(e) ?? t("szCard.correction.routeChangeFailed"));
        } finally {
            setRouteBusy(false);
            setRemoving(null);
            await onRouteChanged?.();
        }
    };
    const {
        myParticipant, openRemarks, resolve, confirmRemark,
        qualifiedDialogOpen, setQualifiedDialogOpen, oepModalOpen, setOepModalOpen, ecp,
    } = approval;

    // Журнал подписей ЭЦП — перечитываем при каждом обновлении маршрута (новое решение → новая подпись).
    const [signatures, setSignatures] = useState<SzResolutionSignature[]>([]);
    const [journalError, setJournalError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        szEcpService.signatures(sz.id)
            .then((data) => { if (!cancelled) { setSignatures(data); setJournalError(false); } })
            .catch(() => { if (!cancelled) { setSignatures([]); setJournalError(true); } });
        return () => { cancelled = true; };
    }, [sz.id, route]);
    const ecpByParticipant = useMemo(
        () => new Map(signatures.map((s) => [s.routeParticipantId, s] as const)),
        [signatures],
    );

    return (
        <SzPanel>
            <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[15px] font-semibold">{t("szCard.approval.title")}</h2>
                <span className="text-[12.5px] text-[#8b97ab]">
                    {t(`szCard.routeStatus.${route.status}`)}
                    {sz.approvalRounds > 1 && ` · ${t("szCard.approval.round", {n: sz.approvalRounds})}`}
                </span>
            </div>

            {/* Обзорная цепочка этапов — как в ВНД; ниже подробный список с резолюциями. */}
            <div className="mb-3">
                <RouteFlowView route={route}/>
            </div>

            <SzRouteSteps route={route} users={users} ecpByParticipant={ecpByParticipant}
                          onRemove={canEditRoute && route.status === "Running" ? setRemoving : undefined}/>

            {canEditRoute && route.status === "Running" && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setPickerOpen(true)} disabled={routeBusy || saving}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-dashed border-[#c9d3e3] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#2f68f5] hover:bg-[#f6f8fb] disabled:opacity-50">
                        <UserPlus size={14}/>
                        {t("szCard.correction.addParticipant")}
                    </button>
                    {laterSteps.length > 0 && (
                        <select value={beforeStep} disabled={routeBusy || saving}
                                onChange={(e) => setBeforeStep(e.target.value === "" ? "" : Number(e.target.value))}
                                className="h-[30px] rounded-[8px] border border-[#e5e9f0] bg-white px-2 text-[12.5px] text-[#55617a]">
                            <option value="">{t("szCard.correction.positionDefault")}</option>
                            {laterSteps.map((s) => (
                                <option key={s.id} value={s.order}>
                                    {t("szCard.correction.positionBefore", {order: s.order})}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {pickerOpen && (
                <SzUserMultiPickerModal
                    people={people}
                    value={picked}
                    onChange={setPicked}
                    title={t("szCard.correction.addParticipant")}
                    onClose={() => { setPickerOpen(false); void addPicked(picked); }}
                    accent="blue"
                    avatars
                />
            )}

            <ConfirmActionModal
                open={!!removing}
                onClose={() => setRemoving(null)}
                onConfirm={confirmRemove}
                title={t("szCard.correction.removeTitle")}
                message={t("szCard.correction.removeMessage", {
                    name: removing?.userFullName ?? (removing?.userId ? users[removing.userId] : "") ?? "",
                })}
                confirmLabel={t("szCard.correction.removeParticipant")}
                loadingLabel={t("szCard.correction.removeParticipant")}
                loading={routeBusy}
                variant="danger"
                icon={UserMinus}
            />

            {myParticipant && <SzDecisionPanel approval={approval} saving={saving}/>}

            {(signatures.length > 0 || journalError) && (
                <SzSignatureJournal szId={sz.id} items={signatures} loadError={journalError}/>
            )}

            {/* ЭЦП ГП «Инфоком»: окно ПИН/кода открывается, только если нет ни сохранённой
                идентификации, ни действующей сессии (см. useEcpHashSigning). */}
            {ecp.modalOpen && ecp.modalGetHash && (
                <EcpSignModal
                    getHash={ecp.modalGetHash}
                    onSigned={ecp.handleModalSigned}
                    onClose={ecp.handleModalClose}
                />
            )}

            {qualifiedDialogOpen && (
                <QualifiedSignDialog
                    documentId={sz.documentId}
                    onClose={() => setQualifiedDialogOpen(false)}
                    onSigned={async (signature) => {
                        setQualifiedDialogOpen(false);
                        // Подпись поставлена - теперь ею закрывается этап. Разрыв
                        // между этими действиями оставил бы подпись без резолюции.
                        await resolve("Approved", signature.id);
                    }}
                />
            )}

            {oepModalOpen && (
                <OepSignModal
                    documentId={sz.documentId}
                    fileName={sz.regNumber ? `${sz.regNumber} · ${sz.title}` : sz.title}
                    onClose={() => setOepModalOpen(false)}
                    onSigned={async (result) => {
                        setOepModalOpen(false);
                        // Облачная подпись поставлена — ею же закрываем этап.
                        await resolve("Approved", result.signatureId);
                    }}
                />
            )}

            {openRemarks.length > 0 && sz.authorId === currentUserId && (
                <SzRemarksPanel remarks={openRemarks} users={users} saving={saving} onConfirm={confirmRemark}/>
            )}
        </SzPanel>
    );
}
