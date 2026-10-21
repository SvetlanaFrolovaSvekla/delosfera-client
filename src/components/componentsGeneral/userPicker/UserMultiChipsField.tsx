// Поле выбора нескольких сотрудников для панелей расширенного поиска: подпись + чипсы
// с аватарками-инициалами (как в реестре СЗ). Выбор — в модалке с поиском по ФИО и
// фильтром по СП (та же, что у согласующих СЗ), тоже с аватарками.
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, X} from "lucide-react";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {SzUserMultiPickerModal} from "@/components/componentsSz/componentsSzCard/controls/SzUserMultiPickerModal.tsx";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {ACCENT, type Accent} from "@/constants/accent.ts";

const MAX_VISIBLE = 4;

interface Props {
    label: string;
    people: PickableUser[];
    value: number[];
    onChange: (ids: number[]) => void;
    /** Акцентный цвет фокуса, «+N» и модалки. По умолчанию фиолетовый. */
    accent?: Accent;
}

export function UserMultiChipsField({label, people, value, onChange, accent = "violet"}: Props) {
    const {t} = useTranslation();
    const a = ACCENT[accent];
    const [open, setOpen] = useState(false);

    const byId = useMemo(() => new Map(people.map((p) => [p.id, p.fullName])), [people]);
    const selected = value.map((id) => ({id, name: byId.get(id) ?? `#${id}`}));
    const visible = selected.slice(0, MAX_VISIBLE);
    const hidden = selected.slice(MAX_VISIBLE);

    return (
        <>
            <div className="min-w-0">
                <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">{label}</span>
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpen(true);
                        }
                    }}
                    className={`w-full min-w-0 min-h-[38px] px-2.5 py-[6px] rounded-[9px] border border-[#e5e9f0] bg-white box-border cursor-pointer flex items-center gap-[6px] hover:bg-[#f6f8fb] outline-none ${a.focusBorder}`}
                >
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-[6px]">
                        {selected.length === 0 && (
                            <span className="text-[13px] text-[#a3adbd] px-[3px]">{t("general.openList")}</span>
                        )}
                        {visible.map((p) => (
                            <span
                                key={p.id}
                                className="inline-flex min-w-0 max-w-full items-center gap-[6px] pl-[3px] pr-[6px] py-[3px] rounded-full bg-[#f2f5f9] text-[12px] text-[#3a4560] font-medium"
                            >
                                <Avatar name={p.name} size={18} muted={!byId.has(p.id)}/>
                                <span className="block truncate min-w-0" title={p.name}>{p.name}</span>
                                <button
                                    type="button"
                                    aria-label={`${t("general.clearFilter")}: ${p.name}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(value.filter((x) => x !== p.id));
                                    }}
                                    className="w-[16px] h-[16px] flex-none grid place-items-center rounded-full border-none bg-transparent text-[#8b97ab] hover:bg-[#e5e9f0] hover:text-[#55617a] cursor-pointer"
                                >
                                    <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                                </button>
                            </span>
                        ))}
                        {hidden.length > 0 && (
                            <span
                                title={hidden.map((p) => p.name).join(", ")}
                                className={`inline-flex flex-none cursor-default items-center px-[9px] py-[3px] rounded-full ${a.softBg} text-[12px] font-semibold ${a.text}`}
                            >
                                +{hidden.length}
                            </span>
                        )}
                    </div>
                    <ChevronDown className="w-[15px] h-[15px] flex-none text-[#a3adbd]" strokeWidth={2}/>
                </div>
            </div>

            {open && (
                <SzUserMultiPickerModal
                    people={people}
                    value={value}
                    onChange={onChange}
                    title={label}
                    onClose={() => setOpen(false)}
                    accent={accent}
                    avatars
                />
            )}
        </>
    );
}
