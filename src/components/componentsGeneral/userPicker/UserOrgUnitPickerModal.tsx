// Модалка выбора одного пользователя: список с иерархическим фильтром по СП и поиском
// по ФИО. Копия того же каркаса, что и в "Выбор согласующего" (VndSelectApproverModal) -
// тот же UserPickerModalShell, тот же хук useOrgUnitFilter и тот же фильтр по СП, чтобы
// в разных местах системы пикер пользователя не расходился по виду и поведению.
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ACCENT, type Accent} from "@/constants/accent.ts";
import {useOrgUnitFilter} from "@/hooks/vndHooks/useOrgUnitFilter.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {OrgUnitMultiSelectFilter} from "@/components/componentsGeneral/selects/OrgUnitMultiSelectFilter.tsx";
import {
    UserPickerModalShell,
    UserPickerSearchInput,
    UserPickerListStatus,
} from "@/components/componentsGeneral/userPicker/UserPickerModalShell.tsx";
import {
    SENIORITY_GROUP_TITLE,
    seniority,
    type PickableUser,
} from "@/constants/pickableUser.ts";
import {User as UserIcon} from "lucide-react";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";


export type OrgUnitPickerPerson = PickableUser;

interface UserOrgUnitPickerModalProps {
    people: OrgUnitPickerPerson[];
    /** Не показывать в списке — например, уже выбранного в другом поле формы. */
    excludeId?: number;
    /** Подсветить текущий выбор в списке. */
    selectedId?: number;
    title: string;
    searchPlaceholder: string;
    onSelect: (person: OrgUnitPickerPerson) => void;
    onClose: () => void;
    /** Акцентный цвет (подсветка выбранного, поиск, фильтр СП). По умолчанию фиолетовый. */
    accent?: Accent;
    /**
     * Сортировать по старшинству (Правление → руководители → остальные) с заголовками групп —
     * для подбора согласующих и подписанта. По умолчанию — по алфавиту.
     */
    bySeniority?: boolean;
    /** Кружки с инициалами (как в реестре СЗ) вместо безликой иконки. По умолчанию — иконка. */
    avatars?: boolean;
}

export function UserOrgUnitPickerModal({
                                            people,
                                            excludeId,
                                            selectedId,
                                            title,
                                            searchPlaceholder,
                                            onSelect,
                                            onClose,
                                            accent = "violet",
                                            bySeniority,
                                            avatars,
                                        }: UserOrgUnitPickerModalProps) {
    const {t} = useTranslation();
    const a = ACCENT[accent];
    const [search, setSearch] = useState("");

    const {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading, error} = useOrgUnitFilter();

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return people
            .filter((p) => p.id !== excludeId)
            .filter((p) => selectedIds.size === 0 || (p.orgUnitId !== null && p.orgUnitId !== undefined && selectedIds.has(p.orgUnitId)))
            .filter((p) =>
                term === ""
                    ? true
                    : `${p.fullName} ${p.position ?? ""} ${p.orgUnit ?? ""}`.toLowerCase().includes(term),
            )
            .sort((a, b) =>
                (bySeniority ? seniority(a) - seniority(b) : 0) || a.fullName.localeCompare(b.fullName, "ru"));
    }, [people, excludeId, search, selectedIds, bySeniority]);

    const handlePick = (person: OrgUnitPickerPerson) => {
        onSelect(person);
        onClose();
    };

    return (
        <UserPickerModalShell
            title={title}
            onClose={onClose}
            filters={
                <>
                    <UserPickerSearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} accent={accent}/>
                    <OrgUnitMultiSelectFilter options={treeOptions} selectedKeys={selectedKeys} onChange={setSelectedKeys} accent={accent}/>
                </>
            }
        >
            <UserPickerListStatus
                loading={loading}
                error={error ? t("selectApproverModal.loadUsersError") : null}
                isEmpty={filtered.length === 0}
            />

            {!loading && !error && filtered.length > 0 && (
                <div className="flex flex-col gap-1">
                    {filtered.map((p, i) => {
                        const isSelected = p.id === selectedId;

                        // Заголовок группы — только когда список по старшинству и группа началась:
                        // иначе порядок читается как случайный.
                        const groupTitle = bySeniority ? SENIORITY_GROUP_TITLE[seniority(p)] : null;
                        const prevTitle = bySeniority && i > 0 ? SENIORITY_GROUP_TITLE[seniority(filtered[i - 1])] : null;

                        return (
                            <div key={p.id} className="flex flex-col gap-1">
                                {groupTitle && groupTitle !== prevTitle && (
                                    <div className="px-3 pb-0.5 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-[#a3adbd]">
                                        {groupTitle}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handlePick(p)}
                                    className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors cursor-pointer ${
                                        isSelected ? `${a.softBg}` : "hover:bg-[#f6f8fb]"
                                    }`}
                                >
                                    {avatars ? (
                                        <Avatar name={p.fullName} size={36}/>
                                    ) : (
                                        <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${a.tintBg} ${a.text}`}>
                                            <UserIcon size={16}/>
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <span className={`block truncate text-[13px] font-semibold ${isSelected ? `${a.text}` : "text-[#26324a]"}`}>
                                            <HighlightText text={p.fullName} query={search}/>
                                        </span>
                                        {(p.position || p.orgUnit) && (
                                            <div className="truncate text-[11.5px] text-[#8b97ab]">
                                                <HighlightText
                                                    text={[p.position, p.orgUnit].filter(Boolean).join(" · ")}
                                                    query={search}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </UserPickerModalShell>
    );
}
