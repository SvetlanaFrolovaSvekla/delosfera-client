// Модалка с полным текстом резолюции + вложениями. Рендерится через портал в body,
// чтобы не резаться по overflow/скроллу родительской карточки маршрута.
import {useEffect} from "react";
import {MessageSquareText, X} from "lucide-react";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {createPortal} from "react-dom";

export function CommentViewModal({
                          title,
                          approverName,
                          decidedAt,
                          comment,
                          attachments,
                          onClose,
                      }: {
    title: string;
    approverName: string;
    decidedAt?: string | null;
    comment: string;
    attachments: {id: number; fileId: number; fileName: string}[];
    onClose: () => void;
}) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[640px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <MessageSquareText size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {title}
                            </h2>
                            <div className="mt-[2px] truncate text-[11px] font-medium text-[#8b97ab]">
                                {approverName}
                                {decidedAt ? ` · ${formatDateTime(decidedAt)}` : ""}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#3c4356]">
                        {comment}
                    </div>

                    {attachments.length > 0 && (
                        <div className="mt-4 flex flex-col gap-1.5">
                            {attachments.map((a) => (
                                <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName}/>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}