// Раздел "Создать единоразовую рассылку плана актуализации" настроек рассылок по актуализации
// ВНД. В отличие от остальных разделов этой страницы это не настройка, а форма разового
// действия: получатели (составы ответственных выбранных СП целиком + отдельные пользователи),
// текст письма и опциональное вложение - Excel-план актуализации, собранный теми же фильтром и
// колонками, что и кнопка "Экспорт плана в Excel" (см. ActualizationExportModal).
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {toast} from "@/service/toastService.ts";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndActualizationSummaryResponse, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {
    actualizationNotificationsService
} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {ACTUALIZATION_COLUMNS} from "@/constants/vndConstants/actualizationColumns.ts";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {ACTUALIZATION_PLANNING_STATUSES, toDateRangeFilter} from "@/utils/vndProcess/actualizationSearchRequest.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {
    ActualizationFilterPills,
    type ActualizationFilterValue,
} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilterPills.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {DateFilterGroup, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Send, Plus, Users, X} from "lucide-react";


interface SelectedUser {
    id: number;
    fullName: string;
}

const TOGGLEABLE_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
const FIXED_COLUMNS = ACTUALIZATION_COLUMNS.filter((c) => c.fixed);

export function ActualizationOneTimeMailingSection() {
    const {t} = useTranslation();
    // Переводы этой формы - notificationMailingSettingsPage.oneTimeMailingForm.*
    const tm = (key: string, options?: Record<string, unknown>) =>
        t(`notificationMailingSettingsPage.oneTimeMailingForm.${key}`, options);
    const {orgUnitOptions, typeOptions, organOptions} = useDictionaries();

    // Получатели
    const [orgUnitIds, setOrgUnitIds] = useState<string[]>([]);

    const [userQuery, setUserQuery] = useState("");
    const [userResults, setUserResults] = useState<UserResponse[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Map<number, SelectedUser>>(new Map());

    // Текст письма
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    // Каналы отправки
    const [sendInApp, setSendInApp] = useState(true);
    const [sendEmail, setSendEmail] = useState(false);

    //План актуализации (вложение)
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        && (orgUnitIds.length > 0 || selectedUsers.size > 0)
        && (sendInApp || sendEmail);

    const resetForm = () => {
        setOrgUnitIds([]);
        setSelectedUsers(new Map());
        setSubject("");
        setMessage("");
        setSendInApp(true);
        setSendEmail(false);
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
        // Отправляется… / Единоразовая рассылка
        const toastId = toast.loading(tm("toastSendingTitle"), tm("toastSendingDescription"));

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
                sendInApp,
                sendEmail,
            });

            toast.update(toastId, {
                variant: "success",
                // Отправлено
                title: tm("toastSentTitle"),
                // Получателей: {{recipients}}
                description: tm("toastSentDescription", {recipients: result.recipientCount}),
                duration: 4500,
            });
            resetForm();
        } catch (e) {
            // Не удалось отправить
            const message2 = e instanceof Error ? e.message : tm("sendFailed");
            setError(message2);
            toast.update(toastId, {
                variant: "error",
                // Не удалось отправить
                title: tm("sendFailed"),
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
                        {/* Создать единоразовую рассылку плана актуализации */}
                        {tm("title")}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        {/* Разовое письмо ответственным сотрудникам выбранных СП и/или отдельным пользователям, с опциональным планом актуализации в Excel */}
                        {tm("description")}
                    </p>
                </div>
            </div>

            {/* Получатели */}
            <div className="mt-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    {/* Получатели */}
                    {tm("recipientsTitle")}
                </div>

                <MultiSelectField
                    /* Ответственные сотрудники за актуализацию — целиком по СП */
                    label={tm("orgUnitsLabel")}
                    /* Выберите СП… */
                    modalTitle={tm("orgUnitsModalTitle")}
                    options={orgUnitOptions}
                    selectedKeys={orgUnitIds}
                    onChange={setOrgUnitIds}
                    /* Поиск СП… */
                    searchPlaceholder={tm("orgUnitsSearch")}
                    hierarchical
                />
                <p className="mt-1 text-[11px] text-[#a3adbd]">
                    {/* Каждое выбранное подразделение добавит в получатели весь свой состав ответственных сотрудников (см. раздел «Ответственные сотрудники за актуализацию»). */}
                    {tm("orgUnitsHint")}
                </p>

                <div className="mt-3.5 rounded-xl border border-[#eef2f7] p-3.5">
                    <div className="mb-2 text-[12.5px] font-semibold text-[#3a4560]">
                        {/* Другие пользователи */}
                        {tm("otherUsersTitle")}
                    </div>

                    <SearchBar
                        variant="gray"
                        value={userQuery}
                        onChange={setUserQuery}
                        /* Поиск по ФИО или email… */
                        placeholder={tm("userSearchPlaceholder")}
                    />

                    <div className="mt-2 max-h-[168px] overflow-y-auto">
                        {searchingUsers && (
                            // Поиск…
                            <div className="px-1 py-2 text-[12.5px] text-[#8b97ab]">{tm("userSearching")}</div>
                        )}
                        {!searchingUsers && userQuery.trim() !== "" && visibleUserResults.length === 0 && (
                            // Сотрудников не найдено
                            <div className="px-1 py-2 text-[12.5px] text-[#a3adbd]">{tm("usersNotFound")}</div>
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
                    <div
                        className="mt-2.5 flex items-start gap-2 rounded-[10px] border border-[#f2e5c2] bg-[#fdf8ee] px-3 py-2 text-[12px] text-[#8a6d1d]">
                        <Users size={14} className="flex-none mt-0.5"/>
                        {/* Выберите хотя бы одно СП или добавьте хотя бы одного пользователя */}
                        {tm("recipientsRequired")}
                    </div>
                )}
            </div>

            {/* Текст письма */}
            <div className="mt-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                    {/* Текст письма */}
                    {tm("messageTitle")}
                </div>

                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    /* Тема письма… */
                    placeholder={tm("subjectPlaceholder")}
                    className="mb-2.5 h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                />
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    /* Текст сообщения… */
                    placeholder={tm("messagePlaceholder")}
                    rows={5}
                    className="w-full rounded-[9px] border border-[#e5e9f0] bg-white p-2.5 text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6] resize-y"
                />

                <div
                    className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#eef2f7] bg-[#fafbfd] px-3.5 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                        {/* Куда отправлять */}
                        {tm("channelsTitle")}
                    </span>
                    <label
                        className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                        <input
                            type="checkbox"
                            checked={sendInApp}
                            onChange={(e) => setSendInApp(e.target.checked)}
                            className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                        />
                        {/* В системе (уведомление в Делосфере) */}
                        {tm("channelInApp")}
                    </label>
                    <label
                        className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#3a4560]">
                        <input
                            type="checkbox"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                        />
                        {/* На почту */}
                        {tm("channelEmail")}
                    </label>
                    {!sendInApp && !sendEmail && (
                        <span className="text-[11.5px] font-semibold text-[#c0392b]">
                            {/* Выберите хотя бы один канал */}
                            {tm("channelRequired")}
                        </span>
                    )}
                </div>
            </div>

            {/* План актуализации */}
            <div className="mt-5">
                <label
                    className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-semibold text-[#3a4560]">
                    <input
                        type="checkbox"
                        checked={includePlan}
                        onChange={(e) => setIncludePlan(e.target.checked)}
                        className="h-[16px] w-[16px] cursor-pointer accent-[#4e57d6]"
                    />
                    {/* Включить план актуализации (Excel-вложение) */}
                    {tm("includePlan")}
                </label>

                {includePlan && (
                    <div className="mt-3.5 rounded-xl border border-[#eef2f7] p-3.5">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                            {/* Фильтры */}
                            {tm("filtersTitle")}
                        </div>

                        <ActualizationFilterPills value={bucketFilter} onChange={setBucketFilter} summary={summary}/>

                        <label
                            className="mb-4 inline-flex cursor-pointer select-none items-center gap-1.5 text-[12.5px] font-semibold text-[#3a4560]">
                            <input
                                type="checkbox"
                                checked={neverActualizedOnly}
                                onChange={(e) => setNeverActualizedOnly(e.target.checked)}
                                className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                            />
                            {/* Только ни разу не актуализированные */}
                            {tm("neverActualizedOnly")}
                            <HelpTooltip
                                /* Показывает документы только с одной (первой) редакцией — т.е. те, которые ещё ни разу не проходили актуализацию. */
                                content={tm("neverActualizedHelp")}/>
                        </label>

                        <div
                            className="mb-4 grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-x-[14px] gap-y-3">
                            <MultiSelectField
                                /* Вид документа */
                                label={tm("docType")}
                                /* Вид документа */
                                modalTitle={tm("docType")}
                                options={typeOptions}
                                selectedKeys={typeFilters}
                                onChange={setTypeFilters}
                                /* Поиск вида документа… */
                                searchPlaceholder={tm("docTypeSearch")}
                            />
                            <MultiSelectField
                                /* Разработчик */
                                label={tm("developer")}
                                /* Разработчик (СП) */
                                modalTitle={tm("developerModalTitle")}
                                options={orgUnitOptions}
                                selectedKeys={developerFilters}
                                onChange={setDeveloperFilters}
                                /* Поиск подразделения… */
                                searchPlaceholder={tm("developerSearch")}
                                hierarchical
                            />
                            <MultiSelectField
                                /* Орган утверждения */
                                label={tm("organ")}
                                /* Орган утверждения */
                                modalTitle={tm("organ")}
                                options={organOptions}
                                selectedKeys={organFilters}
                                onChange={setOrganFilters}
                                /* Поиск органа утверждения… */
                                searchPlaceholder={tm("organSearch")}
                                hierarchical
                            />
                        </div>

                        <div className="mb-5 rounded-xl border border-[#eef2f7] p-3.5">
                            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                {/* Срок актуализации */}
                                {tm("dueDateTitle")}
                            </div>
                            <DateFilterGroup
                                rows={[
                                    {
                                        key: "dueActualization",
                                        // Срок актуализации
                                        label: tm("dueDateTitle"),
                                        value: dueDateFilter,
                                        onChange: setDueDateFilter
                                    },
                                ]}
                            />
                        </div>

                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                            {/* Колонки */}
                            {tm("columnsTitle")}
                        </div>

                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {FIXED_COLUMNS.map((c) => (
                                <span key={c.key}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#e5e9f0] bg-[#f6f8fb] px-2.5 py-1 text-[11.5px] font-semibold text-[#8b97ab]">
                                    {t(c.labelKey)}
                                </span>
                            ))}
                        </div>
                        <div className="mb-1 text-[11px] text-[#a3adbd]">
                            {/* Колонки выше входят в файл всегда. Ниже — дополнительные, на выбор. */}
                            {tm("columnsHint")}
                        </div>

                        <div
                            className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-3 gap-y-1.5 rounded-xl border border-[#eef2f7] p-3.5">
                            {TOGGLEABLE_COLUMNS.map((c) => (
                                <label key={c.key}
                                       className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-[#3a4560] hover:bg-[#f6f8fb]">
                                    <input
                                        type="checkbox"
                                        checked={visibleCols[c.key] === true}
                                        onChange={() => toggleColumn(c.key)}
                                        className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                                    />
                                    {t(c.labelKey)}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
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
                    {/* Отправка… / Отправить */}
                    {sending ? tm("sending") : tm("send")}
                </button>
            </div>
        </div>
    );
}
