// Модалка с полным текстом резолюции
import {useEffect, useMemo, useRef, useState} from "react";
import {Link} from "react-router-dom";

import {useAuth} from "@/context/AuthContext.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {createPortal} from "react-dom";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {
    countTextMatches,
    FormattedResolutionComment,
    type FormattedCommentQuoteRef,
} from "./FormattedResolutionComment.tsx";

import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {
    AttachmentDocxPreviewModal
} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {ChevronDown, ChevronUp, Download, Loader2, MessageSquareText, X} from "lucide-react";
import {useTranslation} from "react-i18next";
import {generateCommentDocx, safeDocxFileName} from "@/utils/docxWork/docxCommentExport.ts";
import {downloadBlob} from "@/utils/docxWork/docxTidExport.ts";


export function CommentViewModal({
                                     title,
                                     isComment: isCommentProp,
                                     approverName,
                                     approverUserId,
                                     decidedAt,
                                     comment,
                                     attachments,
                                     decisionLabel,
                                     decisionBadgeClass,
                                     onClose,
                                     quotes,
                                     onShowInText,
                                 }: {
    title: string;
    /** true - это комментарий (одобрение), false - замечания. Если не задан, определяется по заголовку. */
    isComment?: boolean;
    approverName: string;
    approverUserId?: number;
    decidedAt?: string | null;
    comment: string;
    attachments: { id: number; fileId: number; fileName: string }[];
    decisionLabel?: string;
    decisionBadgeClass?: string;
    onClose: () => void;
    quotes?: FormattedCommentQuoteRef[];
    onShowInText?: (quote: FormattedCommentQuoteRef) => void;
}) {
    const {t} = useTranslation();
    const {user} = useAuth();
    const isMeApprover = approverUserId !== undefined && approverUserId === user?.id;
    const profileUrl = isMeApprover ? "/profile" : `/users/${approverUserId}`;

    // Явный флаг важен: заголовок переводится, и определять тип по русскому слову нельзя
    const isComment = isCommentProp ?? title.toLowerCase().includes("коммент");

    const authorLabel = isComment
        ? t("commentViewModal.authorComment") // Автор комментария:
        : t("commentViewModal.authorRemark"); // Автор замечания:

    const dateTooltip = isComment
        ? t("commentViewModal.commentCreatedAt") // Дата создания комментария
        : t("commentViewModal.remarkCreatedAt"); // Дата создания замечания

    const [previewAttachment, setPreviewAttachment] = useState<{ fileId: number; fileName: string } | null>(null);

    // Скачивание текста замечаний/комментария в обычном .docx (собирается на клиенте).
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(false);
    const handleDownloadDocx = async () => {
        if (exporting) return;
        setExporting(true);
        setExportError(false);
        try {
            const info: Array<[string, string]> = [
                [authorLabel, approverName],
            ];
            if (decidedAt) info.push([`${t("commentViewModal.docxDate")}:`, formatDateTime(decidedAt)]);
            if (decisionLabel) info.push([t("commentViewModal.resolutionByApprover"), decisionLabel]);

            const docTitle = isComment
                ? t("commentViewModal.docxCommentTitle")
                : t("commentViewModal.docxRemarksTitle");
            const blob = await generateCommentDocx(
                {
                    title: docTitle,
                    info,
                    attachmentNames: attachments.map((a) => a.fileName),
                    attachmentsLabel: t("commentViewModal.docxFiles"),
                },
                comment,
            );
            downloadBlob(blob, safeDocxFileName(`${docTitle} - ${approverName}`));
        } catch {
            setExportError(true);
        } finally {
            setExporting(false);
        }
    };

    // Поиск по тексту замечания/комментария - текст резолюции может доходить до 35000
    // символов (см. лимит в VndApproverResolutionPanel), пролистывать его вручную неудобно.
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const matchRefs = useRef<Map<number, HTMLElement>>(new Map());
    const trimmedQuery = searchQuery.trim();
    const matchCount = useMemo(() => countTextMatches(comment, trimmedQuery), [comment, trimmedQuery]);
    // Индекс, реально показываемый пользователю и передаваемый в рендер - подстраховка на
    // случай, если activeMatchIndex "уехал" за пределы matchCount (запрос сузили правкой).
    const safeActiveMatchIndex = matchCount > 0 ? ((activeMatchIndex % matchCount) + matchCount) % matchCount : -1;

    // Новый поисковый запрос - начинаем с первого совпадения.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveMatchIndex(0);
    }, [trimmedQuery]);

    // Прокручиваем к активному совпадению - как при вводе текста, так и по кнопкам/Enter.
    useEffect(() => {
        if (safeActiveMatchIndex < 0) return;
        matchRefs.current.get(safeActiveMatchIndex)?.scrollIntoView({block: "center", behavior: "smooth"});
    }, [safeActiveMatchIndex]);

    const moveToMatch = (direction: 1 | -1) => {
        if (matchCount === 0) return;
        setActiveMatchIndex((prev) => {
            const safePrev = ((prev % matchCount) + matchCount) % matchCount;
            return (safePrev + direction + matchCount) % matchCount;
        });
    };

    const registerMatchRef = (index: number, el: HTMLElement | null) => {
        if (el) matchRefs.current.set(index, el);
        else matchRefs.current.delete(index);
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center
                               justify-center bg-black/40 p-3"
        >
            <div
                className="flex min-h-[280px] max-h-[calc(100vh-24px)] w-[95vw] max-w-[760px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                {/* Заголовок с датой, закрытием + информация */}
                <div className="flex flex-none flex-col gap-3 border-b border-[#eef2f7] px-6 py-4">
                    {/* Заголовок с датой, закрытием */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span
                                className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                                <MessageSquareText size={19} strokeWidth={1.8}/>
                            </span>
                            <div className="min-w-0">
                                <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                    {title}
                                </h2>
                                {decidedAt && (
                                    <Tooltip content={dateTooltip} side="bottom">
                                        <div className="mt-[2px] w-fit truncate text-[11px] font-medium text-[#8b97ab]">
                                            {formatDateTime(decidedAt)}
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-none items-center gap-2">
                            <Tooltip content={exportError ? t("commentViewModal.docxError") : t("commentViewModal.downloadDocx")} side="bottom">
                                <button
                                    type="button"
                                    onClick={() => void handleDownloadDocx()}
                                    disabled={exporting}
                                    className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border bg-white px-2.5 text-[12px] font-semibold hover:bg-[#ececfc] disabled:cursor-wait disabled:opacity-60 ${exportError ? "border-red-300 text-red-600" : "border-[#e5e9f0] text-[#4e57d6]"}`}
                                >
                                    {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                                    DOCX
                                </button>
                            </Tooltip>
                            <button
                                onClick={onClose}
                                className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                            >
                                <X size={20}/>
                            </button>
                        </div>
                    </div>

                    {/* Информация */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex-none truncate text-[11px] text-[#8b97ab]">
                                {authorLabel}
                            </span>
                            <Link
                                to={profileUrl}
                                className="flex h-[34px] w-fit min-w-[170px] items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2.5 text-[12.5px] outline-none hover:border-[#4e57d6]/50 hover:bg-white"
                            >
                                <span
                                    className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                                    {getInitials(approverName)}
                                </span>
                                <span className="text-[#26324a]">{approverName}</span>
                                {isMeApprover && (
                                    <span
                                        className="flex-none rounded-full px-[7px] py-[1px] text-[10px] font-semibold"
                                        style={{color: "#2f68f5", backgroundColor: "#e9f0ff"}}
                                    >
                                        {/* я */}
                                        {t("commentViewModal.me")}
                                    </span>
                                )}
                            </Link>
                        </div>

                        {decisionLabel && (
                            <div className="flex flex-none items-center gap-2.5">
                                <span className="truncate text-[11px] text-[#8b97ab]">
                                    {/* Резолюция данного согласующего: */}
                                    {t("commentViewModal.resolutionByApprover")}
                                </span>
                                <span
                                    className={`inline-flex w-fit flex-none items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${decisionBadgeClass}`}>
                                    {decisionLabel}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Поиск по тексту ниже - подсвечивает все вхождения и позволяет
                        перескакивать между ними стрелками/Enter (см. FormattedResolutionComment). */}
                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <SearchBar
                                placeholder={
                                    isComment
                                        ? t("commentViewModal.searchComment") // Поиск по тексту комментария…
                                        : t("commentViewModal.searchRemark") // Поиск по тексту замечания…
                                }
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSubmit={() => moveToMatch(1)}
                            />
                        </div>
                        {trimmedQuery && (
                            <div className="flex flex-none items-center gap-1">
                                <span className="whitespace-nowrap px-1 text-[11px] font-medium text-[#8b97ab]">
                                  {matchCount > 0
                                      ? `${safeActiveMatchIndex + 1} из ${matchCount}`
                                      : t("commentViewModal.notFound") // Не найдено
                                  }
                                </span>
                                <button
                                    type="button"
                                    onClick={() => moveToMatch(-1)}
                                    disabled={matchCount === 0}
                                    className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] border border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronUp size={15}/>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveToMatch(1)}
                                    disabled={matchCount === 0}
                                    className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] border border-[#e5e9f0] text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronDown size={15}/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {/* Вложения */}
                    {attachments.length > 0 && (
                        <div className="mb-4 rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-3">
                            <div className="mb-1.5 text-[11.5px] font-semibold text-[#8b97ab]">
                                {/* Прикреплённые файлы: */}
                                {t("commentViewModal.attachments")}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {attachments.map((a) => (
                                    <AttachmentRow
                                        key={a.id}
                                        fileId={a.fileId}
                                        fileName={a.fileName}
                                        onView={() => setPreviewAttachment({fileId: a.fileId, fileName: a.fileName})}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Текст резолюции */}
                    <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#3c4356]">
                        <FormattedResolutionComment
                            text={comment}
                            quotes={quotes}
                            onShowInText={onShowInText}
                            searchQuery={searchQuery}
                            activeMatchIndex={safeActiveMatchIndex}
                            onRegisterMatchRef={registerMatchRef}
                        />
                    </div>
                </div>
            </div>

            {previewAttachment && (
                <AttachmentDocxPreviewModal
                    fileId={previewAttachment.fileId}
                    fileName={previewAttachment.fileName}
                    downloadingId={null}
                    onDownload={downloadWithToast}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}
        </div>,
        document.body,
    );
}