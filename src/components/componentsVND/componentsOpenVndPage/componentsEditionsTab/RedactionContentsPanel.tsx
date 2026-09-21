// Панель с содержанием редакции — третьей колонкой рядом с сайдбаром. Тонкая обёртка над общим
// DocxContentsPanel (componentsGeneral): fileId — тот же файл, который сейчас отображается в
// RedactionTextView (тот же язык/документ), содержание строится по нему, а не по редакции целиком.
import {DocxContentsPanel} from "@/components/componentsGeneral/DocxContentsPanel.tsx";

interface RedactionContentsPanelProps {
    /** ID файла, который сейчас отображается в RedactionTextView (тот же язык/документ) —
     * содержание строится по нему, а не по редакции целиком. */
    fileId: number | null;
    /** DOM-узел, в который отрендерен docx-preview (RedactionTextViewHandle.getContainer) —
     * нужен, чтобы найти и проскроллить к заголовку по клику. */
    getContainer: () => HTMLDivElement | null;
    onClose: () => void;
    /** Ограничение высоты панели — по умолчанию как во вкладке "Редакции" (max-h-[750px],
     * третья колонка фиксированной сетки). Передайте другое значение при встраивании в модалки
     * с иной доступной высотой — например, "max-h-full" во всплывающей панели поверх документа
     * (RedactionViewModal/RedactionCompareModal). */
    maxHeightClass?: string;
}

export function RedactionContentsPanel({
                                           fileId, getContainer, onClose, maxHeightClass = "max-h-[750px]",
                                       }: RedactionContentsPanelProps) {
    return (
        <DocxContentsPanel
            fileId={fileId}
            getContainer={getContainer}
            onClose={onClose}
            className={`flex ${maxHeightClass} min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white`}
        />
    );
}