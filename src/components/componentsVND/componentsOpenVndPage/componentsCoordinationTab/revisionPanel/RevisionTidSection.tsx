// Блок ТИД в панели "На доработке": сформировать/загрузить, заменить или убрать файл.
import {useTranslation} from "react-i18next";
import {AlertCircle, FileCheck2, FileSpreadsheet, Trash2} from "lucide-react";

interface RevisionTidSectionProps {
    tid: File | null;
    tidMissing: boolean;
    onTidChange: (file: File | null) => void;
    /** Открыть окно "Сформировать или загрузить ТИД" */
    onOpenTidModal: (open: boolean) => void;
}

export function RevisionTidSection({
    tid, tidMissing, onTidChange: setTid, onOpenTidModal: setTidModalOpen,
}: RevisionTidSectionProps) {
    const {t} = useTranslation();
    return (
        <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                {t("coordinationUi.revision.tidTitle")}
            </div>
            <div className="px-5 py-4">
                <p className="mb-3 text-[12.5px] leading-[1.5] text-[#8b97ab]">
                    {t("coordinationUi.revision.tidNote")}
                </p>

                {!tid ? (
                    <button
                        type="button"
                        onClick={() => setTidModalOpen(true)}
                        className={`flex h-10 w-fit cursor-pointer items-center gap-2 rounded-[10px] border px-[15px] text-[13px] font-semibold transition-colors ${
                            tidMissing
                                ? "border-[#e8b4b4] bg-[#fdf1f1] text-[#c0392b] hover:bg-[#fbe4e4]"
                                : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                        }`}
                    >
                        <FileSpreadsheet size={14}/>
                        {t("coordinationUi.revision.tidCreate")}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px]">
                        <FileCheck2 size={14} className="flex-none text-[#2f9e5c]"/>
                        <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{tid.name}</span>
                        <button
                            type="button"
                            onClick={() => setTidModalOpen(true)}
                            className="cursor-pointer flex-none text-[11.5px] font-semibold text-[#4e57d6] hover:underline"
                        >
                            {t("coordinationUi.revision.tidChange")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setTid(null)}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                )}

                {tidMissing && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>{t("coordinationUi.revision.tidRequired")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
