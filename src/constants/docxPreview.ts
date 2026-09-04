/** Класс, которым useDocxPreview рендерит содержимое docx (см. options.className, передаваемый
 * в renderAsync из библиотеки docx-preview). Единый источник истины: используется и при рендере
 * (useDocxPreview.ts), и при сопоставлении заголовков документа с их DOM-узлами в отрендеренном
 * тексте (utils/docxHeadings.ts, RedactionContentsPanel.tsx) — чтобы клик по пункту "Содержания"
 * мог найти и проскроллить нужный заголовок. */
export const DOCX_PREVIEW_CLASS_NAME = "docx-preview-content";
