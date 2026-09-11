// Модалка назначения ответственных за актуализацию для одного СП (target-СП, orgUnitId) —
// открывается либо сразу для известного СП (кнопка "Изменить" на строке списка), либо после
// выбора СП в TreeSingleSelectModal (кнопка "Назначить ответственных" в
// ActualizationResponsiblesSection). Поиск сотрудников идёт по общему справочнику пользователей
// (/users, как в разделе "Пользователи") — ответственный не обязан состоять именно в target-СП,
// фильтр СП внутри модалки задаёт только то, среди кого искать, по умолчанию — сам target-СП.
import {useEffect, useState} from "react";
import {Plus, Users, X} from "lucide-react";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";

import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {
    actualizationNotificationsService,
    type ActualizationNotificationResponsible,
} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {HighlightText} from "@/utils/HighlightText.tsx";

export interface AssignResponsiblesSelectedUser {
    id: number;
    fullName: string;
    orgUnitId: number | null;
    orgUnitName: string | null;
}

interface AssignResponsiblesModalProps {
    orgUnitId: number;
    orgUnitName: string;
    initialUsers: AssignResponsiblesSelectedUser[];
    onClose: () => void;
    onSaved: (updated: ActualizationNotificationResponsible[]) => void;
}

export function AssignResponsiblesModal({
                                            orgUnitId,
                                            orgUnitName,
                                            initialUsers,
                                            onClose,
                                            onSaved,
                                        }: AssignResponsiblesModalProps) {
    const {panelRef, handleBackdropClick} = useModalShake();
    const {orgUnitOptions} = useDictionaries();

    const [query, setQuery] = useState("");
    // null — фильтр "Все пользователи" (поиск без ограничения по СП); по умолчанию — сам
    // target-СП, как и раньше.
    const [filterOrgUnitId, setFilterOrgUnitId] = useState<string | null>(String(orgUnitId));
    const [results, setResults] = useState<UserResponse[]>([]);
    const [searching, setSearching] = useState(false);

    const [selected, setSelected] = useState<Map<number, AssignResponsiblesSelectedUser>>(
        () => new Map(initialUsers.map((u) => [u.id, u]))
    );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setSearching(true);

        const timeoutId = setTimeout(() => {
            userService.getPage({
                search: query.trim() || undefined,
                // null (фильтр "Все пользователи") — без ограничения по СП, ищем среди всех.
                orgUnitIds: filterOrgUnitId ? [Number(filterOrgUnitId)] : undefined,
                isBlocked: false,
                pageSize: 30,
                sortBy: "NameAsc",
            })
                .then((page) => {
                    if (!cancelled) setResults(page.items);
                })
                .catch(() => {
                    if (!cancelled) setResults([]);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [query, filterOrgUnitId]);

    const visibleResults = results.filter((u) => !selected.has(u.id));

    const addUser = (u: UserResponse) => {
        setSelected((prev) => {
            const next = new Map(prev);
            next.set(u.id, {
                id: u.id,
                fullName: u.fullName,
                orgUnitId: u.orgUnit?.id ?? null,
                orgUnitName: u.orgUnit?.titleRu ?? null,
            });
            return next;
        });
    };

    const removeUser = (id: number) => {
        setSelected((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const updated = await actualizationNotificationsService.setResponsibles(
                orgUnitId, Array.from(selected.keys()));
            onSaved(updated);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    };

    const selectedList = Array.from(selected.values());

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[480px] h-[660px] max-h-[85vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        Ответственные за актуализацию
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="px-5 pt-4 pb-3 flex-none flex flex-col gap-2.5">
                    <div
                        className="flex items-start gap-2 rounded-[10px] border border-[#d9ecdf] bg-[#f2faf5] px-3 py-2 text-[12px] text-[#2c7a4b]">
                        <Users size={14} className="flex-none mt-0.5"/>

                        <span className="min-w-0 break-words">
            Ответственные исполнители для СП:{" "}
                            <span className="font-semibold">{orgUnitName}</span>
        </span>
                    </div>


                    <SingleSelectListField
                        label="Фильтр по структурным подразделениям:"
                        modalTitle="Выберите СП…"
                        options={orgUnitOptions}
                        selectedKey={filterOrgUnitId}
                        onChange={setFilterOrgUnitId}
                        searchPlaceholder="Поиск СП…"
                        placeholder="Все пользователи"
                        clearLabel="Искать среди всех сотрудников"
                        clearedLabel="Фильтр не выбран — поиск для включения в группу ответственных за актуализацию идёт по всем сотрудникам"
                        boldLabel={false}
                    />

                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder="Поиск по ФИО или email…"
                        autoFocus
                    />
                </div>

                <div className="max-h-[168px] overflow-y-auto px-2 pb-2 border-b border-[#eef2f7] flex-none">
                    {searching && (
                        <div className="px-3 py-3 text-[12.5px] text-[#8b97ab]">Поиск…</div>
                    )}
                    {!searching && visibleResults.length === 0 && (
                        <div className="px-3 py-3 text-[12.5px] text-[#a3adbd]">Сотрудников для выбора не найдено!</div>
                    )}
                    {!searching && visibleResults.length !== 0 && (
                    <div className="block text-[11.5px] text-[#8b97ab] mb-[5px] px-3">Выберите:</div>
                    )}
                    {!searching && visibleResults.map((u) => (
                        <button
                            key={u.id}
                            type="button"
                            onClick={() => addUser(u)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-[#f6f8fb] text-left cursor-pointer"
                        >
                            <span className="min-w-0">
                              <HighlightText
                                  text={u.fullName}
                                  query={query}
                                  className="block text-[13px] text-[#1c2740] truncate"
                              />
                                <HighlightText
                                    text={u.email}
                                    query={query}
                                    className="block text-[11px] text-[#a3adbd] truncate"
                                />
                            </span>
                            <Plus size={15} strokeWidth={2.2} className="flex-none text-[#4e57d6]"/>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3.5">
                    {selectedList.length === 0 ? (
                        <div className="px-3 py-8 text-center text-[12.5px] text-[#a3adbd]">
                            Ответственные за актуализацию этого структурного подразделения ещё не выбраны
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <div className="block text-[11.5px] text-[#8b97ab] mb-[5px] px-3">
                               Выбранные сотрудники:
                            </div>
                            <div className="flex flex-wrap gap-2">
                            {selectedList.map((u) => {
                                const foreign = u.orgUnitId != null && u.orgUnitId !== orgUnitId;

                                return (
                                    <span
                                        key={u.id}
                                        className={`inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full ${
                                            foreign ? "bg-[#f1edfc]" : "bg-[#f2f5f9]"}`}
                                    >
                                        <span className="flex flex-col">
                                            <span className={`text-[11.5px] font-medium ${
                                                foreign ? "text-[#6c3fd6]" : "text-[#3a4560]"}`}>
                                                {u.fullName}
                                            </span>
                                            {foreign && u.orgUnitName && (
                                                <span className="text-[10.5px] text-[#8b6fd6]">Другое СП: {u.orgUnitName}</span>
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeUser(u.id)}
                                            className="w-[18px] h-[18px] flex-none grid place-items-center rounded-full text-[#8b97ab] hover:bg-white/70 cursor-pointer"
                                        >
                                            <X className="w-[11px] h-[11px]" strokeWidth={2.5}/>
                                        </button>
                                    </span>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 px-3 py-2 rounded-[9px] bg-[#fdeceb] text-[#c0392b] text-[12.5px]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Сохранение…" : "Сохранить"}
                    </button>
                </div>
            </div>
        </div>
    );
}
