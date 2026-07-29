import {Plus} from "lucide-react";

interface VndPageHeaderProps {
    onCreateClick?: () => void;
}

export function VndPageHeader({onCreateClick}: VndPageHeaderProps) {
    return (
        <div className="flex items-end justify-between gap-5 flex-wrap mb-[18px]">
            <div>
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">
                    База данных ВНД
                </h1>
                <p className="mt-[7px] mb-0 text-[#8b97ab] text-[13px]">
                    Централизованный реестр действующих ВНД · поиск и фильтрация по всем
                    реквизитам и по тексту редакций
                </p>
            </div>
            <div className="flex gap-2.5">
                <button
                    onClick={onCreateClick}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                    Создать ВНД
                </button>
            </div>
        </div>
    );
}