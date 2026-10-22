// Общие типы панели резолюции согласующего (VndApproverResolutionPanel).
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";

export type ResolutionChoice = "approve" | "approveWithComment" | "reject";

/** Каким способом принимается решение: с ЭЦП ГП «Инфоком»; тестовое без ЭЦП
 * (EcpSigning:AllowWithoutEcp); тестовая имитация ЭЦП (EcpSigning:AllowVndTestEcp); локальной
 * подписью системы «Делосфера» (право SignWithoutNationalEcp — сотрудник без ЭЦП КР). */
export type DecisionMode = "ecp" | "withoutEcp" | "testEcp" | "system";

export type ResolutionPhase = "primary" | "repeated" | "finalHold";

export interface DraftTextRemark {
    /** Отрицательный локальный id - не пересекается с id сохранённых цитат (они > 0), поэтому
     * черновик можно подсвечивать в тексте документа вместе с чужими цитатами. */
    id: number;
    documentTarget: RedactionViewTarget;
    /** Текст для поиска в документе (без многоточия, см. quoteMatchText). */
    text: string;
    /** Текст для отображения в резолюции (обрезанный с многоточием, см. quoteDisplayText). */
    displayText: string;
    prefix: string | null;
    suffix: string | null;
    occurrence: number | null;
    /** Замечание к этому фрагменту - необязательно. */
    note: string;
}
