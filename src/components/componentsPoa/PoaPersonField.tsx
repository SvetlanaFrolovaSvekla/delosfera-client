// Выбор одного сотрудника в форме доверенности: выбран — строка с аватаркой-инициалами,
// ФИО и должностью · подразделением (как у сотрудников в реестре СЗ и в заявках на замещение);
// не выбран — кнопка-плейсхолдер. Клик по строке открывает выбор заново, крестик — очищает.
import {useState} from "react";
import {ChevronDown, User as UserIcon} from "lucide-react";
import {UserOrgUnitPickerModal} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import {PersonRow, personMeta} from "@/components/componentsSubstitutions/SubstitutionPersonField.tsx";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {ACCENT} from "@/constants/accent.ts";

interface Props {
    users: PickableUser[];
    value: number | null;
    onChange: (id: number | null) => void;
    placeholder: string;
    modalTitle: string;
    searchPlaceholder: string;
    clearLabel?: string;
    /** ФИО из доверенности — если сотрудника уже нет в справочнике или он ещё грузится. */
    fallbackName?: string | null;
    fallbackPosition?: string | null;
    /** Список по старшинству — для доверителя (подписывает от имени банка). */
    bySeniority?: boolean;
}

const A = ACCENT.violet;

export function PoaPersonField({
                                   users, value, onChange, placeholder, modalTitle, searchPlaceholder,
                                   clearLabel, fallbackName, fallbackPosition, bySeniority,
                               }: Props) {
    const [open, setOpen] = useState(false);
    const person = value != null ? users.find((u) => u.id === value) : undefined;
    const name = person?.fullName ?? (value != null ? fallbackName?.trim() : null) ?? null;

    return (
        <>
            {name ? (
                <PersonRow
                    name={name}
                    meta={personMeta(person, fallbackPosition)}
                    muted={!person}
                    onClick={() => setOpen(true)}
                    onClear={() => onChange(null)}
                    clearLabel={clearLabel}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none hover:bg-[#f6f8fb] ${A.focusBorder}`}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <UserIcon size={14} className="flex-none text-[#a3adbd]"/>
                        <span className="truncate text-[#a3adbd]">{placeholder}</span>
                    </span>
                    <ChevronDown size={15} className="flex-none text-[#a3adbd]"/>
                </button>
            )}

            {open && (
                <UserOrgUnitPickerModal
                    people={users}
                    selectedId={value ?? undefined}
                    title={modalTitle}
                    searchPlaceholder={searchPlaceholder}
                    onSelect={(p) => onChange(p.id)}
                    onClose={() => setOpen(false)}
                    accent="violet"
                    bySeniority={bySeniority}
                    avatars
                />
            )}
        </>
    );
}
