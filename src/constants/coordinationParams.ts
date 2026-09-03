import {
    type ApprovalStageDecisionResponse, type ApprovalStageKindResponse,
    type ApprovalProcessStatus
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {ShieldCheck, User} from "lucide-react";

// Максимальное число согласующих
export const MAX_STAGES = 10;

// Максимальное число файлов, которые согласующий может приложить к своей резолюции
// (см. VndApproverResolutionPanel) — ограничивает нагрузку на хранилище документа;
// вложения хранятся бессрочно как часть истории согласования.
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

// Длина, после которой комментарий/замечание обрезается в списках с кнопкой "См. полностью"
// (см. RemarkCard в VndRevisionNeededPanel, VndApprovalSummary, VndApprovalRouteView) —
// полный текст открывается в CommentViewModal.
export const COMMENT_TRUNCATE_LENGTH = 260;

// Верхняя граница норматива срока согласования (в минутах) — 90 дней.
// Ограничивает поля "ч." / "м." в NormBlock и должна совпадать с MaxDeadlineMinutes
// на бэкенде (VndApprovalService.StartAsync), где является финальной защитой:
// без неё слишком большое значение минут ломает расчёт дедлайна (DateTime overflow).
export const MAX_DEADLINE_MINUTES = 90 * 24 * 60;
export const MAX_DEADLINE_HOURS = Math.floor(MAX_DEADLINE_MINUTES / 60);

// Обязательные (фиксированные) этапы теперь ведутся динамическим справочником
// (dictionaries/coordination-users, см. useCoordinationApprovers) - их название, СП и
// согласующий по умолчанию больше не хардкодятся на фронте. Иконка у всех обязательных
// этапов одна общая (в отличие от произвольных Custom-этапов, добавляемых инициатором).
export const FIXED_STAGE_ICON = ShieldCheck;
export const CUSTOM_STAGE_ICON = User;

// Название для произвольного (не из справочника) этапа, добавленного инициатором вручную
export const CUSTOM_STAGE_LABEL = "Доп. этап";

/** true, если ответ бэка описывает произвольный (не обязательный) этап маршрута */
export function isCustomStageKind(kind: ApprovalStageKindResponse): boolean {
    return kind === "custom";
}

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