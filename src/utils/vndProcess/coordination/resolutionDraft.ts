// Черновик резолюции в браузере (localStorage) и сборка итогового текста резолюции из общего
// комментария и замечаний к тексту. Вынесено из VndApproverResolutionPanel без изменений логики.
import {formatQuoteLine, QUOTE_NOTE_PREFIX} from "@/utils/vndProcess/quoteText.ts";
import type {DraftTextRemark, ResolutionChoice} from "../../../components/componentsVND/componentsOpenVndPage/componentsCoordinationTab/resolutionPanel/resolutionPanelTypes.ts";

// Строка, начинающаяся с "Цитата: «", при отображении резолюции считается цитатой и
// сопоставляется со списком сохранённых цитат ПО ПОРЯДКУ (см. FormattedResolutionComment). Если
// пользователь сам напечатает такую строку в комментарии/замечании, порядок собьётся - поэтому в
// свободном тексте этот префикс слегка меняем.
function neutralizeQuoteMarkers(text: string): string {
    return text.replace(/^(\s*)Цитата: «/gm, "$1Цитата «");
}

/** Итоговый текст резолюции: общий комментарий, затем по каждой карточке строка
 * "Цитата: «...»" и (если есть) строка "Замечание: ...". Формат строк цитат прежний, поэтому
 * история, лист согласования, уведомления и уже отправленные резолюции отображаются как раньше. */
export function composeResolutionComment(comment: string, remarks: DraftTextRemark[]): string {
    const blocks: string[] = [];
    const general = neutralizeQuoteMarkers(comment.trim());
    if (general) blocks.push(general);
    for (const r of remarks) {
        const lines = [formatQuoteLine(r.displayText)];
        const note = neutralizeQuoteMarkers(r.note.trim());
        if (note) lines.push(`${QUOTE_NOTE_PREFIX}${note}`);
        blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n");
}

export interface StoredDraft {
    choice: ResolutionChoice;
    comment: string;
    remarks: DraftTextRemark[];
    savedAt: number;
}

// Черновик старше этого срока не восстанавливаем - скорее всего он уже неактуален.
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function loadDraft(key: string | undefined): StoredDraft | null {
    if (!key) return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredDraft;
        if (!parsed || !Array.isArray(parsed.remarks) || typeof parsed.comment !== "string") return null;
        if (Date.now() - (parsed.savedAt ?? 0) > DRAFT_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveDraft(key: string | undefined, draft: StoredDraft | null) {
    if (!key) return;
    try {
        if (!draft) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(draft));
    } catch {
        // Приватный режим/переполненное хранилище - черновик просто не сохранится.
    }
}

let draftIdSeq = 0;
export function nextDraftId(): number {
    draftIdSeq = (draftIdSeq + 1) % 1000;
    return -(Date.now() * 1000 + draftIdSeq);
}
