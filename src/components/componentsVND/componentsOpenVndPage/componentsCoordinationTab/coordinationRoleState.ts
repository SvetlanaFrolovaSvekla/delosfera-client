// Производные флаги роли/фазы согласования для текущего пользователя, плюс конфиг цветной
// шапки над установленным маршрутом (см. VndCoordinationRouteSection) — вынесено из
// VndCoordinationTab, чтобы не пересчитывать это вручную прямо в JSX. Обе функции чистые
// (не хуки) и вызываются уже ПОСЛЕ проверки "process существует" в VndCoordinationTab.
import type {ComponentType} from "react";
import {CheckCircle2, Clock3, XCircle} from "lucide-react";
import type {ApprovalProcessResponse, ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

export interface CoordinationRoleState {
    isPrimaryPhase: boolean;
    isRepeatedPhase: boolean;
    isFinalHoldPhase: boolean;
    isRevisionNeeded: boolean;
    isApproved: boolean;
    isRejected: boolean;
    /** Согласование ещё идёт - маркеры цитат в тексте редакции кликабельны (открывают
     * резолюцию целиком) только пока это так; после завершения (согласовано/отклонено) маркеры
     * остаются видны, но клик по ним больше ничего не открывает - см.
     * RedactionViewModal.quoteMarksClickable. */
    isProcessActive: boolean;
    /** Этап текущего пользователя на активной сейчас фазе - на финальной выдержке решение
     * может принять ЛЮБОЙ согласующий маршрута, поэтому ищем именно "мой" этап. */
    myStage: ApprovalStageResponse | undefined;
    isInitiator: boolean;
    isApprover: boolean;
    /** На финальной выдержке участие добровольное. */
    isPendingForMe: boolean;
}

export function getCoordinationRoleState(
    process: ApprovalProcessResponse,
    currentUserId: number | undefined,
): CoordinationRoleState {
    const isPrimaryPhase = process.status === "primary";
    const isRepeatedPhase = process.status === "repeated";
    const isFinalHoldPhase = process.status === "final_hold";
    const isRevisionNeeded = process.status === "revision_needed";
    const isApproved = process.status === "approved";
    const isRejected = process.status === "rejected";
    const isProcessActive = !isApproved && !isRejected;

    const myStage = process.stages.find((s) => {
        if (isPrimaryPhase) return s.approverUserId === currentUserId;
        if (isRepeatedPhase) return s.approverUserId === currentUserId && s.participatesInRepeat;
        if (isFinalHoldPhase) return s.approverUserId === currentUserId;
        return false;
    });

    const isInitiator = process.initiatorUserId === currentUserId;
    const isApprover = !isInitiator && !!myStage;

    const isPendingForMe =
        !!myStage &&
        ((isPrimaryPhase && myStage.primaryDecision === "pending") ||
            (isRepeatedPhase && (myStage.repeatDecision === null || myStage.repeatDecision === "pending")) ||
            (isFinalHoldPhase && (myStage.finalHoldDecision === null || myStage.finalHoldDecision === "pending")));

    return {
        isPrimaryPhase,
        isRepeatedPhase,
        isFinalHoldPhase,
        isRevisionNeeded,
        isApproved,
        isRejected,
        isProcessActive,
        myStage,
        isInitiator,
        isApprover,
        isPendingForMe,
    };
}

export interface RouteHeaderConfig {
    border: string;
    bg: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    iconColor: string;
    titleColor: string;
    textColor: string;
    title: string;
    description: string;
}

/** Конфиг цветной шапки над установленным маршрутом согласования - null, если шапка сейчас не
 * нужна (согласование в обычном ходе). Порядок проверок важен: "согласовано" и "отклонено" -
 * финальные статусы, "на доработке" показывается только тем, кто НЕ является инициатором (сам
 * инициатор видит вместо этого отдельную панель с замечаниями - см.
 * VndCoordinationTab/VndRevisionNeededPanel). */
export function getRouteHeaderConfig(
    status: ApprovalProcessResponse["status"],
    isInitiator: boolean,
    t: (key: string) => string,
): RouteHeaderConfig | null {
    if (status === "approved") {
        return {
            border: "border-[#bfe3cc]", bg: "bg-[#eef9f2]",
            icon: CheckCircle2, iconColor: "text-[#1f7a4c]",
            titleColor: "text-[#1c5e37]", textColor: "text-[#2f6b47]",
            title: t("openVndPage.coordinationTab.approvedTitle"),
            description: t("openVndPage.coordinationTab.approvedDescription"),
        };
    }
    if (status === "rejected") {
        return {
            border: "border-[#f2c2c2]", bg: "bg-[#fdf1f1]",
            icon: XCircle, iconColor: "text-[#c0392b]",
            titleColor: "text-[#8f2a1f]", textColor: "text-[#a63a2c]",
            title: t("openVndPage.coordinationTab.rejectedTitle"),
            description: t("openVndPage.coordinationTab.rejectedDescription"),
        };
    }
    if (status === "revision_needed" && !isInitiator) {
        return {
            border: "border-[#f0dcae]", bg: "bg-[#fdf6e8]",
            icon: Clock3, iconColor: "text-[#9a6408]",
            titleColor: "text-[#7a5006]", textColor: "text-[#8a6a1f]",
            title: t("openVndPage.coordinationTab.revisionInProgressTitle"),
            description: t("openVndPage.coordinationTab.revisionInProgressDescription"),
        };
    }
    return null;
}
