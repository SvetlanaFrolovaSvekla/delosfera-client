import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {
    // PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCard,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {attachmentService} from "@/service/documentService/attachmentService.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {toast} from "@/service/toastService.ts";

import {ProposalsPanel} from "@/components/procurement/ProposalsPanel.tsx";
import {ProcurementRoutePanel} from "@/components/procurement/ProcurementRoutePanel.tsx";
import {TenderPanel} from "@/components/procurement/TenderPanel.tsx";
import {ContractPanel} from "@/components/procurement/ContractPanel.tsx";
import {GuaranteeClaimPanel} from "@/components/procurement/GuaranteeClaimPanel.tsx";

import {BoardReviewCard} from "@/components/componentsGeneral/BoardReviewCard.tsx";
import {DocumentHistory} from "@/components/componentsGeneral/DocumentHistory.tsx";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {
    AlertTriangle, ClipboardList, FileText, Paperclip, Pencil, Plus, Scale, Send, Trash2, X,
} from "lucide-react";
import {colors} from "@/design/tokens";

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

// Название способа закупки приходит с сервера готовой строкой, отдельного кода способа
// в карточке нет. Префикс записан escape-последовательностями, чтобы в коде не было кириллицы.
const TENDER_METHOD_PREFIX = "\u041a\u043e\u043d\u043a\u0443\u0440\u0441"; // "Конкурс"

// Общий вид карточки-секции — как у Section.
const CARD_CLASS = "bg-white border border-[#eef2f7] rounded-2xl p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]";

const BTN_BASE =
    "inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-[11px] px-[18px] text-[13.5px] font-semibold " +
    "transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
    `${BTN_BASE} border-none bg-[#2f68f5] text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]`;
const BTN_SECONDARY = `${BTN_BASE} border border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]`;
const BTN_DANGER = `${BTN_BASE} border border-[#f1c9c2] bg-white text-[#c0392b] hover:bg-[#fdecea]`;

const serverMessage = (e: unknown): string | undefined =>
    (e as { response?: { data?: { message?: string } } }).response?.data?.message;

const sectionIcon = (Icon: typeof FileText) => <Icon size={16} className="text-[#2d354a]"/>;

export const ProcurementCardPage = () => {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Мастер создания сообщает сюда, если какой-то файл не приложился: заявка
    // уже создана, и терять это сообщение при переходе нельзя.
    const location = useLocation();
    const attachmentError = (location.state as { attachmentError?: string } | null)?.attachmentError;

    const [card, setCard] = useState<ProcurementCard | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [busy, setBusy] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
            setNotFound(true);
        }
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const submit = async () => {
        if (!card) return;
        try {
            setBusy(true);
            setCard(await procurementService.submit(card.id, extraApprovers));
        } catch (e) {
            // "Не удалось отправить заявку на согласование"
            toast.error(t("procurementCard.submitError"), serverMessage(e));
        } finally {
            setBusy(false);
        }
    };

    if (notFound && !card) {
        return (
            <div className="px-[26px] py-[22px] max-w-[1120px]">
                <EmptyState
                    variant="error"
                    // "Заявка не найдена"
                    title={t("procurementCard.notFound")}
                    // "К реестру закупок"
                    actionLabel={t("procurementCard.backToRegistry")}
                    onAction={() => navigate("/prc")}
                />
            </div>
        );
    }
    if (!card) return <Loader/>;

    const tone = STATUS_TONE[card.statusCode] ?? colors.status.draft;
    const canSubmit = card.statusCode === "Draft" || card.statusCode === "OnRevision";

    // Заявку, сохранённую неполной, надо чем-то исправлять: без правки она
    // оставалась в реестре навсегда — отправить нельзя, изменить нечем.
    const canEdit = canSubmit;
    const canDelete = card.statusCode === "Draft";

    const remove = async () => {
        try {
            setBusy(true);
            setDeleteError(null);
            await procurementService.remove(card.id);
            navigate("/prc");
        } catch (e) {
            // "Не удалось удалить заявку"
            setDeleteError(serverMessage(e) ?? t("procurementCard.deleteError"));
            setBusy(false);
        }
    };
    const isTender = card.methodShortTitle.startsWith(TENDER_METHOD_PREFIX);

    const money = `${card.amount.toLocaleString("ru-RU")} ${t("procurementCard.som")}`; // "сом"
    const blocked = card.blockers.length > 0;

    return (
        <div className="px-[26px] py-[22px] max-w-[1120px]">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px] text-[#8b97ab]">
                <span>
                    <Link to="/prc" className="text-[#8b97ab] no-underline hover:underline">
                        {/* Реестр закупок */}
                        {t("procurementCard.breadcrumbRegistry")}
                    </Link>
                    {" · "}
                    {/* без номера */}
                    {card.regNumber ?? t("procurementCard.noNumber")}
                    {/* по записке {card.sourceSzRegNumber} */}
                    {card.sourceSzRegNumber && ` · ${t("procurementCard.fromMemo", {number: card.sourceSzRegNumber})}`}
                </span>
                <span
                    className="rounded-[7px] px-2.5 py-1 text-[12px] font-semibold"
                    style={{color: tone.fg, background: tone.bg}}
                >
                    {/* PROCUREMENT_STATUS_LABEL[card.statusCode] */}
                    {t(`procurementRegistry.statuses.${card.statusCode}`)}
                </span>
            </div>

            <PageHeader
                title={card.subject}
                description={`${money} · ${card.methodShortTitle}`}
                actions={
                    <>
                        {canEdit && (
                            <button
                                onClick={() => navigate(`/prc/${card.id}/edit`)}
                                disabled={busy}
                                className={BTN_SECONDARY}
                            >
                                <Pencil size={16}/>
                                {/* Изменить */}
                                {t("procurementCard.edit")}
                            </button>
                        )}

                        {canDelete && (
                            <button
                                onClick={() => {
                                    setDeleteError(null);
                                    setDeleteOpen(true);
                                }}
                                disabled={busy}
                                className={BTN_DANGER}
                            >
                                <Trash2 size={16}/>
                                {/* Удалить */}
                                {t("procurementCard.delete")}
                            </button>
                        )}

                        {canSubmit && (
                            <button
                                onClick={submit}
                                disabled={busy || blocked}
                                title={blocked ? card.blockers.join("; ") : undefined}
                                className={BTN_PRIMARY}
                            >
                                <Send size={16}/>
                                {/* Отправка… / На согласование */}
                                {busy ? t("procurementCard.submitting") : t("procurementCard.submit")}
                            </button>
                        )}
                    </>
                }
            />

            <div className="flex flex-col gap-[18px]">
                {attachmentError && (
                    <AmberNotice>
                        {/* {attachmentError}. Приложите их здесь. */}
                        {t("procurementCard.attachmentError", {error: attachmentError})}
                    </AmberNotice>
                )}

                {canSubmit && (
                    <ExtraApproversPicker
                        users={users}
                        value={extraApprovers}
                        onChange={setExtraApprovers}
                    />
                )}

                {blocked && (
                    <AmberNotice>
                        <div className="font-semibold">
                            {/* Заявку нельзя отправить на согласование: */}
                            {t("procurementCard.blockersTitle")}
                        </div>
                        <ul className="m-0 mt-2 list-disc pl-[18px] text-[12.5px] leading-[1.7]">
                            {card.blockers.map(b => <li key={b}>{b}</li>)}
                        </ul>
                    </AmberNotice>
                )}

                {/* Куда заявка ушла на коллегиальный орган: связь была в данных,
                    но по карточке было не видно, дошла ли заявка до Правления. */}
                {card.boardReview && <BoardReviewCard review={card.boardReview}/>}

                <div className="grid grid-cols-[1fr_minmax(300px,380px)] items-start gap-[18px]">
                    <Section
                        noMarginBottom
                        icon={sectionIcon(ClipboardList)}
                        // Параметры закупки
                        title={t("procurementCard.params.title")}
                    >
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                            <div className="col-span-2">
                                {/* Предмет закупки */}
                                <ReadOnlyField label={t("procurementCard.params.subject")} value={card.subject}/>
                            </div>
                            {/* Тип предмета */}
                            <ReadOnlyField label={t("procurementCard.params.subjectKind")} value={card.subjectKindTitle}/>
                            {/* Сумма */}
                            <ReadOnlyField label={t("procurementCard.params.amount")} value={money}/>
                            <ReadOnlyField
                                // Бюджет
                                label={t("procurementCard.params.budget")}
                                // предусмотрено / вне бюджета
                                value={card.hasBudget ? t("procurementCard.params.budgetYes") : t("procurementCard.params.budgetNo")}
                                highlighted={!card.hasBudget}
                            />
                            {/* Позиция Плана закупок */}
                            <ReadOnlyField label={t("procurementCard.params.planItem")} value={card.planItem ?? "—"}/>
                            <div className="col-span-2">
                                <SpecificationField card={card} editable={canSubmit} onChanged={setCard}/>
                            </div>
                            <div className="col-span-2">
                                <ReadOnlyField
                                    // Сроки объявления
                                    label={t("procurementCard.params.announcement")}
                                    value={card.announcementFrom && card.announcementTo
                                        // с {from} по {to}
                                        ? t("procurementCard.params.announcementRange", {
                                            from: formatDate(card.announcementFrom),
                                            to: formatDate(card.announcementTo),
                                        })
                                        // не заданы
                                        : t("procurementCard.params.announcementNone")}
                                />
                            </div>
                            {/* Инициатор */}
                            <ReadOnlyField label={t("procurementCard.params.initiator")} value={card.initiatorName ?? "—"}/>
                            {/* Инициирующее СП */}
                            <ReadOnlyField label={t("procurementCard.params.initiatorUnit")} value={card.initiatorUnit ?? "—"}/>
                            <div className="col-span-2">
                                <ReadOnlyField
                                    // Куратор
                                    label={t("procurementCard.params.curator")}
                                    value={card.curatorName ?? "—"}
                                    linkTo={card.curatorName && card.curatorUserId ? `/users/${card.curatorUserId}` : undefined}
                                />
                            </div>

                            {card.justification && (
                                <div className="col-span-2">
                                    <ReadOnlyField
                                        // Обоснование необходимости
                                        label={t("procurementCard.params.justification")}
                                        value={<span className="whitespace-pre-line py-0.5 leading-[1.6]">{card.justification}</span>}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Файлы обоснования и ТЗ — здесь же, где само обоснование и бюджет. */}
                        <div className="mt-5">
                            <AttachmentsPanel
                                documentId={card.documentId}
                                editable={canSubmit}
                                // Вложения к обоснованию
                                title={t("procurementCard.params.attachmentsTitle")}
                                // необязательно
                                hint={t("procurementCard.params.attachmentsHint")}
                            />
                        </div>
                    </Section>

                    <aside>
                        <Section
                            noMarginBottom
                            icon={sectionIcon(Scale)}
                            // Решение матрицы полномочий
                            title={t("procurementCard.decision.title")}
                        >
                            <div className="flex flex-col gap-3.5">
                                {/* Способ закупки */}
                                <ReadOnlyField label={t("procurementCard.decision.method")} value={card.methodTitle}/>
                                {/* Согласование */}
                                <ReadOnlyField label={t("procurementCard.decision.approval")} value={card.approvalChain ?? "—"}/>
                                {/* Утверждение расхода */}
                                <ReadOnlyField label={t("procurementCard.decision.approvalAuthority")} value={card.approvalAuthorityTitle}/>
                                <ReadOnlyField
                                    // Протокол закупки
                                    label={t("procurementCard.decision.protocol")}
                                    // требуется / не требуется
                                    value={card.protocolRequired
                                        ? t("procurementCard.decision.protocolRequired")
                                        : t("procurementCard.decision.protocolNotRequired")}
                                />
                                {card.minProposals > 0 && (
                                    // Минимум КП
                                    <ReadOnlyField label={t("procurementCard.decision.minProposals")} value={String(card.minProposals)}/>
                                )}
                                {card.methodJustification && (
                                    <ReadOnlyField
                                        // Обоснование способа
                                        label={t("procurementCard.decision.methodJustification")}
                                        value={<span className="whitespace-pre-line py-0.5 leading-[1.6]">{card.methodJustification}</span>}
                                    />
                                )}
                            </div>

                            <div className="mt-5 flex flex-col gap-2">
                                {card.protocolRequired && (
                                    <button
                                        onClick={() => navigate(`/prc/${card.id}/protocol`)}
                                        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border-none bg-[#2f68f5] text-[12.5px] font-semibold text-white hover:brightness-[1.06]"
                                    >
                                        <FileText size={15}/>
                                        {/* Протокол закупки */}
                                        {t("procurementCard.decision.openProtocol")}
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate("/prc/matrix")}
                                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]"
                                >
                                    <Scale size={15}/>
                                    {/* Открыть матрицу полномочий */}
                                    {t("procurementCard.decision.openMatrix")}
                                </button>
                            </div>
                        </Section>
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
                {isTender ? (
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

            <ConfirmDeleteModal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => void remove()}
                // Удалить черновик?
                title={t("procurementCard.deleteTitle")}
                // Удалить черновик заявки «{subject}»?
                message={t("procurementCard.deleteMessage", {subject: card.subject})}
                loading={busy}
                error={deleteError}
            />
        </div>
    );
};

/** Янтарная плашка предупреждения — тон из RYG-палитры дизайн-токенов. */
const AmberNotice = ({children}: { children: React.ReactNode }) => (
    <div
        className="flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-[13px]"
        style={{
            color: colors.ryg.amber.fg,
            background: colors.ryg.amber.bg,
            borderColor: colors.ryg.amber.bd,
        }}
    >
        <AlertTriangle size={16} className="mt-0.5 flex-none"/>
        <div className="min-w-0 flex-1">{children}</div>
    </div>
);

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
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);

    const byId = useMemo(
        () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<number, UserLookupItem>,
        [users]);

    // Уже выбранных в модалке не показываем — повторно добавить человека нельзя.
    const available = useMemo(() => users.filter((u) => !value.includes(u.id)), [users, value]);

    return (
        <section className={CARD_CLASS}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-[13px] font-semibold text-[#55617a]"
            >
                <Plus size={15}
                      className={`text-[#2f68f5] transition-transform duration-150 ${open ? "rotate-45" : ""}`}/>
                <span className="flex-1">
                    {/* Дополнительные согласующие */}
                    {t("procurementCard.extra.title")}
                    {value.length > 0 && (
                        <span className="ml-1.5 text-[#2f68f5]">· {value.length}</span>
                    )}
                </span>
                <span className="text-[11.5px] font-medium text-[#a3adbd]">
                    {/* необязательно */}
                    {t("procurementCard.extra.optional")}
                </span>
            </button>

            {open && (
                <div className="mt-3">
                    <div className="mb-2.5 text-[12px] leading-[1.6] text-[#8b97ab]">
                        {/* Заявка идёт по автоматическому маршруту Матрицы полномочий. Выбранные здесь
                            согласующие добавляются шагами в конце маршрута. */}
                        {t("procurementCard.extra.description")}
                    </div>

                    <UserPickerField
                        people={available}
                        value={null}
                        onChange={(userId) => onChange([...value, userId])}
                        // Выбрать согласующих
                        placeholder={t("procurementCard.extra.choose")}
                        // Выбор согласующего
                        modalTitle={t("procurementCard.extra.modalTitle")}
                        // Поиск по ФИО, должности, подразделению
                        searchPlaceholder={t("procurementCard.extra.searchPlaceholder")}
                    />

                    {value.length > 0 && (
                        <div className="mt-2.5 flex flex-col gap-1.5">
                            {value.map((userId, i) => {
                                const user = byId[userId];
                                // Пользователь № {id}
                                const name = user?.fullName ?? t("procurementCard.extra.userNumber", {id: userId});
                                return (
                                    <div key={userId}
                                         className="flex items-center gap-2.5 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px]">
                                        <span className="w-4 text-[11.5px] font-semibold text-[#8b97ab]">{i + 1}</span>
                                        <Avatar name={name} size={28}/>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[#1c2740]">{name}</span>
                                            {user?.position && (
                                                <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                    {user.position}
                                                </span>
                                            )}
                                        </span>
                                        {/* Убрать */}
                                        <Tooltip content={t("procurementCard.extra.remove")} side="top">
                                            <button type="button"
                                                    onClick={() => onChange(value.filter((x) => x !== userId))}
                                                    className="cursor-pointer border-none bg-transparent p-1 text-[#55617a] hover:text-[#c0392b]">
                                                <X size={14}/>
                                            </button>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

/**
 * ТЗ (спецификация) — одиночный файл заявки. Прикладывается тем же способом, что и
 * «Вложения к обоснованию» (загрузка через attachments-эндпоинт), но привязывается
 * к заявке как спецификация. Загрузка/замена доступна автору на черновике/доработке.
 */
function SpecificationField({card, editable, onChanged}: {
    card: ProcurementCard;
    editable: boolean;
    onChanged: (c: ProcurementCard) => void;
}) {
    const {t} = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const pick = async (file: File) => {
        setBusy(true);
        setErr(null);
        try {
            const uploaded = await attachmentService.upload(card.documentId, file);
            onChanged(await procurementService.setSpecification(card.id, uploaded.id));
        } catch {
            // Не удалось приложить ТЗ
            setErr(t("procurementCard.spec.error"));
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    // приложено / не приложено
    const fallback = card.hasSpecification ? t("procurementCard.spec.attached") : t("procurementCard.spec.notAttached");

    return (
        <ReadOnlyField
            // ТЗ (спецификация)
            label={t("procurementCard.spec.label")}
            value={
                <span className="flex w-full min-w-0 items-center gap-2">
                    <Paperclip size={14} className="flex-none text-[#a3adbd]"/>
                    <span
                        title={card.specificationFileName ?? undefined}
                        className={`min-w-0 flex-1 truncate font-semibold ${
                            err ? "text-[#c0392b]" : card.hasSpecification ? "text-[#26324a]" : "text-[#a3adbd]"}`}
                    >
                        {err ?? card.specificationFileName ?? fallback}
                    </span>
                    {editable && (
                        <>
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void pick(f);
                                }}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => inputRef.current?.click()}
                                className="flex-none cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#2f68f5] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {/* … / Заменить / Приложить */}
                                {busy ? "…" : card.hasSpecification ? t("procurementCard.spec.replace") : t("procurementCard.spec.attach")}
                            </button>
                        </>
                    )}
                </span>
            }
        />
    );
}
