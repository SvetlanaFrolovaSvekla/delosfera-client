// Оформление кнопок решений панели резолюции (цвета, тени, иконки) и соответствие кнопки
// решению на backend.
import {ApprovalDecisionType} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {ResolutionChoice} from "@/components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/resolutionPanel/resolutionPanelTypes.ts";
import {Check, MessageSquare, X} from "lucide-react";

// approve и approveWithComment — зелёная тема (оба позитивные исходы), reject — красная
export const CHOICE_THEME: Record<ResolutionChoice, {
    border: string; bg: string; dot: string; buttonBg: string; buttonHover: string; icon: typeof Check;
}> = {
    approve: {
        border: "border-[#7fd4a3]", bg: "bg-[#eef9f2]", dot: "bg-[#2f9e5c]",
        buttonBg: "bg-[#1f7a4c]", buttonHover: "hover:bg-[#1a6b42]", icon: Check,
    },
    approveWithComment: {
        border: "border-[#7fd4a3]", bg: "bg-[#eef9f2]", dot: "bg-[#2f9e5c]",
        buttonBg: "bg-[#1f7a4c]", buttonHover: "hover:bg-[#1a6b42]", icon: MessageSquare,
    },
    reject: {
        border: "border-[#e8a6a6]", bg: "bg-[#fdf1f1]", dot: "bg-[#c0392b]",
        buttonBg: "bg-[#c0392b]", buttonHover: "hover:bg-[#a53023]", icon: X,
    },
};

// Мягкая цветная тень под кнопками решений (в цвет самой кнопки)
export const DECISION_BUTTON_SHADOW: Record<ResolutionChoice, string> = {
    approve: "shadow-[0_8px_16px_-8px_rgba(31,122,76,.7)] hover:shadow-[0_10px_20px_-8px_rgba(31,122,76,.8)]",
    approveWithComment: "shadow-[0_8px_16px_-8px_rgba(31,122,76,.7)] hover:shadow-[0_10px_20px_-8px_rgba(31,122,76,.8)]",
    reject: "shadow-[0_8px_16px_-8px_rgba(192,57,43,.7)] hover:shadow-[0_10px_20px_-8px_rgba(192,57,43,.8)]",
};

// Цвет вертикальной черты у пояснения - в тон кнопки
export const HINT_ACCENT: Record<ResolutionChoice, string> = {
    approve: "border-[#7fd4a3]",
    approveWithComment: "border-[#7fd4a3]",
    reject: "border-[#e8a6a6]",
};

export const ACTIONS: ResolutionChoice[] = ["approve", "approveWithComment", "reject"];

export const TEST_ACTION_STYLE: Record<ResolutionChoice, string> = {
    approve: "border-[#9fd3b4] text-[#1f7a45] hover:bg-[#f1faf4]",
    approveWithComment: "border-[#9fd3b4] text-[#1f7a45] hover:bg-[#f1faf4]",
    reject: "border-[#e8a6a6] text-[#c0392b] hover:bg-[#fdf1f1]",
};

export const CHOICE_TO_DECISION: Record<ResolutionChoice, ApprovalDecisionType> = {
    approve: ApprovalDecisionType.Approve,
    approveWithComment: ApprovalDecisionType.ApproveWithComment,
    reject: ApprovalDecisionType.Reject,
};
