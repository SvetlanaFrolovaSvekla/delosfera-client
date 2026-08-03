// Нередактируемое поле с лейблом
export function ReadOnlyField({label, value}: { label: string; value: string }) {
    return (
        <div className="flex flex-col h-full">
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div className="w-full min-h-10 px-3 py-2 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] text-[13px] text-[#1c2740] flex items-center box-border mt-auto">{value}</div>
        </div>
    );
}