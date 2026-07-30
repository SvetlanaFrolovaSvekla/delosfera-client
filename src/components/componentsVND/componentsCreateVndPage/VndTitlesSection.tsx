interface VndTitlesSectionProps {
    titleRu: string;
    onTitleRuChange: (v: string) => void;
    titleKy: string;
    onTitleKyChange: (v: string) => void;
    titleEn: string;
    onTitleEnChange: (v: string) => void;
}

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc] box-border";

export function VndTitlesSection({
                                     titleRu, onTitleRuChange,
                                     titleKy, onTitleKyChange,
                                     titleEn, onTitleEnChange,
                                 }: VndTitlesSectionProps) {
    return (
        <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                Заголовки
            </div>
            <div className="flex flex-col gap-3">
                <div>
                    <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                        Заголовок (рус) <span className="text-[#c0392b]">*</span>
                    </label>
                    <input
                        value={titleRu}
                        onChange={(e) => onTitleRuChange(e.target.value)}
                        placeholder="Наименование документа"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#3a4560] mb-1.5">
                        Заголовок (кырг)
                    </label>
                    <input
                        value={titleKy}
                        onChange={(e) => onTitleKyChange(e.target.value)}
                        placeholder="Документтин аталышы"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">
                        Заголовок (англ)
                    </label>
                    <input
                        value={titleEn}
                        onChange={(e) => onTitleEnChange(e.target.value)}
                        placeholder="Document title"
                        className={inputClass}
                    />
                </div>
            </div>
        </div>
    );
}