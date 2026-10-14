// Блоки замечаний панели "На доработке": что нужно исправить сейчас, уже устранённые замечания
// прошлых кругов и комментарии к простому согласованию. Состояние - в VndRevisionNeededPanel.
import {useTranslation} from "react-i18next";
import type {RemarkItem} from "./revisionRemarks.ts";
import {RemarkCard} from "./RemarkCard.tsx";
import {AlertCircle, CheckCircle2, MessageSquareText} from "lucide-react";

interface RevisionRemarksGroupsProps {
    /** Замечания, которые нужно исправить сейчас (с последнего пройденного этапа) */
    remarks: RemarkItem[];
    /** Замечания более раннего круга доработки - уже устранены */
    resolvedRemarks: RemarkItem[];
    /** Комментарии к простому согласованию */
    approvalComments: RemarkItem[];
    onOpenRemark: (value: {item: RemarkItem; isRemark: boolean}) => void;
    onOpenAttachment: (value: {fileId: number; fileName: string}) => void;
}

export function RevisionRemarksGroups({
    remarks, resolvedRemarks, approvalComments,
    onOpenRemark: setOpenRemark, onOpenAttachment: setPreviewAttachment,
}: RevisionRemarksGroupsProps) {
    const {t} = useTranslation();
    return (
        <>
            {/* Замечания при согласовании - карточки в духе StageCardView, с количеством красным */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#d62815]"/>
                    <span className="text-[13.5px] font-bold text-[#d62815]">
                        {remarks.length === 0
                            ? t("coordinationUi.revision.noRemarks")
                            : t("coordinationUi.revision.mustFix", {count: remarks.length, noun: t("coordinationUi.revision.remarksCount", {count: remarks.length})})}
                    </span>
                </div>
                {remarks.length > 0 && (
                    <div className="flex flex-col gap-3 p-4">
                        {remarks.map((r, i) => (
                            <RemarkCard
                                key={i}
                                item={r}
                                isRemark
                                onOpenFull={() => setOpenRemark({item: r, isRemark: true})}
                                onOpenAttachment={(fileId, fileName) => setPreviewAttachment({fileId, fileName})}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Замечания более раннего круга доработки - уже устранены (иначе согласование не
                дошло бы до следующего этапа и не вернулось сюда заново) - показываем для
                контекста отдельным серым блоком, не смешивая с тем, что нужно исправить сейчас. */}
            {resolvedRemarks.length > 0 && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-[#fbfcfe]">
                    <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#a3adbd]"/>
                        <span className="text-[13.5px] font-bold text-[#8b97ab]">
                            {t("coordinationUi.revision.resolvedTitle")}
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        {resolvedRemarks.map((r, i) => (
                            <RemarkCard
                                key={i}
                                item={r}
                                isRemark
                                resolved
                                onOpenFull={() => setOpenRemark({item: r, isRemark: true})}
                                onOpenAttachment={(fileId, fileName) => setPreviewAttachment({fileId, fileName})}
                            />
                        ))}
                    </div>
                </div>
            )}

            {approvalComments.length > 0 && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-[#4e57d6]"/>
                        <span className="text-[13.5px] font-bold text-[#1c2740]">
                            {t("coordinationUi.revision.alsoComments")}
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        {approvalComments.map((c, i) => (
                            <RemarkCard
                                key={i}
                                item={c}
                                isRemark={false}
                                onOpenFull={() => setOpenRemark({item: c, isRemark: false})}
                                onOpenAttachment={(fileId, fileName) => setPreviewAttachment({fileId, fileName})}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
