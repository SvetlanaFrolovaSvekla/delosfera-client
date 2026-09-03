import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Plus} from "lucide-react";

interface VndPageHeaderProps {
    onCreateClick?: () => void;
}

export function VndPageHeader({onCreateClick}: VndPageHeaderProps) {
    return (
        <PageHeader
            title="Реестр ВНД"
            description="Централизованный реестр действующих ВНД · поиск и фильтрация по всем реквизитам и по тексту редакций"
            actions={
                <button
                    onClick={onCreateClick}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                    Создать ВНД
                </button>
            }
        />
    );
}