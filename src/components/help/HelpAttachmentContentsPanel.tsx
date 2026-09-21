// Панель "Содержание" для просмотра файла, приложенного к статье инструкции
// (HelpAttachmentPreviewModal) — тонкая обёртка над общим DocxContentsPanel (componentsGeneral),
// с фиксированной шириной колонки и без кнопки закрытия (панель предполагается всегда видимой).
// Отдельная от ВНД-обёртки (RedactionContentsPanel), т.к. файл читается с /help/files, а не с
// общего /files (см. basePath).
import {DocxContentsPanel} from "@/components/componentsGeneral/DocxContentsPanel.tsx";

interface Props {
    /** ID приложенного файла — то же значение, что уходит в useDocxPreview модалки. */
    fileId: number | null;
    /** DOM-узел, в который отрендерен docx-preview (containerRef модалки) — нужен, чтобы
     * найти и проскроллить к заголовку по клику. */
    getContainer: () => HTMLDivElement | null;
}

export function HelpAttachmentContentsPanel({fileId, getContainer}: Props) {
    return (
        <DocxContentsPanel
            fileId={fileId}
            basePath="help/files"
            getContainer={getContainer}
            className="flex h-full min-h-0 w-[260px] flex-none flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
        />
    );
}