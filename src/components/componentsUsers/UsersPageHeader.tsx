import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Icon} from "@/components/icons/Icon";
import {Plus} from "lucide-react";

interface UsersPageHeaderProps {
    onCreateClick?: () => void;
    onSyncClick?: () => void;
}

export function UsersPageHeader({onCreateClick, onSyncClick}: UsersPageHeaderProps) {
    return (
        <PageHeader
            title="Пользователи"
            description="Учётные записи пользователей в системе. Синхронизировано из LDAP + локальные"
            actions={
                <>
                    <button
                        onClick={onSyncClick}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border border-[#dfe3ea] bg-white text-[#4e57d6] font-semibold text-[13px] cursor-pointer hover:bg-[#f5f6fb]"
                    >
                        <Icon name="tid" className="w-[18px] h-[18px]" strokeWidth={1.8}/>
                        Синхронизировать с AD
                    </button>

                    <button
                        onClick={onCreateClick}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Локальный пользователь
                    </button>
                </>
            }
        />
    );
}