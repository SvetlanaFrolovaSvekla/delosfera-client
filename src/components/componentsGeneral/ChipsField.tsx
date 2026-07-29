// Нередактируемое поле с лейблом и items-значениями, в обертке chips (серый, закругленные края)
export function ChipsField({label, items}: { label: string; items: string[] }) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div className={`w-full min-h-10 px-3 py-2 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] text-[13px] text-[#1c2740] flex items-center box-border min-h-10 h-auto flex-wrap gap-1.5 py-2`}>
                {items.length > 0 ? (
                    items.map((item) => (
                        <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-[#e5e9f0] text-[#55617a] text-[11.5px] font-medium">
                            {item}
                        </span>
                    ))
                ) : (
                    <span className="text-[#a3adbd]">—</span>
                )}
            </div>
        </div>
    );
}