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
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {ChevronDown, ChevronUp, MessageSquareText, X} from "lucide-react";
import {
    AttachmentDocxPreviewModal
} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";


export function CommentViewModal({
                                     title,
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
    const {user} = useAuth();
    const isMeApprover = approverUserId !== undefined && approverUserId === user?.id;
    const profileUrl = isMeApprover ? "/profile" : `/users/${approverUserId}`;

    // Заголовок сюда приходит в виде "См. комментарий полностью" / "См. замечания полностью" —
    const isComment = title.toLowerCase().includes("коммент");
    const authorLabel = isComment ? "Автор комментария:" : "Автор замечания:";
    const dateTooltip = isComment ? "Дата создания комментария" : "Дата создания замечания";

    const [previewAttachment, setPreviewAttachment] = useState<{ fileId: number; fileName: string } | null>(null);

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

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
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
                                        я
                                    </span>
                                )}
                            </Link>
                        </div>

                        {decisionLabel && (
                            <div className="flex flex-none items-center gap-2.5">
                                <span className="truncate text-[11px] text-[#8b97ab]">
                                    Резолюция данного согласующего:
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
                                placeholder={isComment ? "Поиск по тексту комментария…" : "Поиск по тексту замечания…"}
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSubmit={() => moveToMatch(1)}
                            />
                        </div>
                        {trimmedQuery && (
                            <div className="flex flex-none items-center gap-1">
                                <span className="whitespace-nowrap px-1 text-[11px] font-medium text-[#8b97ab]">
                                    {matchCount > 0 ? `${safeActiveMatchIndex + 1} из ${matchCount}` : "Не найдено"}
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
                                Прикреплённые файлы:
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