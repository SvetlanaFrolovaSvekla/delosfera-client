/**
 * Пикер одного пользователя: кнопка-триггер + модалка выбора.
 *
 * Модалка — та же UserOrgUnitPickerModal, что и всюду в системе (копия каркаса
 * "Выбор согласующего"): список с фильтром по СП и поиском по ФИО, а не плоский
 * список без деления по подразделениям.
 */
import {useState} from "react";
import {
    UserOrgUnitPickerModal,
    type OrgUnitPickerPerson,
} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import {ChevronDown, User as UserIcon, X} from "lucide-react";

interface UserPickerFieldProps {
    people: OrgUnitPickerPerson[];
    value: number | null;
    onChange: (id: number) => void;
    placeholder: string;
    modalTitle: string;
    searchPlaceholder: string;
    excludeId?: number; // не показывать в списке — напр., уже выбранного в другом поле
    /** Показать крестик очистки выбора, когда кто-то выбран. */
    clearable?: boolean;
    onClear?: () => void;
}

export function UserPickerField({
                                    people,
                                    value,
                                    onChange,
                                    placeholder,
                                    modalTitle,
                                    searchPlaceholder,
                                    excludeId,
                                    clearable,
                                    onClear,
                                }: UserPickerFieldProps) {
    const [open, setOpen] = useState(false);

    const selected = people.find((u) => u.id === value);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none cursor-pointer hover:bg-[#f6f8fb] focus:border-[#2f68f5]"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <UserIcon size={14} className="flex-none text-[#a3adbd]"/>
                    <span className={`truncate ${selected ? "text-[#1c2740]" : "text-[#a3adbd]"}`}>
                        {selected?.fullName ?? placeholder}
                    </span>
                </span>
                {clearable && selected ? (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear?.();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation();
                                onClear?.();
                            }
                        }}
                        className="flex-none cursor-pointer text-[#c3cbdb] hover:text-[#8b97ab]"
                    >
                        <X size={14}/>
                    </span>
                ) : (
                    <ChevronDown size={15} className="flex-none text-[#a3adbd]"/>
                )}
            </button>

            {open && (
                <UserOrgUnitPickerModal
                    people={people}
                    excludeId={excludeId}
                    selectedId={value ?? undefined}
                    title={modalTitle}
                    searchPlaceholder={searchPlaceholder}
                    onSelect={(person) => onChange(person.id)}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}