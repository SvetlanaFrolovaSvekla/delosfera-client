// Тип состояния "какая модалка сейчас открыта" в табе "Ход согласования" - общий для
// VndCoordinationTab и VndRedactionModals.
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import type {QuoteAnchorContext} from "@/utils/docxWork/quoteAnchor.ts";

export type CoordinationModal =
    | { kind: "startApproval" }
    | { kind: "compare" }
    | {
    kind: "view";
    redaction: VndRedactionResponse;
    /* Не указывается для режима "сослаться на текст" (см. VndCoordinationTab.handleCiteRequest) -
     там нет конкретной вкладки, с которой имело бы смысл начинать, открываем как есть (первый
     доступный язык), и пользователь сам переключается, если нужно). Для "перейти к цитате"
     (см. handleJumpToQuote) - вкладка, к которой относится сама цитата. */
    language?: RedactionViewTarget;
    /* Передаётся только когда модалка открыта через "+ Сослаться на текст редакции" -
     превращает обычный просмотр в режим цитирования (см. RedactionViewModal.onInsertQuote). */
    onInsertQuote?: (
        selectedText: string, documentTarget: RedactionViewTarget, anchor: QuoteAnchorContext | null,
    ) => void;
    /* Передаётся только когда модалка открыта, чтобы сразу проскроллить к месту одной из
     уже вставленных цитат (см. handleJumpToQuote/RedactionViewModal.initialSearchQuery). */
    initialSearchQuery?: string;
    /* Версия документа редакции, к которой относится цитата (см.
     FormattedCommentQuoteRef.revisionIndex) - передаётся вместе с initialSearchQuery, чтобы
     "Показать в тексте" открывало именно ту версию, к которой относится цитата, а не текущую
     живую (см. handleShowQuoteInText/RedactionViewModal.initialRevisionIndex). */
    initialRevisionIndex?: number;
    /* "Показать в тексте" - id цитаты (сохранённой или черновой), к которой прокрутить и которую
     выделить (см. RedactionViewModal.initialFocusQuoteId). Если задан, initialSearchQuery не нужен. */
    initialFocusQuoteId?: number;
};
