import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowRight, BookOpen, Download, Eye, FileText, Info, Loader2, TriangleAlert} from "lucide-react";
import {helpService, type HelpBlock} from "@/service/helpService/helpService.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {HelpScreenshot} from "@/components/help/HelpScreenshot.tsx";
import {HelpAttachmentPreviewModal} from "@/components/help/HelpAttachmentPreviewModal.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";

/**
 * Отрисовка тела статьи.
 *
 * Блоки нужны затем, что инструкция состоит из разных по смыслу вещей: объяснение
 * читают, шаги выполняют, предупреждение должно остановить. Сплошным текстом это
 * различие теряется, и человек пропускает ровно ту строку, ради которой всё писалось.
 *
 * Ссылка на раздел — не украшение: она отвечает на вопрос «где это в системе», не
 * заставляя читателя искать пункт меню по описанию.
 */

interface Props {
    body: HelpBlock[];

    /** Строка поиска по инструкциям: её совпадения подсвечиваются в тексте статьи. */
    highlight?: string;
}

export const HelpArticleView = ({body, highlight = ""}: Props) => {
    const navigate = useNavigate();
    const {t} = useTranslation();

    // Текст блока с подсветкой совпадений (без запроса — просто текст).
    const hl = (text: string) => <HighlightText text={text} query={highlight}/>;

    if (body.length === 0) {
        return (
            <p className="text-[13px] text-[#8b97ab]">
                {t("help.view.empty")}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {body.map((block, i) => {
                switch (block.kind) {
                    case "image":
                        return (
                            <HelpScreenshot
                                key={i}
                                fileId={block.fileId}
                                caption={block.caption}
                                markers={block.markers}
                            />
                        );

                    case "text":
                        return (
                            <p key={i} className="m-0 max-w-[70ch] whitespace-pre-line text-[14px] leading-[1.75] text-[#26324a]">
                                {hl(block.text)}
                            </p>
                        );

                    case "steps":
                        return (
                            <ol key={i} className="m-0 flex list-none flex-col gap-2.5 p-0">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ececfc] text-[12px] font-bold text-[#4e57d6]">
                                            {j + 1}
                                        </span>
                                        <span className="max-w-[66ch] pt-0.5 text-[14px] leading-[1.65] text-[#26324a]">
                                            {hl(item)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        );

                    case "note": {
                        const warning = block.tone === "warning";
                        const Icon = warning ? TriangleAlert : Info;

                        return (
                            <div key={i}
                                 className={`flex max-w-[70ch] items-start gap-2.5 rounded-[10px] border px-4 py-3 ${
                                     warning
                                         ? "border-[#f0dcae] bg-[#fdf3e0]"
                                         : "border-[#d9dcf7] bg-[#f4f5ff]"}`}>
                                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${
                                    warning ? "text-[#b3730a]" : "text-[#4e57d6]"}`} strokeWidth={2}/>
                                <span className={`text-[13.5px] leading-[1.65] ${
                                    warning ? "text-[#8a5a00]" : "text-[#26324a]"}`}>
                                    {hl(block.text)}
                                </span>
                            </div>
                        );
                    }

                    case "link":
                        return (
                            <button key={i} onClick={() => navigate(block.path)}
                                    className="flex w-fit cursor-pointer items-center gap-2 rounded-[10px] border border-[#d9dcf7] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#4e57d6] hover:bg-[#f4f5ff]">
                                {hl(block.label)}
                                <ArrowRight className="h-4 w-4" strokeWidth={2}/>
                            </button>
                        );

                    case "vnd":
                        return (
                            <button key={i} onClick={() => navigate(`/base-vnd/${block.documentId}`)}
                                    className="flex w-fit items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#55617a] hover:border-[#d9dcf7]">
                                <BookOpen className="h-4 w-4 text-[#8b97ab]" strokeWidth={2}/>
                                {hl(block.label)}
                            </button>
                        );

                    case "file":
                        return (
                            <HelpFileAttachment
                                key={i}
                                fileId={block.fileId}
                                fileName={block.fileName}
                                size={block.size}
                            />
                        );

                    default:
                        // Блок неизвестного вида мог прийти из более новой версии:
                        // молча пропускаем, чтобы не рушить всю статью.
                        return null;
                }
            })}
        </div>
    );
};

/**
 * Карточка приложенного файла (блок "file"): имя, размер и две кнопки — «Просмотр»
 * открывает файл в модалке (рендер через docx-preview), «Скачать» сохраняет его в
 * браузере. Обе читают файл с /help/files (см. HelpController.GetFile) — доступ
 * зависит от публикации статьи, а не от общих правил доступа к файлам ВНД.
 */
function HelpFileAttachment({fileId, fileName, size}: {fileId: number; fileName: string; size: number}) {
    const {t} = useTranslation();
    const [просмотр, setПросмотр] = useState(false);
    const [скачивается, setСкачивается] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const скачать = async () => {
        setСкачивается(true);
        setОшибка(null);
        try {
            await helpService.downloadFile(fileId, fileName);
        } catch {
            setОшибка(t("help.view.downloadFailed"));
        } finally {
            setСкачивается(false);
        }
    };

    return (
        <div className="flex max-w-[70ch] items-center gap-3 rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                <FileText size={18} strokeWidth={1.8}/>
            </span>

            <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-[#1c2740]">{fileName}</div>
                <div className="mt-0.5 text-[11.5px] text-[#8b97ab]">
                    {formatFileSize(size)}{ошибка && <span className="ml-2 text-[#c0392b]">{ошибка}</span>}
                </div>
            </div>

            <div className="flex flex-none items-center gap-2">
                <button onClick={() => setПросмотр(true)}
                        className="flex items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#55617a] hover:border-[#d9dcf7]">
                    <Eye className="h-4 w-4" strokeWidth={2}/>
                    {t("help.view.preview")}
                </button>
                <button onClick={() => void скачать()} disabled={скачивается}
                        className="flex items-center gap-1.5 rounded-[9px] border border-[#d9dcf7] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#f4f5ff] disabled:opacity-50">
                    {скачивается ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    ) : (
                        <Download className="h-4 w-4" strokeWidth={2}/>
                    )}
                    {t("help.view.download")}
                </button>
            </div>

            {просмотр && (
                <HelpAttachmentPreviewModal
                    fileId={fileId}
                    fileName={fileName}
                    onClose={() => setПросмотр(false)}
                />
            )}
        </div>
    );
}
