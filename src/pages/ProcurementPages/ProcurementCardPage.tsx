import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import {Check, ChevronDown, Plus, Search, X} from "lucide-react";
import {colors} from "@/design/tokens";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {BoardReviewCard} from "@/components/componentsGeneral/BoardReviewCard.tsx";
import {DocumentHistory} from "@/components/componentsGeneral/DocumentHistory.tsx";
import {
    PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCard,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {ProposalsPanel} from "@/components/procurement/ProposalsPanel.tsx";
import {ProcurementRoutePanel} from "@/components/procurement/ProcurementRoutePanel.tsx";
import {TenderPanel} from "@/components/procurement/TenderPanel.tsx";
import {ContractPanel} from "@/components/procurement/ContractPanel.tsx";
import {GuaranteeClaimPanel} from "@/components/procurement/GuaranteeClaimPanel.tsx";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";
import {formatDate} from "@/utils/dateUtils.ts";

/**
 * Карточка закупки (экран v8 isPrcCard): параметры заявки, решение Матрицы полномочий
 * и действия по маршруту. Коммерческие предложения и сравнительная таблица придут
 * следующим срезом (PRC-09/12).
 */

const STATUS_TONE: Partial<Record<ProcurementStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    Approved: colors.status.active,
    InProcurement: colors.status.consol,
    Completed: colors.status.active,
    OnRevision: colors.status.onact,
    Rejected: colors.status.arch,
    Cancelled: colors.status.draft,
};

export const ProcurementCardPage = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Мастер создания сообщает сюда, если какой-то файл не приложился: заявка
    // уже создана, и терять это сообщение при переходе нельзя.
    const location = useLocation();
    const attachmentError = (location.state as { attachmentError?: string } | null)?.attachmentError;

    const [card, setCard] = useState<ProcurementCard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Дополнительные согласующие: по желанию инициатора — сверх авточепочки Матрицы.
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [extraApprovers, setExtraApprovers] = useState<number[]>([]);

    useEffect(() => {
        userService.lookup().then(setUsers).catch(() => undefined);
    }, []);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            setCard(await procurementService.get(Number(id)));
        } catch {
            setError("Заявка не найдена");
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = async () => {
        if (!card) return;
        try {
            setBusy(true);
            setError(null);
            setCard(await procurementService.submit(card.id, extraApprovers));
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось отправить заявку на согласование");
        } finally {
            setBusy(false);
        }
    };

    if (error && !card) return <div style={{padding: 24, color: "#e0483d"}}>{error}</div>;
    if (!card) return <div style={{padding: 24, color: "#8b97ab"}}>Загрузка…</div>;

    const tone = STATUS_TONE[card.statusCode] ?? colors.status.draft;
    const canSubmit = card.statusCode === "Draft" || card.statusCode === "OnRevision";

    // Заявку, сохранённую неполной, надо чем-то исправлять: без правки она
    // оставалась в реестре навсегда — отправить нельзя, изменить нечем.
    const canEdit = canSubmit;
    const canDelete = card.statusCode === "Draft";

    const remove = async () => {
        if (!window.confirm(`Удалить черновик заявки «${card.subject}»?`)) return;
        try {
            setBusy(true);
            await procurementService.remove(card.id);
            navigate("/prc");
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setError(message ?? "Не удалось удалить заявку");
            setBusy(false);
        }
    };
    const конкурс = card.methodShortTitle.startsWith("Конкурс");

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1120}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 16}}>
                <div style={{flex: 1}}>
                    <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                        <Link to="/prc" style={{color: "#8b97ab", textDecoration: "none"}}>Реестр закупок</Link>
                        {" · "}{card.regNumber ?? "без номера"}
                        {card.sourceSzRegNumber && ` · по записке ${card.sourceSzRegNumber}`}
                    </div>
                    <h1 style={{margin: "4px 0 0", fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        {card.subject}
                    </h1>
                    <div style={{marginTop: 6, display: "flex", gap: 8, alignItems: "center"}}>
                        <span style={{
                            padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                            color: tone.fg, background: tone.bg,
                        }}>
                            {PROCUREMENT_STATUS_LABEL[card.statusCode]}
                        </span>
                        <span style={{fontSize: 12.5, color: "#55617a"}}>
                            {card.amount.toLocaleString("ru-RU")} сом · {card.methodShortTitle}
                        </span>
                    </div>
                </div>

                {canEdit && (
                    <button
                        onClick={() => navigate(`/prc/${card.id}/edit`)}
                        disabled={busy}
                        style={{
                            height: 38, padding: "0 18px", borderRadius: 10, cursor: "pointer",
                            border: "1px solid #e5e9f0", background: "#fff", color: "#55617a",
                            font: "inherit", fontSize: 13, fontWeight: 600,
                        }}
                    >
                        Изменить
                    </button>
                )}

                {canDelete && (
                    <button
                        onClick={remove}
                        disabled={busy}
                        style={{
                            height: 38, padding: "0 18px", borderRadius: 10, cursor: "pointer",
                            border: "1px solid #f1c9c2", background: "#fff", color: "#c0392b",
                            font: "inherit", fontSize: 13, fontWeight: 600,
                        }}
                    >
                        Удалить
                    </button>
                )}

                {canSubmit && (
                    <button
                        onClick={submit}
                        disabled={busy || card.blockers.length > 0}
                        title={card.blockers.length > 0 ? card.blockers.join("; ") : undefined}
                        style={{
                            height: 38, padding: "0 18px", border: "none", borderRadius: 10,
                            background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 13, fontWeight: 600,
                            cursor: card.blockers.length > 0 ? "not-allowed" : "pointer",
                            opacity: busy || card.blockers.length > 0 ? 0.5 : 1,
                        }}
                    >
                        {busy ? "Отправка…" : "На согласование"}
                    </button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}
            {attachmentError && (
                <div style={{color: "#c77700", fontSize: 13}}>
                    {attachmentError}. Приложите их здесь.
                </div>
            )}

            {canSubmit && (
                <ExtraApproversPicker
                    users={users}
                    value={extraApprovers}
                    onChange={setExtraApprovers}
                />
            )}

            {card.blockers.length > 0 && (
                <section style={{...cardStyle, borderColor: "#f0c98a", background: "#fffaf0"}}>
                    <div style={{fontSize: 13, fontWeight: 600, color: "#8a5a00"}}>
                        Заявку нельзя отправить на согласование:
                    </div>
                    <ul style={{margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                        {card.blockers.map(b => <li key={b}>{b}</li>)}
                    </ul>
                </section>
            )}

            {/* Куда заявка ушла на коллегиальный орган: связь была в данных,
                но по карточке было не видно, дошла ли заявка до Правления. */}
            {card.boardReview && <BoardReviewCard review={card.boardReview}/>}

            <div style={{display: "grid", gridTemplateColumns: "1fr minmax(300px, 380px)", gap: 18, alignItems: "start"}}>
                <section style={cardStyle}>
                    <div style={cardTitle}>Параметры закупки</div>
                    <Row label="Предмет закупки" value={card.subject}/>
                    <Row label="Тип предмета" value={card.subjectKindTitle}/>
                    <Row label="Сумма" value={`${card.amount.toLocaleString("ru-RU")} сом`}/>
                    <Row label="Бюджет" value={card.hasBudget ? "предусмотрено" : "вне бюджета"}/>
                    <Row label="Позиция Плана закупок" value={card.planItem ?? "—"}/>
                    <Row label="ТЗ (спецификация)" value={card.hasSpecification ? "приложено" : "не приложено"}/>
                    <Row
                        label="Сроки объявления"
                        value={card.announcementFrom && card.announcementTo
                            ? `с ${formatDate(card.announcementFrom)} по ${formatDate(card.announcementTo)}`
                            : "не заданы"}
                    />
                    <Row label="Инициатор" value={card.initiatorName ?? "—"}/>
                    <Row label="Инициирующее СП" value={card.initiatorUnit ?? "—"}/>
                    <Row label="Куратор" value={card.curatorName ?? "—"}/>

                    {card.justification && (
                        <>
                            <div style={{...cardTitle, marginTop: 18}}>Обоснование необходимости</div>
                            <div style={{fontSize: 13, color: "#26324a", lineHeight: 1.7}}>{card.justification}</div>
                        </>
                    )}

                    {/* Файлы обоснования и ТЗ — здесь же, где само обоснование и бюджет. */}
                    <AttachmentsPanel
                        documentId={card.documentId}
                        editable={canSubmit}
                        title="Вложения к обоснованию"
                        hint="необязательно"
                    />
                </section>

                <aside style={cardStyle}>
                    <div style={cardTitle}>Решение матрицы полномочий</div>
                    <Row label="Способ закупки" value={card.methodTitle}/>
                    <Row label="Согласование" value={card.approvalChain ?? "—"}/>
                    <Row label="Утверждение расхода" value={card.approvalAuthorityTitle}/>
                    <Row label="Протокол закупки" value={card.protocolRequired ? "требуется" : "не требуется"}/>
                    {card.minProposals > 0 && <Row label="Минимум КП" value={String(card.minProposals)}/>}
                    {card.methodJustification && (
                        <>
                            <div style={{...cardTitle, marginTop: 18}}>Обоснование способа</div>
                            <div style={{fontSize: 12.5, color: "#26324a", lineHeight: 1.7}}>
                                {card.methodJustification}
                            </div>
                        </>
                    )}

                    {card.protocolRequired && (
                        <button
                            onClick={() => navigate(`/prc/${card.id}/protocol`)}
                            style={{
                                marginTop: 16, width: "100%", height: 34, border: "none", borderRadius: 9,
                                background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Протокол закупки
                        </button>
                    )}

                    <button
                        onClick={() => navigate("/prc/matrix")}
                        style={{
                            marginTop: 8, width: "100%", height: 34, border: "1px solid #e5e9f0", borderRadius: 9,
                            background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Открыть матрицу полномочий
                    </button>
                </aside>
            </div>

            {/* Маршрут появляется после отправки заявки на согласование */}
            {card.routeInstanceId && (
                <ProcurementRoutePanel routeInstanceId={card.routeInstanceId} onResolved={load}/>
            )}

            {/* Отбор идёт одним из двух способов, и показывать надо ровно один.
                До 500 000 — запрос ценовых предложений: собирают не менее трёх КП,
                комиссия не создаётся. Свыше — конкурс: заявки подают в срок, вскрывает
                и оценивает комиссия. Раньше обе панели висели рядом, и при конкурсе
                выходило, будто предложения собирают дважды. */}
            {конкурс ? (
                <TenderPanel requestId={card.id} documentId={card.documentId} onChanged={load}/>
            ) : (
                <ProposalsPanel requestId={card.id} documentId={card.documentId} onChanged={load}/>
            )}

            <ContractPanel requestId={card.id} onChanged={load}/>

            {/* Обеспечения и претензии появляются, когда есть конкурс или договор */}
            <GuaranteeClaimPanel tenderId={card.tenderId} contractId={card.contractId} onChanged={load}/>

            {/* История заявки: раньше журнал вёлся только по ВНД, теперь по всем контурам. */}
            <DocumentHistory entityType="ProcurementRequest" entityId={card.id}/>
        </div>
    );
};

/** Старшинство в подборе: Правление → руководители подразделений → остальные. */
function seniority(u: UserLookupItem): number {
    if (u.isBoardMember) return 0;
    if (u.isUnitHead) return 1;
    return 2;
}

/**
 * Дополнительные согласующие — необязательная добавка к автоматическому маршруту.
 *
 * Матрица полномочий сама собирает цепочку согласования; здесь инициатор при
 * необходимости добавляет людей сверх неё — они встают шагами в конце маршрута.
 * Поле спрятано за кнопкой и по умолчанию пусто: большинство заявок идёт только
 * по авточепочке, и лишний список согласующих на карточке лишь мешал бы.
 */
const ExtraApproversPicker = ({
    users, value, onChange,
}: {
    users: UserLookupItem[];
    value: number[];
    onChange: (ids: number[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    const byId = useMemo(
        () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<number, UserLookupItem>,
        [users]);

    const found = useMemo(() => {
        const q = query.trim().toLowerCase();
        const match = q
            ? users.filter((u) =>
                u.fullName.toLowerCase().includes(q)
                || (u.position ?? "").toLowerCase().includes(q)
                || (u.orgUnit ?? "").toLowerCase().includes(q))
            : users;
        return [...match].sort((a, b) =>
            seniority(a) - seniority(b) || a.fullName.localeCompare(b.fullName, "ru"));
    }, [users, query]);

    const toggle = (id: number) =>
        onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

    const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setPickerOpen(false);
    };

    return (
        <section style={cardStyle}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0,
                    border: "none", background: "transparent", cursor: "pointer", font: "inherit",
                    color: "#55617a", fontSize: 13, fontWeight: 600, textAlign: "left",
                }}
            >
                <Plus size={15} style={{color: "#2f68f5", transform: open ? "rotate(45deg)" : "none", transition: "transform .15s"}}/>
                <span style={{flex: 1}}>
                    Дополнительные согласующие
                    {value.length > 0 && (
                        <span style={{marginLeft: 6, color: "#2f68f5"}}>· {value.length}</span>
                    )}
                </span>
                <span style={{fontSize: 11.5, fontWeight: 500, color: "#a3adbd"}}>необязательно</span>
            </button>

            {open && (
                <div style={{marginTop: 12}}>
                    <div style={{fontSize: 12, color: "#8b97ab", lineHeight: 1.6, marginBottom: 10}}>
                        Заявка идёт по автоматическому маршруту Матрицы полномочий. Выбранные здесь
                        согласующие добавляются шагами в конце маршрута.
                    </div>

                    <div className="relative" ref={ref} onBlur={onBlur}>
                        <button
                            type="button"
                            onClick={() => setPickerOpen(!pickerOpen)}
                            className="flex h-10 w-full items-center justify-between rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#55617a] outline-none focus:border-[#2f68f5]"
                        >
                            <span>Выбрать согласующих</span>
                            <ChevronDown size={15} className={pickerOpen ? "rotate-180 transition" : "transition"}/>
                        </button>

                        {pickerOpen && (
                            <div className="absolute z-20 mt-1 w-full rounded-[10px] border border-[#e5e9f0] bg-white shadow-lg">
                                <label className="relative flex items-center border-b border-[#eef2f7] px-3">
                                    <Search size={14} className="pointer-events-none absolute left-3 text-[#a3adbd]"/>
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Поиск по ФИО, должности, подразделению"
                                        className="h-10 w-full border-none bg-transparent pl-6 text-[13px] outline-none"
                                    />
                                </label>

                                <div className="max-h-[280px] overflow-y-auto p-1">
                                    {found.length === 0 ? (
                                        <p className="m-0 px-3 py-5 text-center text-[12.5px] text-[#a6b0c2]">
                                            Никого не нашлось
                                        </p>
                                    ) : found.map((u) => {
                                        const picked = value.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => toggle(u.id)}
                                                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-none px-2.5 py-2 text-left ${
                                                    picked ? "bg-[#eaf0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                                            >
                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                                                    picked ? "border-[#2f68f5] bg-[#2f68f5]" : "border-[#c8d2e0] bg-white"}`}>
                                                    {picked && <Check size={11} className="text-white" strokeWidth={3}/>}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className={`block truncate text-[13px] ${
                                                        picked ? "font-semibold text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                                        {u.fullName}
                                                    </span>
                                                    {(u.position || u.orgUnit) && (
                                                        <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                            {[u.position, u.orgUnit].filter(Boolean).join(" · ")}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between border-t border-[#eef2f7] px-3 py-2">
                                    <span className="text-[11.5px] text-[#8b97ab]">Отмечено: {value.length}</span>
                                    <button type="button" onClick={() => setPickerOpen(false)}
                                            className="h-8 rounded-[8px] border-none bg-[#2f68f5] px-3.5 text-[12.5px] font-semibold text-white">
                                        Готово
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {value.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                            {value.map((id, i) => (
                                <div key={id}
                                     className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px]">
                                    <span className="w-5 text-[11.5px] font-semibold text-[#8b97ab]">{i + 1}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[#1c2740]">
                                            {byId[id]?.fullName ?? `Пользователь № ${id}`}
                                        </span>
                                        {byId[id]?.position && (
                                            <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                {byId[id].position}
                                            </span>
                                        )}
                                    </span>
                                    <button type="button" onClick={() => onChange(value.filter((x) => x !== id))}
                                            title="Убрать"
                                            className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#c0392b]">
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

const Row = ({label, value}: { label: string; value: string }) => (
    <div style={{display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f6f9", fontSize: 12.5}}>
        <span style={{flex: 1, color: "#8b97ab"}}>{label}</span>
        <span style={{flex: 1.2, color: "#26324a", fontWeight: 600, textAlign: "right"}}>{value}</span>
    </div>
);

const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: 13,
    padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: "#8b97ab",
    textTransform: "uppercase",
    marginBottom: 12,
};
