import {createPortal} from "react-dom";
import type {ReactNode} from "react";
import {Loader2, Search, X} from "lucide-react";
import {useTranslation} from "react-i18next";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

interface UserPickerModalShellProps {
    title: string;
    onClose: () => void;
    filters: ReactNode; // поиск + фильтр по СП (и что-то ещё специфичное для конкретной модалки)
    children: ReactNode; // Содержимое списка (или сами состояния — см. ниже)
}

/** Общий каркас модалки-пикера пользователей: portal + header + блок фильтров + скролл-зона
 * списка. */
export function UserPickerModalShell({title, onClose, filters, children}: UserPickerModalShellProps) {
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div className="flex h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-6 py-4">
                    <h2 className="text-[15px] font-bold text-[#1c2740]">{title}</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>
                <div className="flex flex-none flex-col gap-2 border-b border-[#eef0f5] px-6 py-4">
                    {filters}
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}

export function UserPickerSearchInput({value, onChange, placeholder}: {
    value: string; onChange: (v: string) => void; placeholder: string;
}) {
    return (
        <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b97ab]"/>
            <input
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-[38px] w-full rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] pl-9 pr-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6]"
            />
        </div>
    );
}

/** Загрузка / ошибка / "никого не нашлось" — три состояния, повторяющиеся в каждом пикере. */
export function UserPickerListStatus({loading, error, isEmpty}: {
    loading: boolean; error: string | null; isEmpty: boolean;
}) {
    const {t} = useTranslation();

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-[#8b97ab]">
                <Loader2 size={20} className="animate-spin"/>
            </div>
        );
    }
    if (error) {
        // Не удалось загрузить данные!
        return <EmptyState variant="error" title={t("selectApproverModal.loadDataErrorTitle")} description={error}/>;
    }
    if (isEmpty) {
        return (
            <div className="flex h-full items-center justify-center text-[12.5px] text-[#8b97ab]">
                {/* Никого не нашлось */}
                {t("selectApproverModal.noResults")}
            </div>
        );
    }
    return null;
}