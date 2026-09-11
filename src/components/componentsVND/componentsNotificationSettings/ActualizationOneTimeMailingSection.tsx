// Раздел "Создать единоразовую рассылку плана актуализации" настроек рассылок по актуализации
// ВНД. В отличие от остальных разделов этой страницы это не настройка, а форма разового
// действия: получатели (составы ответственных выбранных СП целиком + отдельные пользователи),
// текст письма и опциональное вложение — Excel-план актуализации, собранный теми же фильтром и
// колонками, что и кнопка "Экспорт плана в Excel" (см. ActualizationExportModal — блок фильтров
// и колонок здесь сознательно повторяет его вёрстку и поля).
import {useEffect, useMemo, useState} from "react";
import {Send, Plus, Users, X} from "lucide-react";

import {toast} from "@/service/toastService.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndActualizationSummaryResponse, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {actualizationNotificationsService} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {ACTUALIZATION_COLUMNS} from "@/constants/actualizationColumns.ts";
import {ACTUALIZATION_PLANNING_STATUSES, toDateRangeFilter} from "@/utils/actualizationSearchRequest.ts";

import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {
    ActualizationFilterPills,
    type ActualizationFilterValue,
} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilterPills.tsx";
import {DateFilterGroup, EMPTY_DATE_FILTER, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {HighlightText} from "@/utils/HighlightText.tsx";

interface SelectedUser {
    id: number;
    fullName: string;
}

const TOGGLEABLE_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
const FIXED_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => c.fixed);

export function ActualizationOneTimeMailingSection() {
    const {orgUnitOptions, typeOptions, organOptions} = useDictionaries();

    // ── получатели ──────────────────────────────────────────────────────────
    const [orgUnitIds, setOrgUnitIds] = useState<string[]>([]);

    const [userQuery, setUserQuery] = useState("");
    const [userResults, setUserResults] = useState<UserResponse[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Map<number, SelectedUser>>(new Map());

    // ── текст письма ────────────────────────────────────────────────────────
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    // ── план актуализации (вложение) ───────────────────────────────────────
    const [includePlan, setIncludePlan] = useState(false);
    const [summary, setSummary] = useState<VndActualizationSummaryResponse | null>(null);

    const [bucketFilter, setBucketFilter] = useState<ActualizationFilterValue>("all");
    const [typeFilters, setTypeFilters] = useState<string[]>([]);
    const [developerFilters, setDeveloperFilters] = useState<string[]>([]);
    const [organFilters, setOrganFilters] = useState<string[]>([]);
    const [dueDateFilter, setDueDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [neverActualizedOnly, setNeverActualizedOnly] = useState(false);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});

    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!includePlan || summary) return;
        vndService.getActualizationSummary().then(setSummary).catch(() => setSummary(null));
    }, [includePlan, summary]);

    useEffect(() => {
        let cancelled = false;
        setSearchingUsers(true);

        const timeoutId = setTimeout(() => {
            userService.getPage({
                search: userQuery.trim() || undefined,
                isBlocked: false,
                pageSize: 30,
                sortBy: "NameAsc",
            })
                .then((page) => {
                    if (!cancelled) setUserResults(page.items);
                })
                .catch(() => {
                    if (!cancelled) setUserResults([]);
                })
                .finally(() => {
                    if (!cancelled) setSearchingUsers(false);
                });
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [userQuery]);

    const visibleUserResults = userResults.filter((u) => !selectedUsers.has(u.id));

    const addUser = (u: UserResponse) => {
        setSelectedUsers((prev) => {
            const next = new Map(prev);
            next.set(u.id, {id: u.id, fullName: u.fullName});
            return next;
        });
    };

    const removeUser = (id: number) => {
        setSelectedUsers((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleColumn = (key: string) =>
        setVisibleCols((prev) => ({...prev, [key]: !(prev[key] === true)}));

    const planFilter = useMemo<VndSearchRequest>(() => ({
        statuses: ACTUALIZATION_PLANNING_STATUSES,
        actualizationBuckets: bucketFilter === "all" ? [] : [bucketFilter],
        typeIds: typeFilters.length ? typeFilters.map(Number) : undefined,
        developerIds: developerFilters.length ? developerFilters.map(Number) : undefined,
        organIds: organFilters.length ? organFilters.map(Number) : undefined,
        dueActualizationDate: toDateRangeFilter(dueDateFilter),
    }), [bucketFilter, typeFilters, developerFilters, organFilters, dueDateFilter]);

    const canSend = subject.trim() !== "" && message.trim() !== ""
        && (orgUnitIds.length > 0 || selectedUsers.size > 0);

    const resetForm = () => {
        setOrgUnitIds([]);
        setSelectedUsers(new Map());
        setSubject("");
        setMessage("");
        setIncludePlan(false);
        setBucketFilter("all");
        setTypeFilters([]);
        setDeveloperFilters([]);
        setOrganFilters([]);
        setDueDateFilter(EMPTY_DATE_FILTER);
        setNeverActualizedOnly(false);
        setVisibleCols({});
    };

    const handleSend = async () => {
        setSending(true);
        setError(null);
        const toastId = toast.loading("Отправляется…", "Единоразовая рассылка");

        try {
            const columns = ACTUALIZATION_COLUMNS
                .filter((c) => c.fixed || visibleCols[c.key] === true)
                .map((c) => c.key);

            const result = await actualizationNotificationsService.sendOneTimeMailing({
                responsibleOrgUnitIds: orgUnitIds.map(Number),
                userIds: Array.from(selectedUsers.keys()),
                subject: subject.trim(),
                message: message.trim(),
                includePlan,
                planExport: includePlan ? {filter: planFilter, columns, neverActualizedOnly} : null,
            });

            toast.update(toastId, {
                variant: "success",
                title: "Отправлено",
                description: `Получателей: ${result.recipientCount}`,
                duration: 4500,
            });
            resetForm();
        } catch (e) {
            const message2 = e instanceof Error ? e.message : "Не удалось отправить";
            setError(message2);
            toast.update(toastId, {
                variant: "error",
                title: "Не удалось отправить",
                description: message2,
                duration: 5500,
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <Send size={17} strokeWidth={1.8}/>
                </span>
                <div>
                    <h3 className="m-0 text-[14.5px] font-bold text-[#1c2740]">
                        Создать единоразовую рассылку плана актуализации
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        Разовое письмо ответственным сотрудникам выбранных СП и/или отдельным
                        пользователям, с опциональным планом актуализации в Excel
                    </p>
                </div>
            </div>

            {/* Получатели */}
            <div className="mt-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    Получатели
                </div>

                <MultiSelectField
                    label="Ответственные сотрудники за актуализацию — целиком по СП"
                    modalTitle="Выберите СП…"
                    options={orgUnitOptions}
                    selectedKeys={orgUnitIds}
                    onChange={setOrgUnitIds}
                    searchPlaceholder="Поиск СП…"
                    hierarchical
                />
                <p className="mt-1 text-[11px] text-[#a3adbd]">
                    Каждое выбранное подразделение добавит в получатели весь свой состав
                    ответственных сотрудников (см. раздел «Ответственные сотрудники за
                    актуализацию»).
                </p>

                <div className="mt-3.5 rounded-xl border border-[#eef2f7] p-3.5">
                    <div className="mb-2 text-[12.5px] font-semibold text-[#3a4560]">
                        Другие пользователи
                    </div>

                    <SearchBar
                        variant="gray"
                        value={userQuery}
                        onChange={setUserQuery}
                        placeholder="Поиск по ФИО или email…"
                    />

                    <div className="mt-2 max-h-[168px] overflow-y-auto">
                        {searchingUsers && (
                            <div className="px-1 py-2 text-[12.5px] text-[#8b97ab]">Поиск…</div>
                        )}
                        {!searchingUsers && userQuery.trim() !== "" && visibleUserResults.length === 0 && (
                            <div className="px-1 py-2 text-[12.5px] text-[#a3adbd]">Сотрудников не найдено</div>
                        )}
                        {!searchingUsers && visibleUserResults.map((u) => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => addUser(u)}
                                className="w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-lg hover:bg-[#f6f8fb] text-left cursor-pointer"
                            >
                                <span className="min-w-0">
                                    <HighlightText
                                        text={u.fullName}
                                        query={userQuery}
                                        className="block text-[12.5px] text-[#1c2740] truncate"
                                    />
                                    <HighlightText
                                        text={u.email}
                                        query={userQuery}
                                        className="block text-[11px] text-[#a3adbd] truncate"
                                    />
                                </span>
                                <Plus size={14} strokeWidth={2.2} className="flex-none text-[#4e57d6]"/>
                            </button>
                        ))}
                    </div>

                    {selectedUsers.size > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2 border-t border-[#eef2f7] pt-2.5">
                            {Array.from(selectedUsers.values()).map((u) => (
                                <span key={u.id}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f5f9] pl-3 pr-2 py-1.5 text-[11.5px] font-medium text-[#3a4560]">
                                    {u.fullName}
                                    <button
                                        type="button"
                                        onClick={() => removeUser(u.id)}
                                        className="w-[16px] h-[16px] flex-none grid place-items-center rounded-full text-[#8b97ab] hover:bg-white cursor-pointer"
                                    >
                                        <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {orgUnitIds.length === 0 && selectedUsers.size === 0 && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-[10px] border border-[#f2e5c2] bg-[#fdf8ee] px-3 py-2 text-[12px] text-[#8a6d1d]">
                        <Users size={14} className="flex-none mt-0.5"/>
                        Выберите хотя бы одно СП или добавьте хотя бы одного пользователя
                    </div>
                )}
            </div>

            {/* Текст письма */}
            <div className="mt-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    Текст письма
                </div>

                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Тема письма…"
                    className="mb-2.5 h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                />
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Текст сообщения…"
                    rows={5}
                    className="w-full rounded-[9px] border border-[#e5e9f0] bg-white p-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] resize-y"
                />
            </div>

            {/* План актуализации */}
            <div className="mt-5">
                <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={includePlan}
                        onChange={(e) => setIncludePlan(e.target.checked)}
                        className="h-[16px] w-[16px] cursor-pointer accent-[#4e57d6]"
                    />
                    Включить план актуализации (Excel-вложение)
                </label>

                {includePlan && (
                    <div className="mt-3.5 rounded-xl border border-[#eef2f7] p-3.5">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                            Фильтры
                        </div>

                        <ActualizationFilterPills value={bucketFilter} onChange={setBucketFilter} summary={summary}/>

                        <label className="mb-4 inline-flex cursor-pointer select-none items-center gap-1.5 text-[12.5px] font-semibold text-[#3a4560]">
                            <input
                                type="checkbox"
                                checked={neverActualizedOnly}
                                onChange={(e) => setNeverActualizedOnly(e.target.checked)}
                                className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                            />
                            Только ни разу не актуализированные
                            <HelpTooltip content="Показывает документы только с одной (первой) редакцией — т.е. те, которые ещё ни разу не проходили актуализацию."/>
                        </label>

                        <div className="mb-4 grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[14px] gap-y-3">
                            <MultiSelectField
                                label="Вид документа"
                                modalTitle="Вид документа"
                                options={typeOptions}
                                selectedKeys={typeFilters}
                                onChange={setTypeFilters}
                                searchPlaceholder="Поиск вида документа…"
                            />
                            <MultiSelectField
                                label="Разработчик"
                                modalTitle="Разработчик (СП)"
                                options={orgUnitOptions}
                                selectedKeys={developerFilters}
                                onChange={setDeveloperFilters}
                                searchPlaceholder="Поиск подразделения…"
                                hierarchical
                            />
                            <MultiSelectField
                                label="Орган утверждения"
                                modalTitle="Орган утверждения"
                                options={organOptions}
                                selectedKeys={organFilters}
                                onChange={setOrganFilters}
                                searchPlaceholder="Поиск органа утверждения…"
                                hierarchical
                            />
                        </div>

                        <div className="mb-5 rounded-xl border border-[#eef2f7] p-3.5">
                            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                Срок актуализации
                            </div>
                            <DateFilterGroup
                                rows={[
                                    {key: "dueActualization", label: "Срок актуализации", value: dueDateFilter, onChange: setDueDateFilter},
                                ]}
                            />
                        </div>

                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                            Колонки
                        </div>

                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {FIXED_COLUMNS.map((c) => (
                                <span key={c.key}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#e5e9f0] bg-[#f6f8fb] px-2.5 py-1 text-[11.5px] font-semibold text-[#8b97ab]">
                                    {c.label}
                                </span>
                            ))}
                        </div>
                        <div className="mb-1 text-[11px] text-[#a3adbd]">
                            Колонки выше входят в файл всегда. Ниже — дополнительные, на выбор.
                        </div>

                        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-3 gap-y-1.5 rounded-xl border border-[#eef2f7] p-3.5">
                            {TOGGLEABLE_COLUMNS.map((c) => (
                                <label key={c.key}
                                       className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-[#3a4560] hover:bg-[#f6f8fb]">
                                    <input
                                        type="checkbox"
                                        checked={visibleCols[c.key] === true}
                                        onChange={() => toggleColumn(c.key)}
                                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                                    />
                                    {c.label}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="mt-4">
                <button
                    onClick={handleSend}
                    disabled={sending || !canSend}
                    className="cursor-pointer inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Send size={14}/>
                    {sending ? "Отправка…" : "Отправить"}
                </button>
            </div>
        </div>
    );
}
