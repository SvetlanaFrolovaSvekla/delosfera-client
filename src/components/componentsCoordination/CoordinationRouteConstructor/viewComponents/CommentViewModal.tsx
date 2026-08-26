// Модалка с полным текстом резолюции + вложениями. Рендерится через портал в body,
// чтобы не резаться по overflow/скроллу родительской карточки маршрута.
import {useEffect} from "react";
import {Link} from "react-router-dom";
import {MessageSquareText, X} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {createPortal} from "react-dom";
import {getInitials} from "@/utils/getInitials.ts";

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
                                 }: {
    title: string;
    approverName: string;
    approverUserId?: number;
    decidedAt?: string | null;
    comment: string;
    attachments: {id: number; fileId: number; fileName: string}[];
    decisionLabel: string;
    decisionBadgeClass: string;
    onClose: () => void;
}) {
    const {user} = useAuth();
    const isMeApprover = approverUserId !== undefined && approverUserId === user?.id;
    const profileUrl = isMeApprover ? "/profile" : `/profile/${approverUserId}`;

    // Заголовок сюда приходит в виде "См. комментарий полностью" / "См. замечания полностью" —
    // по нему же определяем подпись автора и даты, не заводя отдельные пропсы.
    const isComment = title.toLowerCase().includes("коммент");
    const authorLabel = isComment ? "Автор комментария:" : "Автор замечания:";
    const dateTooltip = isComment ? "Дата создания комментария" : "Дата создания замечания";

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex min-h-[280px] max-h-[calc(100vh-24px)] w-[95vw] max-w-[760px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-col gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
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

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex-none truncate text-[11px] text-[#8b97ab]">
                                {authorLabel}
                            </span>
                            <Link
                                to={profileUrl}
                                className="flex h-[34px] w-fit min-w-[170px] items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2.5 text-[12.5px] outline-none hover:border-[#4e57d6]/50 hover:bg-white"
                            >
                                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
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

                        <div className="flex flex-none items-center gap-2.5">
                            <span className="truncate text-[11px] text-[#8b97ab]">
                                Резолюция данного согласующего:
                            </span>
                            <span className={`inline-flex w-fit flex-none items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${decisionBadgeClass}`}>
                                {decisionLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {attachments.length > 0 && (
                        <div className="mb-4 rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-3">
                            <div className="mb-1.5 text-[11.5px] font-semibold text-[#8b97ab]">
                                Прикреплённые файлы:
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {attachments.map((a) => (
                                    <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName}/>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#3c4356]">
                        {comment}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}