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
import type {Accent} from "@/constants/accent.ts";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {PersonNameLink} from "@/components/componentsGeneral/PersonNameLink.tsx";

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
    /** Высота 36px — вровень с DatePickerInput и SelectDropdown в строке фильтров. */
    compact?: boolean;
    /** Акцентный цвет модалки выбора. По умолчанию фиолетовый. */
    accent?: Accent;
    disabled?: boolean;
    /** Список по старшинству (Правление → руководители → остальные) — для согласующих и подписанта. */
    bySeniority?: boolean;
    /** У выбранного сотрудника показать аватар, а ФИО сделать ссылкой на профиль. */
    profileLink?: boolean;
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
                                    compact,
                                    accent,
                                    disabled,
                                    bySeniority,
                                    profileLink,
                                }: UserPickerFieldProps) {
    const [open, setOpen] = useState(false);

    const selected = people.find((u) => u.id === value);

    const modal = open && (
        <UserOrgUnitPickerModal
            people={people}
            excludeId={excludeId}
            selectedId={value ?? undefined}
            title={modalTitle}
            searchPlaceholder={searchPlaceholder}
            onSelect={(person) => onChange(person.id)}
            onClose={() => setOpen(false)}
            accent={accent}
            bySeniority={bySeniority}
        />
    );

    // Выбран сотрудник и нужна ссылка на профиль: <a> нельзя класть внутрь <button>,
    // поэтому поле собрано из аватара, ФИО-ссылки и кнопки на всё оставшееся место —
    // клик по ФИО ведёт в профиль, клик по остальному полю открывает выбор, как обычно.
    if (profileLink && selected) {
        // Должность · СП — как в строке согласующего, чтобы различать однофамильцев
        const meta = [selected.position, selected.orgUnit].filter(Boolean).join(" · ");
        return (
            <>
                <div
                    className={`flex ${compact ? "min-h-9" : "min-h-10"} w-full items-stretch gap-2.5 rounded-[9px] border border-[#e5e9f0] bg-white pl-3 text-[13px] ${
                        disabled ? "bg-[#f6f8fb]" : "hover:bg-[#f6f8fb]"
                    }`}
                >
                    <span className="flex flex-none items-center py-2">
                        <Avatar name={selected.fullName} size={28}/>
                    </span>
                    <span className="flex min-w-0 flex-col justify-center py-2">
                        <span className="flex min-w-0 text-[13px] font-medium text-[#1c2740]">
                            <PersonNameLink name={selected.fullName} userId={selected.id}/>
                        </span>
                        {meta && <span className="truncate text-[11.5px] text-[#8b97ab]">{meta}</span>}
                    </span>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setOpen(true)}
                        aria-label={modalTitle}
                        className="flex min-w-6 flex-1 cursor-pointer items-center justify-end gap-2 border-none bg-transparent pr-3 outline-none disabled:cursor-not-allowed"
                    >
                        {clearable && !disabled ? (
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
                </div>
                {modal}
            </>
        );
    }

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className={`flex ${compact ? "h-9" : "h-10"} w-full items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none cursor-pointer hover:bg-[#f6f8fb] focus:border-[#2f68f5] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:hover:bg-[#f6f8fb]`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <UserIcon size={14} className="flex-none text-[#a3adbd]"/>
                    <span className={`truncate ${selected ? "text-[#1c2740]" : "text-[#a3adbd]"}`}>
                        {selected?.fullName ?? placeholder}
                    </span>
                </span>
                {clearable && selected && !disabled ? (
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

            {modal}
        </>
    );
}