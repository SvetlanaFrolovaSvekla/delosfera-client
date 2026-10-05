/**
 * Журнал заседаний Правления, КПА и комитетов.
 *
 * Сортировка по дате вниз и колонка просроченных поручений: журнал открывают,
 * чтобы понять, что горит по протоколам, а не, чтоб полистать историю.
 */

import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
import {CalendarPlus, Download, Plus} from "lucide-react";
import {
    bodyOptions,
    meetingsService,
    type MeetingBody,
    type MeetingForm,
    type MeetingListItem,
} from "@/service/meetingsService/meetingsService.ts";
import {formatDate, formatTime} from "@/service/meetingsService/formatMeetingDate.ts";
import {parseDDMMYYYYToISO} from "@/utils/dateUtils.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Badge, Cell, DataTable, Row} from "@/components/componentsGeneral/DataTable.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";

const currentYear = new Date().getFullYear();

const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
    .map(y => ({value: String(y), label: String(y)}));

const FIELD_LABEL = "block text-[12px] font-semibold text-[#3a4560] mb-2";
const TEXT_INPUT =
    "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";

const BTN_BASE =
    "inline-flex items-center gap-2 rounded-[10px] font-semibold text-[13px] cursor-pointer " +
    "disabled:cursor-not-allowed";
const BTN_PRIMARY =
    `${BTN_BASE} h-10 px-[15px] border-none bg-[#4e57d6] text-white hover:brightness-[1.06] ` +
    "shadow-[0_6px_16px_-6px_#4e57d6] disabled:bg-[#e5e9f0] disabled:text-[#a3adbd] disabled:shadow-none";
const BTN_SECONDARY =
    `${BTN_BASE} h-10 px-[15px] border border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60`;

const emptyForm = {
    body: "Kpa" as MeetingBody,
    form: "InPerson" as MeetingForm,
    /** «дд.мм.гггг чч:мм» - так отдаёт DatePickerInput с withTime. */
    dateTime: "",
    number: "",
    materialsUrl: "",
};

export const MeetingRegistryPage = () => {
    const navigate = useNavigate();
    const {t} = useTranslation();

    const bodySelectOptions = useMemo(
        () => bodyOptions.map(o => ({value: o.value, label: t(`meetings.bodies.${o.value}`)})),
        [t],
    );
    const formOptions = useMemo(
        () => (["InPerson", "Absentee"] as MeetingForm[]).map(v => ({value: v, label: t(`meetings.forms.${v}`)})),
        [t],
    );

    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    // Пустой выбор = «все органы»
    const [bodies, setBodies] = useState<MeetingBody[]>([]);
    const [year, setYear] = useState(currentYear);
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyForm);

    // Сервис принимает один орган: если выбран ровно один - фильтруем на сервере,
    // если несколько - грузим все и добираем на клиенте.
    const singleBody = bodies.length === 1 ? bodies[0] : undefined;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setMeetings(await meetingsService.list({
                body: singleBody,
                year,
                overdueOnly: overdueOnly || undefined,
            }));
        } catch {
            setError(t("meetings.registry.loadError"));
        } finally {
            setLoading(false);
        }
    }, [singleBody, year, overdueOnly, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const query = search.trim().toLowerCase();

    const visibleMeetings = useMemo(() => meetings.filter(m => {
        if (bodies.length > 1 && !bodies.includes(m.body)) return false;
        if (!query) return true;

        return [t(`meetings.bodies.${m.body}`), String(m.number), m.secretaryName ?? "", formatDate(m.date)]
            .some(value => value.toLowerCase().includes(query));
    }), [meetings, bodies, query, t]);

    const filtersActive = bodies.length > 0 || overdueOnly || query !== "";

    const resetFilters = () => {
        setBodies([]);
        setOverdueOnly(false);
        setSearch("");
    };

    const date = parseDDMMYYYYToISO(form.dateTime.slice(0, 10));
    const time = form.dateTime.slice(11, 16) || "10:00";

    const create = async () => {
        try {
            setBusy(true);
            setError(null);

            const meeting = await meetingsService.create({
                body: form.body,
                form: form.form,
                date,
                time,
                number: form.number ? Number(form.number) : undefined,
                materialsUrl: form.materialsUrl.trim() || undefined,
            });

            toast.success(t("meetings.toast.created"));
            navigate(`/meetings/${meeting.id}`);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? t("meetings.registry.createError"));
            toast.error(t("meetings.registry.createError"), message);
        } finally {
            setBusy(false);
        }
    };

    const exportRegistry = async () => {
        // Выгрузка за год идёт заметное время — без индикатора кажется, что кнопка не сработала.
        const toastId = toast.loading(t("meetings.toast.exporting"), t("meetings.toast.exportingHint", {year}));
        try {
            setBusy(true);
            setError(null);

            const from = `${year}-01-01`;
            const to = `${year}-12-31`;
            const blob = await meetingsService.downloadRegistry(from, to, singleBody);

            // Реестр отдаётся файлом, а не таблицей на экране: по ТЗ его выгружают
            // за период и отправляют дальше как документ.
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = t("meetings.registry.exportFile", {year});
            link.click();
            URL.revokeObjectURL(url);

            toast.update(toastId, {
                variant: "success",
                title: t("meetings.toast.exported"),
                description: t("meetings.registry.exportFile", {year}),
                duration: 4500,
            });
        } catch {
            setError(t("meetings.registry.exportError"));
            toast.update(toastId, {
                variant: "error",
                title: t("meetings.registry.exportError"),
                description: t("meetings.toast.tryAgain"),
                duration: 6000,
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("meetings.registry.title")}
                description={t("meetings.registry.description")}
                actions={
                    <>
                        <button type="button" onClick={() => void exportRegistry()} disabled={busy}
                                className={BTN_SECONDARY}>
                            <Download className="w-[17px] h-[17px]" strokeWidth={2}/>
                            {t("meetings.registry.exportExcel")}
                        </button>
                        <button type="button" onClick={() => setCreating(v => !v)} className={BTN_PRIMARY}>
                            <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                            {t("meetings.registry.create")}
                        </button>
                    </>
                }
            />

            {creating && (
                <Section icon={<CalendarPlus className="w-4 h-4 text-[#2d354a]" strokeWidth={2}/>}
                         title={t("meetings.registry.form.title")}>
                    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-x-[18px] gap-y-3.5">
                        <div>
                            <span className={FIELD_LABEL}>{t("meetings.registry.form.body")}</span>
                            <SelectDropdown
                                options={bodySelectOptions}
                                value={form.body}
                                onChange={value => setForm({...form, body: value as MeetingBody})}
                                className="w-full"
                                minWidth="100%"
                            />
                        </div>

                        <div>
                            <span className={FIELD_LABEL}>{t("meetings.registry.form.form")}</span>
                            <SelectDropdown
                                options={formOptions}
                                value={form.form}
                                onChange={value => setForm({...form, form: value as MeetingForm})}
                                className="w-full"
                                minWidth="100%"
                            />
                        </div>

                        <div>
                            <span className={FIELD_LABEL}>{t("meetings.registry.form.dateTime")}</span>
                            <DatePickerInput
                                withTime
                                defaultTime="10:00"
                                value={form.dateTime}
                                onChange={dateTime => setForm({...form, dateTime})}
                                placeholder={t("meetings.registry.form.dateTimePlaceholder")}
                            />
                        </div>

                        <div>
                            <span className={FIELD_LABEL}>{t("meetings.registry.form.number")}</span>
                            <input
                                value={form.number}
                                onChange={e => setForm({...form, number: e.target.value.replace(/\D/g, "")})}
                                placeholder={t("meetings.registry.form.numberPlaceholder")}
                                className={TEXT_INPUT}
                                title={t("meetings.registry.form.numberHint")}
                            />
                        </div>

                        <div className="[grid-column:1/-1]">
                            <span className={FIELD_LABEL}>{t("meetings.registry.form.materials")}</span>
                            <input
                                value={form.materialsUrl}
                                onChange={e => setForm({...form, materialsUrl: e.target.value})}
                                placeholder={t("meetings.registry.form.materialsPlaceholder")}
                                className={TEXT_INPUT}
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2.5">
                        <button type="button" onClick={() => {
                            setCreating(false);
                            setForm(emptyForm);
                        }} className={BTN_SECONDARY}>
                            {t("meetings.registry.form.cancel")}
                        </button>
                        <button type="button" onClick={() => void create()} disabled={busy || !date}
                                className={BTN_PRIMARY}>
                            {t("meetings.registry.form.submit")}
                        </button>
                    </div>
                </Section>
            )}

            <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
                <SearchBar
                    variant="white"
                    value={search}
                    onChange={setSearch}
                    placeholder={t("meetings.registry.searchPlaceholder")}
                    className="min-w-[280px]"
                />
            </div>

            <div className="flex items-end gap-3 flex-wrap mb-[15px]">
                <div className="w-[260px]">
                    <MultiSelectField
                        label={t("meetings.registry.bodyFilter")}
                        modalTitle={t("meetings.registry.bodyFilter")}
                        options={bodySelectOptions.map(o => ({key: o.value, label: o.label}))}
                        selectedKeys={bodies}
                        onChange={keys => setBodies(keys as MeetingBody[])}
                    />
                </div>

                <div>
                    <span className={FIELD_LABEL}>{t("meetings.registry.year")}</span>
                    <SelectDropdown
                        options={yearOptions}
                        value={String(year)}
                        onChange={value => setYear(Number(value))}
                        minWidth="120px"
                    />
                </div>

                <CheckBoxOne checked={overdueOnly} onChange={setOverdueOnly} tone="danger">
                    {t("meetings.registry.overdueOnly")}
                </CheckBoxOne>

                {filtersActive && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="h-9 px-1 text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:underline"
                    >
                        {t("meetings.registry.resetFilters")}
                    </button>
                )}

                {!loading && !error && (
                    <span className="ml-auto pb-2 text-[12.5px] text-[#8b97ab]">
                        {t("meetings.registry.found", {count: visibleMeetings.length})}
                    </span>
                )}
            </div>

            {error && (
                <p className="mb-4 rounded-[10px] bg-[#fbeae7] px-3 py-2 text-[13px] text-[#c0392b]">{error}</p>
            )}

            {loading ? (
                <Loader label={t("meetings.registry.loading")}/>
            ) : visibleMeetings.length === 0 ? (
                <EmptyState
                    title={t("meetings.registry.emptyTitle")}
                    description={filtersActive
                        ? t("meetings.registry.emptyFiltered")
                        : t("meetings.registry.emptyYear", {year})}
                    actionLabel={filtersActive ? t("meetings.registry.resetFilters") : undefined}
                    onAction={filtersActive ? resetFilters : undefined}
                />
            ) : (
                <DataTable
                    headers={[
                        t("meetings.registry.columns.body"),
                        t("meetings.registry.columns.number"),
                        t("meetings.registry.columns.dateTime"),
                        t("meetings.registry.columns.form"),
                        t("meetings.registry.columns.secretary"),
                        {title: t("meetings.registry.columns.items"), align: "right"},
                        {title: t("meetings.registry.columns.assignments"), align: "right"},
                        {title: t("meetings.registry.columns.overdue"), align: "right"},
                        t("meetings.registry.columns.notification"),
                    ]}
                >
                    {visibleMeetings.map(m => (
                        <Row key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} alert={m.overdueCount > 0}>
                            <Cell nowrap>
                                <Badge tone="info">{t(`meetings.bodies.${m.body}`)}</Badge>
                            </Cell>
                            <Cell mono strong>
                                <HighlightText text={String(m.number).padStart(2, "0")} query={search}/>
                            </Cell>
                            <Cell nowrap>
                                <span className="font-mono text-[12.5px] text-[#1c2740]">
                                    <HighlightText text={formatDate(m.date)} query={search}/>
                                </span>
                                <span className="mt-0.5 block font-mono text-[11.5px] text-[#8b97ab]">
                                    {formatTime(m.time)}
                                </span>
                            </Cell>
                            <Cell nowrap>{t(`meetings.forms.${m.form}`)}</Cell>
                            <Cell>
                                {m.secretaryName
                                    ? <HighlightText text={m.secretaryName} query={search}/>
                                    : "—"}
                            </Cell>
                            <Cell mono align="right">{m.itemCount}</Cell>
                            <Cell mono align="right">{m.assignmentCount}</Cell>
                            <Cell align="right" nowrap>
                                {m.overdueCount > 0
                                    ? <Badge tone="bad">{m.overdueCount}</Badge>
                                    : <span className="text-[#a3adbd]">—</span>}
                            </Cell>
                            <Cell nowrap>
                                <Badge tone={m.notifiedAt ? "good" : "neutral"}>
                                    {m.notifiedAt ? t("meetings.registry.notified") : t("meetings.registry.notNotified")}
                                </Badge>
                            </Cell>
                        </Row>
                    ))}
                </DataTable>
            )}
        </div>
    );
};
