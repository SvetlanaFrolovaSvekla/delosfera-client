// Блок "Согласование": цепочка этапов, подробный список с резолюциями, решение
// текущего пользователя, окна подписания и замечания к устранению.
import {useTranslation} from "react-i18next";
import type {SzDetails} from "@/service/szService/szService.ts";
import type {RouteInstance} from "@/service/workflowService/workflowService.ts";
import type {SzApprovalState} from "@/hooks/sz/useSzApproval.ts";
import {RouteFlowView} from "@/components/componentsWorkflow/RouteFlowView.tsx";
import {QualifiedSignDialog} from "@/components/signing/QualifiedSignDialog.tsx";
import {OepSignModal} from "@/components/signing/OepSignModal.tsx";
import {SzPanel} from "@/components/componentsSz/SzPanel.tsx";
import {SzRouteSteps} from "@/components/componentsSz/componentsApprovals/SzRouteSteps.tsx";
import {SzDecisionPanel} from "@/components/componentsSz/componentsApprovals/SzDecisionPanel.tsx";
import {SzRemarksPanel} from "@/components/componentsSz/componentsApprovals/SzRemarksPanel.tsx";

interface SzApprovalSectionProps {
    sz: SzDetails;
    route: RouteInstance;
    users: Record<number, string>;
    approval: SzApprovalState;
    currentUserId: number | undefined;
    saving: boolean;
}

export function SzApprovalSection({sz, route, users, approval, currentUserId, saving}: SzApprovalSectionProps) {
    const {t} = useTranslation();
    const {
        myParticipant, openRemarks, resolve, confirmRemark,
        qualifiedDialogOpen, setQualifiedDialogOpen, oepModalOpen, setOepModalOpen,
    } = approval;

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

            <SzRouteSteps route={route} users={users}/>

            {myParticipant && <SzDecisionPanel approval={approval} saving={saving}/>}

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
