/**
 * Секция "Канцелярия"
 * Книга регистрации корреспонденции.
 *
 * Одна книга на все категории, а не три реестра: письмо из НБКР, жалоба клиента и
 * счёт от поставщика различаются сроками и доступом, но не устройством. Искать
 * письмо в трёх местах хуже, чем отфильтровать в одном.
 *
 * Просроченное - сверху и отдельно. Это первый вопрос к книге каждое утро, и он не
 * должен требовать фильтра.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {
    correspondenceService,
    CATEGORY_ORDER,
    type Letter, type LetterCategory, type LetterDirection,
} from "@/service/correspondenceService/correspondenceService.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {LetterCardModal} from "@/components/componentsCorrespondence/LetterCardModal.tsx";
import {LetterRegisterModal} from "@/components/componentsCorrespondence/LetterRegisterModal.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {
    Badge, Cell, DataTable, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {ArrowDownLeft, ArrowUpRight, Download, Plus, TriangleAlert} from "lucide-react";

const CATEGORY_TONE: Record<LetterCategory, BadgeTone> = {
    RegulatorRequest: "bad",
    ClientAppeal: "warn",
    BankSecrecyInquiry: "info",
    Claim: "warn",
    Ordinary: "neutral",
};

export function CorrespondencePage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canRegister = hasPermission(PermissionCode.RegisterCorrespondence);

    // Книга по умолчанию показывает и входящие, и исходящие: иначе только что
    // зарегистрированное исходящее письмо (и проект) не видно в разделе, открытом
    // на «Входящих», и выглядит как удалённое. Разделы переключаются вкладками ниже.
    const [direction, setDirection] = useState<LetterDirection | "">("");
    const [category, setCategory] = useState<LetterCategory | "">("");
    const [onlyOverdue, setOnlyOverdue] = useState(false);
    const [text, setText] = useState("");
    /** Текст, по которому список реально отобран — его и подсвечиваем в строках. */
    const [appliedText, setAppliedText] = useState("");

    const [rows, setRows] = useState<Letter[]>([]);
    const [overdue, setOverdue] = useState<Letter[]>([]);
    const [loading, setLoading] = useState(true);

    const [opened, setOpened] = useState<number | null>(null);
    const [registering, setRegistering] = useState(false);
    const [exporting, setExporting] = useState(false);

    const currentFilter = () => ({
        direction: direction || undefined,
        categories: category ? [category] : undefined,
        onlyOverdue: onlyOverdue || undefined,
        text: text.trim() || undefined,
    });

    const doExport = async () => {
        setExporting(true);
        // Один тост на всю выгрузку: «готовим» -> «готово» или «ошибка»
        const toastId = toast.loading(
            t("correspondencePage.exportPreparing", {defaultValue: "Готовим выгрузку…"}),
        );
        try {
            await correspondenceService.exportRegistry(currentFilter());
            toast.update(toastId, {
                variant: "success",
                title: t("correspondencePage.exportDone", {defaultValue: "Выгрузка готова"}),
                description: t("correspondencePage.exportDoneHint", {defaultValue: "Файл Excel скачан"}),
                duration: 4500,
            });
        } catch {
            toast.update(toastId, {
                variant: "error",
                title: t("correspondencePage.exportFailed", {defaultValue: "Не удалось выгрузить реестр"}),
                description: t("correspondencePage.exportFailedHint", {defaultValue: "Попробуйте ещё раз"}),
                duration: 6000,
            });
        } finally {
            setExporting(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const [list, late] = await Promise.all([
                correspondenceService.search({
                    ...currentFilter(),
                    pageSize: 200,
                }),
                correspondenceService.overdue(),
            ]);
            setRows(list.items);
            setOverdue(late);
            setAppliedText(text.trim());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [direction, category, onlyOverdue]);

    const categoryOptions = [
        {value: "", label: t("correspondencePage.anyCategory") /* Любая категория */},
        ...CATEGORY_ORDER.filter((c) => c !== "Ordinary").map((value) => ({
            value,
            label: t(`correspondencePage.categories.${value}`),
        })),
    ];

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("correspondencePage.title") /* Корреспонденция */}
                description={t("correspondencePage.description") /* Книга регистрации входящих и исходящих писем */}
                actions={(
                    <>
                        <button
                            type="button"
                            onClick={() => void doExport()}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Download className="w-[16px] h-[16px]" strokeWidth={2}/>
                            {exporting
                                ? t("correspondencePage.exporting") /* Готовим… */
                                : t("correspondencePage.exportExcel") /* Выгрузить в Excel */}
                        </button>
                        {canRegister && (
                            <button
                                type="button"
                                onClick={() => setRegistering(true)}
                                className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                            >
                                <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                                {t("correspondencePage.register") /* Зарегистрировать */}
                            </button>
                        )}
                    </>
                )}
            />

            {/* Просроченное — первый вопрос к книге, и он не должен требовать фильтра. */}
            {overdue.length > 0 && !onlyOverdue && (
                <button
                    type="button"
                    onClick={() => {
                        setOnlyOverdue(true);
                        setDirection("");
                        setCategory("");
                    }}
                    className="flex items-center gap-2.5 rounded-[12px] border border-[#f2c9c2] cursor-pointer
                               bg-[#fbeae7] px-4 py-3 text-left transition hover:border-[#c0392b]"
                >
                    <TriangleAlert size={18} className="shrink-0 text-[#c0392b]"/>
                    <span className="text-[14px] font-medium text-[#c0392b]">
                        {t("correspondencePage.overdueBanner", {total: overdue.length}) /* Просрочено писем: N */}
                    </span>
                    <span className="text-[13px] text-[#8a5c55]">
                        {overdue.slice(0, 2).map((l) => l.correspondentTitle).filter(Boolean).join(", ")}
                        {overdue.length > 2 && ` ${t("correspondencePage.andOthers")}` /* и другие */}
                    </span>
                    <span className="ml-auto text-[13px] font-medium text-[#c0392b]">
                        {t("correspondencePage.showOverdue") /* показать → */}
                    </span>
                </button>
            )}

            <Tabs<LetterDirection | "">
                className=""
                tabs={[
                    {id: "", label: t("correspondencePage.directionAll") /* Все */},
                    {id: "Incoming", label: t("correspondencePage.directionIncoming") /* Входящие */},
                    {id: "Outgoing", label: t("correspondencePage.directionOutgoing") /* Исходящие */},
                ]}
                value={direction}
                onChange={setDirection}
            />

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[260px]">
                    <SearchBar
                        variant="gray"
                        value={text}
                        onChange={setText}
                        onSubmit={() => void load()}
                        placeholder={t("correspondencePage.searchPlaceholder") /* Тема, номер или изложение */}
                    />
                </div>
                <SelectDropdown
                    options={categoryOptions}
                    value={category}
                    onChange={(value) => setCategory(value as LetterCategory | "")}
                    minWidth="200px"
                />
                <PlainCheckbox checked={onlyOverdue} onChange={setOnlyOverdue}>
                    {t("correspondencePage.onlyOverdue") /* Только просроченное */}
                </PlainCheckbox>
            </div>

            {loading ? (
                <Loader label={t("correspondencePage.loading") /* Загружаем книгу… */}/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title={t("correspondencePage.emptyTitle") /* Писем нет */}
                    description={t("correspondencePage.emptyDescription") /* По выбранным условиям в книге ничего не нашлось. */}
                />
            ) : (
                <DataTable
                    headers={[
                        t("correspondencePage.columns.number"), /* Номер */
                        t("correspondencePage.columns.correspondent"), /* Корреспондент */
                        t("correspondencePage.columns.subject"), /* Тема */
                        t("correspondencePage.columns.category"), /* Категория */
                        t("correspondencePage.columns.due"), /* Срок */
                        t("correspondencePage.columns.status"), /* Состояние */
                    ]}
                >
                    {rows.map((letter) => (
                        <Row key={letter.id} onClick={() => setOpened(letter.id)} alert={letter.isOverdue}>
                            <Cell mono>
                                <span className="flex items-center gap-1.5">
                                    {letter.direction === "Incoming"
                                        ? <ArrowDownLeft size={13} className="text-[#1c7a4d]"/>
                                        : <ArrowUpRight size={13} className="text-[#4e57d6]"/>}
                                    {letter.regNumber
                                        ? <HighlightText text={letter.regNumber} query={appliedText}/>
                                        : t("correspondencePage.draft") /* проект */}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                    {formatDate(letter.registeredOn)}
                                </span>
                            </Cell>

                            <Cell strong>
                                {letter.correspondentTitle ?? "—"}
                                {letter.theirNumber && (
                                    <span className="mt-0.5 block font-mono text-[11.5px] font-normal text-[#8b97ab]">
                                        {t("correspondencePage.theirNumber", {
                                            number: letter.theirNumber,
                                            date: formatDate(letter.theirDate),
                                        }) /* их № … от … */}
                                    </span>
                                )}
                            </Cell>

                            <Cell className="max-w-[360px]">
                                <span className="line-clamp-2">
                                    <HighlightText text={letter.subject} query={appliedText}/>
                                </span>
                                {letter.inReplyToNumber && (
                                    <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                        {t("correspondencePage.inReplyTo", {number: letter.inReplyToNumber})
                                            /* в ответ на … */}
                                    </span>
                                )}
                            </Cell>

                            <Cell nowrap>
                                {letter.category !== "Ordinary" && (
                                    <Badge tone={CATEGORY_TONE[letter.category]}>
                                        {t(`correspondencePage.categories.${letter.category}`)}
                                    </Badge>
                                )}
                            </Cell>

                            <Cell mono>
                                {letter.dueDate ? (
                                    <>
                                        {formatDate(letter.dueDate)}
                                        <span
                                            className={`mt-0.5 block text-[11.5px] font-semibold
                                                ${letter.isOverdue ? "text-[#c0392b]" : "text-[#8b97ab]"}`}
                                        >
                                            {formatDaysLeft(letter.daysLeft, t)}
                                        </span>
                                    </>
                                ) : "—"}
                            </Cell>

                            <Cell nowrap>
                                <Badge
                                    tone={
                                        letter.status === "Answered" || letter.status === "Closed" || letter.status === "Sent"
                                            ? "good"
                                            : letter.isOverdue ? "bad" : "info"
                                    }
                                >
                                    {t(`correspondencePage.statuses.${letter.status}`)}
                                </Badge>
                            </Cell>
                        </Row>
                    ))}
                </DataTable>
            )}

            {opened !== null && (
                <LetterCardModal
                    id={opened}
                    onClose={() => setOpened(null)}
                    onChanged={() => void load()}
                />
            )}

            {registering && (
                <LetterRegisterModal
                    onClose={() => setRegistering(false)}
                    onSaved={(letter) => {
                        setRegistering(false);
                        toast.success(
                            t("correspondencePage.registered", {defaultValue: "Письмо зарегистрировано"}),
                            letter.regNumber ? `№ ${letter.regNumber}` : letter.subject,
                        );
                        void load();
                    }}
                />
            )}
        </div>
    );
}
