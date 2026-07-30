export function VndCodeCard() {
    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                Код документа
            </div>
            <div className="font-mono text-[26px] font-bold text-[#4e57d6] mt-2">Пример: 10101</div>
            <div className="text-[11.5px] text-[#8b97ab] mt-1">
                Код документа присваивается системой после сохранения
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-[#eef2f7] text-[12px] text-[#55617a] leading-[1.55]">
                После утверждения временный идентификатор трансформируется в постоянный номер документа.
            </div>
        </div>
    );
}