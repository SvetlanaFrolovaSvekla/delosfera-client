import {
    type ApprovalStageDecisionResponse, type ApprovalStageKindResponse,
    type ApprovalProcessStatus
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {ShieldCheck, User} from "lucide-react";
import {getWorkDayMinutes} from "@/utils/workCalendar.ts";

// Максимальное число согласующих
export const MAX_STAGES = 10;

// Максимальное число файлов, которые согласующий может приложить к своей резолюции
export const MAX_RESOLUTION_ATTACHMENTS = 5;

// Максимальный размер ОДНОГО файла, приложенного согласующим к резолюции (100 МБ)
export const MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;

// Максимальная длина текста комментария/причины отклонения в резолюции согласующего
export const MAX_RESOLUTION_COMMENT_LENGTH = 35000;

// Длина, после которой комментарий/замечание обрезается в списках с кнопкой "См. полностью"
export const COMMENT_TRUNCATE_LENGTH = 260;

// Нормативы согласования считаются в РАБОЧИХ минутах: срок идёт только пн–пт в рабочие часы
// банка (по умолчанию 09:00–18:00 по Бишкеку), без праздников — и часы, и праздники задаются в
// справочнике "Производственный календарь"; 1 д. = 1 рабочий день банка = getWorkDayMinutes()
// (см. utils/workCalendar.ts и VndWorkingCalendar на бэкенде). Поэтому значения ниже — функции:
// длина рабочего дня может смениться в справочнике.

// Верхняя граница норматива срока согласования - 90 рабочих дней (в рабочих минутах).
// Ограничивает поля в NormBlock и должна совпадать с Rules.MaxDeadlineMinutes на бэкенде
export const MAX_DEADLINE_WORK_DAYS = 90;
export const getMaxDeadlineMinutes = () => MAX_DEADLINE_WORK_DAYS * getWorkDayMinutes();

// Встроенные нормативы по умолчанию (рабочие минуты) - используются, пока не загрузился справочник
// "Нормативы согласования по умолчанию" (раздел ВНД), и должны совпадать с
// VndApprovalNormSettings.Default*Minutes на бэкенде: 7 д. / 4 д. / 3 д. (рабочих)
export const getDefaultNormMinutes = () => {
    const day = getWorkDayMinutes();
    return {primary: 7 * day, repeat: 4 * day, finalHold: 3 * day};
};

// Обязательные (фиксированные) этапы ведутся динамическим справочником (dictionaries/coordination-users)
export const FIXED_STAGE_ICON = ShieldCheck;
export const CUSTOM_STAGE_ICON = User;

// Название для произвольного (не из справочника) этапа, добавленного инициатором вручную
export const CUSTOM_STAGE_LABEL = "Доп. согласующий";

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
    removed_by_editor: {
        label: "Недействующий (убран главным редактором)",
        borderClass: "border-[#c7cad1]",
        badgeClass: "bg-[#f1f2f6] text-[#8a8f9c]",
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