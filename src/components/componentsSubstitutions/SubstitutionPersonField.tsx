// Поле выбора сотрудника в карточке заявки на замещение
import {useState} from "react";
import {ChevronDown, User as UserIcon, X} from "lucide-react";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {PersonNameLink} from "@/components/componentsGeneral/PersonNameLink.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {UserOrgUnitPickerModal} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import type {PickableUser} from "@/constants/pickableUser.ts";

/**
 * Строка выбранного сотрудника: цветной кружок с инициалами, ФИО и под ним должность ·
 * подразделение — как строка согласующего в карточке СЗ (SzApproversField). По должности и
 * подразделению отличают однофамильцев, поэтому показываем их сразу, а не только в модалке.
 */
export function PersonRow({name, meta, muted, onClick, onClear, clearLabel, userId, nameHref}: {
    name: string;
    meta?: string | null;
    /** Сотрудника нет в справочнике (уволен, введён вручную) — серый кружок. */
    muted?: boolean;
    /** Клик по строке — сменить сотрудника. Нет — строка только для чтения. */
    onClick?: () => void;
    onClear?: () => void;
    clearLabel?: string;
    /** id сотрудника — ФИО становится ссылкой на его профиль (/users/{id}). */
    userId?: number | null;
    /** Готовая ссылка на профиль (доверенности, паспорт ВНД) — вместо userId. */
    nameHref?: string;
}) {
    const interactive = !!onClick;
    return (
        <div
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(e) => {
                if (interactive && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={`flex min-h-10 w-full min-w-0 items-center gap-2.5 rounded-[9px] border border-[#e5e9f0] px-2.5 py-1 text-left outline-none ${
                interactive
                    ? "cursor-pointer bg-white hover:bg-[#f6f8fb] focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]"
                    : "bg-[#f9fafc]"}`}
        >
            <Avatar name={name} muted={muted} size={26}/>
            <span className="min-w-0 flex-1 leading-[1.25]">
                {/* Клик по ФИО — профиль сотрудника; по остальной строке — смена сотрудника */}
                <span className="flex min-w-0 text-[13px] font-medium text-[#1c2740]">
                    <PersonNameLink name={name} userId={userId} href={nameHref}/>
                </span>
                {meta && <span className="block truncate text-[11.5px] text-[#8b97ab]">{meta}</span>}
            </span>
            {onClear && (
                <Tooltip content={clearLabel ?? ""} side="top" disabled={!clearLabel}>
                    <button
                        type="button"
                        aria-label={clearLabel}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#a3adbd] transition-colors hover:bg-[#fbeae7] hover:text-[#c0392b]"
                    >
                        <X size={14}/>
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

/** Должность · подразделение — подпись под ФИО. */
export function personMeta(p?: Pick<PickableUser, "position" | "orgUnit"> | null, fallbackPosition?: string | null) {
    return [p?.position ?? fallbackPosition, p?.orgUnit].filter(Boolean).join(" · ") || null;
}

/**
 * Выбор одного сотрудника. Пока никто не выбран — кнопка «Найти сотрудника»; выбран — строка
 * с аватаркой (клик по ней открывает выбор заново, крестик — очистить). В режиме просмотра —
 * та же строка без действий.
 */
export function SubstitutionPersonField({
                                            users, value, onChange, disabled, fallbackName, fallbackPosition,
                                            placeholder, modalTitle, searchPlaceholder, clearLabel, excludeId,
                                        }: {
    users: PickableUser[];
    value: number | null;
    onChange: (u: PickableUser | null) => void;
    disabled?: boolean;
    /** ФИО из заявки — если сотрудника нет в справочнике (уволен) или справочник ещё грузится. */
    fallbackName?: string | null;
    fallbackPosition?: string | null;
    placeholder: string;
    modalTitle: string;
    searchPlaceholder: string;
    clearLabel?: string;
    excludeId?: number;
}) {
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
                    userId={person?.id}
                    onClick={disabled ? undefined : () => setOpen(true)}
                    onClear={disabled ? undefined : () => onChange(null)}
                    clearLabel={clearLabel}
                />
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none hover:bg-[#f6f8fb] focus:border-[#2f68f5] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:hover:bg-[#f6f8fb]"
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
                    excludeId={excludeId}
                    selectedId={value ?? undefined}
                    title={modalTitle}
                    searchPlaceholder={searchPlaceholder}
                    onSelect={(p) => onChange(p)}
                    onClose={() => setOpen(false)}
                    accent="blue"
                />
            )}
        </>
    );
}
