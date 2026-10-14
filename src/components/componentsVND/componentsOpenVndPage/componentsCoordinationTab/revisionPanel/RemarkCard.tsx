/** Карточка одного замечания/комментария */
import {useTranslation} from "react-i18next";
import type {RemarkItem} from "./revisionRemarks.ts";
import {COMMENT_TRUNCATE_LENGTH} from "@/constants/validation/coordinationValidatuon.ts";
import {AttachmentRow} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";

export function RemarkCard({
                        item,
                        isRemark,
                        resolved,
                        onOpenFull,
                        onOpenAttachment,
                    }: {
    item: RemarkItem;
    isRemark: boolean;
    resolved?: boolean;
    onOpenFull: () => void;
    onOpenAttachment: (fileId: number, fileName: string) => void;
}) {
    const {t} = useTranslation();
    const isLong = item.comment.length > COMMENT_TRUNCATE_LENGTH;
    const displayedComment = isLong
        ? item.comment.slice(0, COMMENT_TRUNCATE_LENGTH).trimEnd() + "…"
        : item.comment;
    const buttonLabel = isRemark ? t("coordinationUi.revision.viewFullRemarks") : t("coordinationUi.revision.viewFullComment");

    return (
        <div
            className={`flex flex-col gap-2 rounded-[12px] border p-3.5 ${
                resolved
                    ? "border-[#e9edf3] bg-[#fafbfc]"
                    : isRemark ? "border-[#f0dcae] bg-[#fffcf5]" : "border-[#e9edf3] bg-white"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[12.5px] font-semibold ${resolved ? "text-[#8b97ab]" : "text-[#1c2740]"}`}>
                    {item.approverName}
                </span>
                <span className="text-[11px] font-medium text-[#8b97ab]">{t(item.phase === "primary" ? "coordinationUi.revision.phasePrimary" : item.phase === "repeat" ? "coordinationUi.revision.phaseRepeat" : "coordinationUi.revision.phaseFinalHold")}</span>
            </div>

            <div className={`whitespace-pre-wrap text-[12.5px] leading-[1.55] ${resolved ? "text-[#8b97ab]" : "text-[#3c424a]"}`}>
                {displayedComment}
            </div>

            {item.attachments.length > 0 && (
                <div className="rounded-[9px] border border-[#eef2f7] bg-white p-2">
                    <div className="mb-1 text-[10px] font-semibold text-[#8b97ab]">
                        {t("coordinationUi.revision.attachedFiles")}
                    </div>
                    <div className="flex flex-col gap-1">
                        {item.attachments.map((a) => (
                            <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName} onView={() => onOpenAttachment(a.fileId, a.fileName)}/>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={onOpenFull}
                className="cursor-pointer flex-none self-start rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
            >
                {buttonLabel}
            </button>
        </div>
    );
}
