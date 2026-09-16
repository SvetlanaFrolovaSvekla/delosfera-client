import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {CANNOT_CREATE_VND_MESSAGE} from "@/hooks/vndHooks/useCanCreateVnd.ts";
import {Plus} from "lucide-react";

interface VndPageHeaderProps {
    onCreateClick?: () => void;
    // Нет прав создавать ВНД - кнопка блокируется, вместо клика, который бы дошёл
    // до бэкенда и там упал с сырой ошибкой авторизации, показываем тултип
    canCreate?: boolean;
}

export function VndPageHeader({onCreateClick, canCreate = true}: VndPageHeaderProps) {
    return (
        <PageHeader
            title="Реестр ВНД"
            description="Централизованный реестр действующих внутренних нормативных документов · поиск и фильтрация по всем реквизитам и по тексту редакций"
            actions={
                <Tooltip content={CANNOT_CREATE_VND_MESSAGE} disabled={canCreate} side="left">
                    <button
                        onClick={canCreate ? onCreateClick : undefined}
                        disabled={!canCreate}
                        className={`inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none font-semibold text-[13px] ${
                            canCreate
                                ? "bg-[#4e57d6] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                                : "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                        }`}
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Создать ВНД
                    </button>
                </Tooltip>
            }
        />
    );
}
