import {useEffect, useState} from "react";
import {ArrowDownLeft, ArrowUpRight, Plus, TriangleAlert} from "lucide-react";
import {
    correspondenceService,
    CATEGORY_ORDER, CATEGORY_SHORT,
    LETTER_STATUS_TITLE,
    type Letter, type LetterCategory, type LetterDirection,
} from "@/service/correspondenceService/correspondenceService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Badge, Cell, DataTable, FilterChip, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {LetterCardModal} from "@/components/correspondence/LetterCardModal.tsx";
import {LetterRegisterModal} from "@/components/correspondence/LetterRegisterModal.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * Книга регистрации корреспонденции.
 *
 * Одна книга на все категории, а не три реестра: письмо из НБКР, жалоба клиента и
 * счёт от поставщика различаются сроками и доступом, но не устройством. Искать
 * письмо в трёх местах хуже, чем отфильтровать в одном.
 *
 * Просроченное — сверху и отдельно. Это первый вопрос к книге каждое утро, и он не
 * должен требовать фильтра.
 */

const CATEGORY_TONE: Record<LetterCategory, BadgeTone> = {
    RegulatorRequest: "bad",
    ClientAppeal: "warn",
    BankSecrecyInquiry: "info",
    Claim: "warn",
    Ordinary: "neutral",
};

export function CorrespondencePage() {
    const {hasPermission} = useAuth();
    const canRegister = hasPermission(PermissionCode.RegisterCorrespondence);

    const [direction, setDirection] = useState<LetterDirection | "">("Incoming");
    const [category, setCategory] = useState<LetterCategory | "">("");
    const [onlyOverdue, setOnlyOverdue] = useState(false);
    const [text, setText] = useState("");

    const [rows, setRows] = useState<Letter[]>([]);
    const [overdue, setOverdue] = useState<Letter[]>([]);
    const [loading, setLoading] = useState(true);

    const [opened, setOpened] = useState<number | null>(null);
    const [registering, setRegistering] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [list, late] = await Promise.all([
                correspondenceService.search({
                    direction: direction || undefined,
                    categories: category ? [category] : undefined,
                    onlyOverdue: onlyOverdue || undefined,
                    text: text.trim() || undefined,
                    pageSize: 200,
                }),
                correspondenceService.overdue(),
            ]);
            setRows(list.items);
            setOverdue(late);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [direction, category, onlyOverdue]);

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Корреспонденция"
                description="Книга регистрации входящих и исходящих писем"
                actions={canRegister ? (
                    <button
                        type="button"
                        onClick={() => setRegistering(true)}
                        className="flex items-center gap-2 rounded-[10px] bg-[#2f68f5] px-4 py-2
                                   text-[14px] font-medium text-white transition hover:bg-[#2554cc]"
                    >
                        <Plus size={17}/>
                        Зарегистрировать
                    </button>
                ) : undefined}
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
                    className="flex items-center gap-2.5 rounded-[12px] border border-[#f2c9c2]
                               bg-[#fbeae7] px-4 py-3 text-left transition hover:border-[#c0392b]"
                >
                    <TriangleAlert size={18} className="shrink-0 text-[#c0392b]"/>
                    <span className="text-[14px] font-medium text-[#c0392b]">
                        Просрочено писем: {overdue.length}
                    </span>
                    <span className="text-[13px] text-[#8a5c55]">
                        {overdue.slice(0, 2).map((l) => l.correspondentTitle).filter(Boolean).join(", ")}
                        {overdue.length > 2 && " и другие"}
                    </span>
                    <span className="ml-auto text-[13px] font-medium text-[#c0392b]">показать →</span>
                </button>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={direction === "Incoming"} onClick={() => setDirection("Incoming")}>
                    Входящие
                </FilterChip>
                <FilterChip active={direction === "Outgoing"} onClick={() => setDirection("Outgoing")}>
                    Исходящие
                </FilterChip>
                <FilterChip active={direction === ""} onClick={() => setDirection("")}>
                    Все
                </FilterChip>

                <span className="mx-1 h-5 w-px bg-[#e1e7ef]"/>

                <FilterChip active={category === ""} onClick={() => setCategory("")}>
                    Любая категория
                </FilterChip>
                {CATEGORY_ORDER.filter((c) => c !== "Ordinary").map((value) => (
                    <FilterChip key={value} active={category === value} onClick={() => setCategory(value)}>
                        {CATEGORY_SHORT[value]}
                    </FilterChip>
                ))}

                {onlyOverdue && (
                    <FilterChip active onClick={() => setOnlyOverdue(false)}>
                        только просроченное ✕
                    </FilterChip>
                )}

                <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void load()}
                    placeholder="Тема, номер или изложение"
                    className="ml-auto w-[280px] rounded-[9px] border border-[#e1e7ef] px-3 py-1.5
                               text-[13px] outline-none transition focus:border-[#2f68f5]"
                />
            </div>

            {loading ? (
                <Loader label="Загружаем книгу…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Писем нет"
                    description="По выбранным условиям в книге ничего не нашлось."
                />
            ) : (
                <DataTable
                    headers={["Номер", "Корреспондент", "Тема", "Категория", "Срок", "Состояние"]}
                >
                    {rows.map((letter) => (
                        <Row key={letter.id} onClick={() => setOpened(letter.id)} alert={letter.isOverdue}>
                            <Cell mono>
                                <span className="flex items-center gap-1.5">
                                    {letter.direction === "Incoming"
                                        ? <ArrowDownLeft size={13} className="text-[#1c7a4d]"/>
                                        : <ArrowUpRight size={13} className="text-[#2f68f5]"/>}
                                    {letter.regNumber ?? "проект"}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] text-[#8593a8]">
                                    {formatDate(letter.registeredOn)}
                                </span>
                            </Cell>

                            <Cell strong>
                                {letter.correspondentTitle ?? "—"}
                                {letter.theirNumber && (
                                    <span className="mt-0.5 block font-mono text-[11.5px] font-normal text-[#8593a8]">
                                        их № {letter.theirNumber} от {formatDate(letter.theirDate)}
                                    </span>
                                )}
                            </Cell>

                            <Cell className="max-w-[360px]">
                                <span className="line-clamp-2">{letter.subject}</span>
                                {letter.inReplyToNumber && (
                                    <span className="mt-0.5 block text-[11.5px] text-[#8593a8]">
                                        в ответ на {letter.inReplyToNumber}
                                    </span>
                                )}
                            </Cell>

                            <Cell nowrap>
                                {letter.category !== "Ordinary" && (
                                    <Badge tone={CATEGORY_TONE[letter.category]}>
                                        {CATEGORY_SHORT[letter.category]}
                                    </Badge>
                                )}
                            </Cell>

                            <Cell mono>
                                {letter.dueDate ? (
                                    <>
                                        {formatDate(letter.dueDate)}
                                        <span
                                            className={`mt-0.5 block text-[11.5px] font-semibold
                                                ${letter.isOverdue ? "text-[#c0392b]" : "text-[#8593a8]"}`}
                                        >
                                            {formatDaysLeft(letter.daysLeft)}
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
                                    {LETTER_STATUS_TITLE[letter.status]}
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
                    onSaved={() => {
                        setRegistering(false);
                        void load();
                    }}
                />
            )}
        </div>
    );
}
