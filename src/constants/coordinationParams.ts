import {
    ApprovalStageKind, type ApprovalStageDecisionResponse, type ApprovalStageKindResponse,
    type ApprovalProcessStatus
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {BookOpen, type LucideIcon, Scale, ShieldAlert, ShieldCheck, User} from "lucide-react";

// Максимальное число согласующих
export const MAX_STAGES = 10;

// Максимальное число файлов, которые согласующий может приложить к своей резолюции
// (см. VndApproverResolutionPanel) — ограничивает нагрузку на хранилище документа,
// вложения к резолюциям хранятся, только пока идёт согласование.
export const MAX_RESOLUTION_ATTACHMENTS = 5;

// Максимальный размер ОДНОГО файла, приложенного согласующим к резолюции
// (см. VndApproverResolutionPanel) — лимит на каждый файл по отдельности, а не суммарно.
// Должен совпадать с MaxResolutionAttachmentSizeBytes на бэкенде (VndApprovalService.DecideAsync) —
// там это уже реальная защита от прямых запросов к API, здесь — блокировка выбора слишком
// большого файла и подсказка пользователю.
export const MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

// Максимальная длина текста комментария/причины отклонения в резолюции согласующего
// (см. VndApproverResolutionPanel).
export const MAX_RESOLUTION_COMMENT_LENGTH = 35000;

// Верхняя граница норматива срока согласования (в минутах) — 90 дней.
// Ограничивает поля "ч." / "м." в NormBlock и должна совпадать с MaxDeadlineMinutes
// на бэкенде (VndApprovalService.StartAsync), где является финальной защитой:
// без неё слишком большое значение минут ломает расчёт дедлайна (DateTime overflow).
export const MAX_DEADLINE_MINUTES = 90 * 24 * 60;
export const MAX_DEADLINE_HOURS = Math.floor(MAX_DEADLINE_MINUTES / 60);

// TODO: сделать настройку в приложении для администратора/главного редактора, чтоб был выбор фиксированных согласующих
export const FIXED_STAGE_ORG_UNITS: Partial<Record<ApprovalStageKind, number>> = {
    [ApprovalStageKind.Legal]: 34,
    [ApprovalStageKind.RiskManagement]: 28,
    [ApprovalStageKind.Compliance]: 5,
    [ApprovalStageKind.Methodology]: 33,
};

// Заголовки фиксированных этапов
export const STAGE_LABELS: Record<ApprovalStageKind, string> = {
    [ApprovalStageKind.Legal]: "Юридическое управление",
    [ApprovalStageKind.RiskManagement]: "Риск-менеджмент",
    [ApprovalStageKind.Compliance]: "Комплаенс-контроль",
    [ApprovalStageKind.Custom]: "Доп. этап",
    [ApprovalStageKind.Methodology]: "Методология",
};

// Иконки для фиксированных этапов
export const STAGE_ICONS: Record<ApprovalStageKind, LucideIcon> = {
    [ApprovalStageKind.Legal]: Scale,
    [ApprovalStageKind.RiskManagement]: ShieldAlert,
    [ApprovalStageKind.Compliance]: ShieldCheck,
    [ApprovalStageKind.Custom]: User,
    [ApprovalStageKind.Methodology]: BookOpen,
};

// Виды этапов для согласования
export const FIXED_KIND_ORDER: ApprovalStageKind[] = [
    ApprovalStageKind.Legal,
    ApprovalStageKind.RiskManagement,
    ApprovalStageKind.Compliance,
    ApprovalStageKind.Methodology,
];

// ===== Маппинг response-кайнда (уже построенный этап с бэка) на request-кайнд (для лейблов/иконок) =====
export const STAGE_KIND_RESPONSE_TO_REQUEST: Record<ApprovalStageKindResponse, ApprovalStageKind> = {
    legal: ApprovalStageKind.Legal,
    risk_management: ApprovalStageKind.RiskManagement,
    compliance: ApprovalStageKind.Compliance,
    custom: ApprovalStageKind.Custom,
    methodology: ApprovalStageKind.Methodology,
};

// ===== Оформление решения по этапу (для read-only карточек уже построенного маршрута) =====
interface DecisionMeta {
    label: string;
    borderClass: string;
    badgeClass: string;
}

export const STAGE_DECISION_META: Record<ApprovalStageDecisionResponse, DecisionMeta> = {
    pending: {
        label: "В ожидании",
        borderClass: "border-[#e5e9f0]",
        badgeClass: "bg-[#f1f2f6] text-[#6b7488]",
    },
    approved: {
        label: "Согласовано",
        borderClass: "border-[#34a853]",
        badgeClass: "bg-[#e8f6ec] text-[#1e8e3e]",
    },
    approved_with_comment: {
        label: "Согласовано с замечаниями",
        borderClass: "border-[#e0a13e]",
        badgeClass: "bg-[#fdf3e3] text-[#b3791b]",
    },
    rejected: {
        label: "Отклонено",
        borderClass: "border-[#e0473e]",
        badgeClass: "bg-[#fdecec] text-[#c0392b]",
    },
    auto_approved_timeout: {
        label: "Просрочка (авто)",
        borderClass: "border-[#7c8fe0]",
        badgeClass: "bg-[#eef0fd] text-[#4e57d6]",
    },
};

interface ProcessStatusMeta {
    label: string;
    badgeClass: string;
}

export const PROCESS_STATUS_META: Record<ApprovalProcessStatus, ProcessStatusMeta> = {
    primary: {
        label: "Первичное согласование",
        badgeClass: "bg-[#e9f0ff] text-[#2f68f5]",
    },
    revision_needed: {
        label: "На доработке",
        badgeClass: "bg-[#fdf3e3] text-[#b3791b]",
    },
    repeated: {
        label: "Согласование после внесённых изменений",
        badgeClass: "bg-[#e9f0ff] text-[#2f68f5]",
    },
    final_hold: {
        label: "Финальная выдержка",
        badgeClass: "bg-[#eef0fd] text-[#4e57d6]",
    },
    approved: {
        label: "Согласовано",
        badgeClass: "bg-[#e8f6ec] text-[#1e8e3e]",
    },
    cancelled: {
        label: "Отозвано",
        badgeClass: "bg-[#f1f2f6] text-[#6b7488]",
    },
    rejected: {
        label: "Отклонено",
        badgeClass: "bg-[#fdecec] text-[#c0392b]",
    },
};

export type ApprovalPhase = "primary" | "repeat" | "finalHold";

export const PHASE_LABELS: Record<ApprovalPhase, { started: string; deadline: string }> = {
    primary: {
        started: "Первичное согласование начато",
        deadline: "Дедлайн первичного согласования",
    },
    repeat: {
        started: "Повторное согласование начато",
        deadline: "Дедлайн повторного согласования",
    },
    finalHold: {
        started: "Финальная выдержка начата",
        deadline: "Дедлайн финальной выдержки",
    },
};