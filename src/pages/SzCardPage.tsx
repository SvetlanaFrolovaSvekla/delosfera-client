import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {ArrowLeft} from "lucide-react";
import {colors} from "@/design/tokens";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {userService} from "@/service/userService/userService.ts";
import {SzExecutionPanel} from "@/components/sz/SzExecutionPanel.tsx";
import {SzOriginalPanel} from "@/components/sz/SzOriginalPanel.tsx";
import {SzArchivePanel} from "@/components/sz/SzArchivePanel.tsx";
import {SzProcurementPanel} from "@/components/sz/SzProcurementPanel.tsx";
import {SzApproversField} from "@/components/sz/SzApproversField.tsx";
import {SzHrForm} from "@/components/sz/SzHrForm.tsx";
import {SzAddresseeDecisionPanel} from "@/components/sz/SzAddresseeDecisionPanel.tsx";
import {AttachmentsPanel} from "@/components/attachments/AttachmentsPanel.tsx";
import {
    PARTICIPANT_STATE_LABEL,
    RESOLUTION_LABEL,
    ROUTE_STATUS_LABEL,
    workflowService,
    type ResolutionType,
    type RouteInstance,
} from "@/service/workflowService/workflowService.ts";
import {SignatureStampView} from "@/components/signing/SignatureStampView.tsx";
import {QualifiedSignDialog} from "@/components/signing/QualifiedSignDialog.tsx";
import {
    hrForms as szHrForms,
    type HrFormSchema,
    SZ_STATUS_LABEL,
    szService,
    type SzDetails,
    type SzHrKind,
    type SzKind,
    type SzSaveRequest,
    type SzStatusCode,
} from "@/service/szService/szService.ts";

const STATUS_TONE: Partial<Record<SzStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    PendingRegistration: colors.status.onact,
    Registered: colors.status.review,
    OnRevision: colors.status.onact,
    OnAddresseeDecision: colors.status.review,
    OnExecution: colors.status.consol,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
    Archived: colors.status.arch,
};

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";
const labelClass = "block text-[11.5px] text-[#8b97ab] mb-[5px]";

function Field({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className={labelClass}>{label}</span>
            {children}
        </label>
    );
}

function ReadOnly({label, value}: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className={labelClass}>{label}</div>
            <div className="min-h-10 px-3 py-2 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] text-[13px] text-[#1c2740] flex items-center">
                {value ?? "—"}
            </div>
        </div>
    );
}

export function SzCardPage() {
    const {id} = useParams<{ id: string }>();
    const isNew = !id;
    const navigate = useNavigate();
    // Справочники приходят «сырыми» с бэка: у СП и рубрик берём id и наименование.
    const {orgUnits, rubrics} = useDictionaries();
    const ORG_UNITS = orgUnits;
    const RUBRICS = rubrics;

    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [hrKinds, setHrKinds] = useState<SzHrKind[]>([]);

    /** Схема полей по видам кадровых записок — приходит с сервера один раз. */
    const [hrForms, setHrForms] = useState<Record<string, HrFormSchema>>({});

    /** Общие значения полей вида: те, что не заполняются по каждому сотруднику. */
    const [hrValues, setHrValues] = useState<Record<string, unknown>>({});
    const [sz, setSz] = useState<SzDetails | null>(null);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    /** Открыто окно подписания: этап требует квалифицированной подписи. */
    const [подписываем, setПодписываем] = useState(false);

    const [form, setForm] = useState<SzSaveRequest>({
        title: "", kindId: 0, body: "", correspondentUnitId: null, rubricIds: [],
        addresseeUserId: null, signerUserId: null, approverUserIds: [], approvalIsParallel: false,
    });

    const {user} = useAuth();
    const [route, setRoute] = useState<RouteInstance | null>(null);
    const [users, setUsers] = useState<Record<number, string>>({});
    const [userList, setUserList] = useState<{ id: number; fullName: string }[]>([]);
    const [comment, setComment] = useState("");
    const [withdrawReason, setWithdrawReason] = useState("");
    const [withdrawOpen, setWithdrawOpen] = useState(false);

    useEffect(() => {
        userService.getAll()
            .then((list) => {
                setUsers(Object.fromEntries(list.map((u) => [u.id, u.fullName])));
                setUserList(list.map((u) => ({
                    id: u.id, fullName: u.fullName,
                    position: u.position ?? null, orgUnit: u.orgUnit ?? null,
                })));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        void szHrForms().then(setHrForms).catch(() => undefined);

        Promise.all([szService.kinds(), szService.hrKinds()])
            .then(([k, hr]) => {
                setKinds(k);
                setHrKinds(hr);
                setForm((f) => (f.kindId === 0 && k.length ? {...f, kindId: k[0].id} : f));
            })
            .catch(() => setError("Не удалось загрузить справочники видов СЗ"));
    }, []);

    const applyDetails = useCallback((d: SzDetails) => {
        setSz(d);
        setForm({
            title: d.title, kindId: d.kindId, body: d.body,
            correspondentUnitId: d.correspondentUnitId, isPaperCarrier: d.isPaperCarrier,
            rubricIds: d.rubricIds,
            addresseeUserId: d.addresseeUserId,
            signerUserId: d.signerUserId,
            approverUserIds: d.approvers.map((a) => a.userId),
            approvalIsParallel: d.approvalIsParallel,
            hrKindId: d.hrKindId, employeeName: d.employeeName,
            employeeUnitId: d.employeeUnitId, transferUnitId: d.transferUnitId,
            hasBudget: d.hasBudget, amount: d.amount, travelExpenses: d.travelExpenses,
            employees: d.employees ?? [],
        });

        // Маршрут нужен и после завершения: карточка показывает, кто и как решил.
        if (d.currentRouteInstanceId) {
            workflowService.instance(d.currentRouteInstanceId).then(setRoute).catch(() => setRoute(null));
        } else {
            setRoute(null);
        }
    }, []);

    const reload = useCallback(async () => {
        if (isNew || !id) return;
        const d = await szService.get(Number(id));
        applyDetails(d);
    }, [id, isNew, applyDetails]);

    useEffect(() => {
        if (isNew) return;
        setLoading(true);
        szService.get(Number(id))
            .then(applyDetails)
            .catch(() => setError("Не удалось загрузить служебную записку"))
            .finally(() => setLoading(false));
    }, [id, isNew, applyDetails]);

    const kind = useMemo(() => kinds.find((k) => k.id === form.kindId), [kinds, form.kindId]);
    const formKey = kind?.formKey ?? "Other";

    // Правка доступна автору, пока записка не ушла дальше него: согласующий,
    // открывший карточку, редактировать текст записки не должен.
    const isAuthor = !!sz && !!user && sz.authorId === user.id;
    const editable = isNew || (isAuthor && (sz?.statusCode === "Draft" || sz?.statusCode === "OnRevision"));

    const set = <K extends keyof SzSaveRequest>(key: K, value: SzSaveRequest[K]) =>
        setForm((f) => ({...f, [key]: value}));

    const save = async () => {
        if (!form.title.trim() || !form.kindId) {
            setError("Заполните тему и вид записки");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const saved = isNew
                ? await szService.create(form)
                : await szService.update(Number(id), form);
            applyDetails(saved);
            setNotice("Сохранено");
            if (isNew) navigate(`/sz/${saved.id}`, {replace: true});
        } catch {
            setError("Не удалось сохранить служебную записку");
        } finally {
            setSaving(false);
        }
    };

    /** Активная задача согласования текущего пользователя по этой записке. */
    const myParticipant = useMemo(() => {
        if (!route || !user) return null;
        for (const step of route.steps) {
            const p = step.participants.find((x) => x.userId === user.id && x.state === "Active");
            if (p) return p;
        }
        return null;
    }, [route, user]);

    /**
     * Этап подписания отличается от согласования по существу: подписант ставит
     * подпись под текстом, с которым согласующие уже согласились, и «замечаний»
     * у него быть не может — либо подписывает, либо возвращает на доработку.
     */
    const myStepKind = useMemo(() => {
        if (!route || !myParticipant) return null;
        return route.steps.find((s) => s.participants.some((p) => p.id === myParticipant.id))?.kind ?? null;
    }, [route, myParticipant]);

    const isSigningStep = myStepKind === "Signing";

    /**
     * Этап может требовать квалифицированной подписи. Тогда решение не отправляется
     * сразу: сначала подписант ставит подпись криптопровайдером, и только потом её
     * идентификатор уходит вместе с решением. Иначе сервер отказал бы — и правильно
     * сделал бы, но человек не понял бы, чего от него хотят.
     */
    const requiredLevel = useMemo(() => {
        if (!route || !myParticipant) return null;
        return route.steps.find((s) => s.participants.some((p) => p.id === myParticipant.id))
            ?.requiredSignatureLevel ?? null;
    }, [route, myParticipant]);

    const needsQualified = requiredLevel === "Qualified";

    /** Открытые замечания — их устраняет инициатор, после чего маршрут идёт с того же этапа. */
    const openRemarks = useMemo(() => {
        if (!route) return [];
        return route.steps.flatMap((s) => s.participants).flatMap((p) =>
            (p.resolution?.remarks ?? [])
                .filter((r) => r.state === "Open")
                .map((r) => ({...r, userId: p.userId})));
    }, [route]);

    const resolve = async (type: ResolutionType, signatureId?: number) => {
        if (!myParticipant) return;
        if ((type === "ApprovedWithRemarks" || type === "Rejected") && !comment.trim()) {
            setError("Для замечаний и отклонения нужен комментарий");
            return;
        }

        // Отклонение и возврат на доработку ничего не удостоверяют — под ними подпись
        // не нужна, и требовать её значило бы мешать остановить процесс.
        if (needsQualified && type === "Approved" && signatureId === undefined) {
            setПодписываем(true);
            return;
        }

        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await workflowService.resolve(myParticipant.id, type, comment.trim() || undefined, signatureId);
            setComment("");
            setNotice(`Решение принято: ${RESOLUTION_LABEL[type].toLowerCase()}`);
            await reload();
        } catch (e) {
            // Сервер отказывает по существу — не принят регламент подписи, решение
            // выносит другой человек, изменился документ. Общее «не удалось»
            // спрятало бы причину, и человек не понял бы, что делать.
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось отправить решение");
        } finally {
            setSaving(false);
        }
    };

    const confirmRemark = async (remarkId: number) => {
        setSaving(true);
        setError(null);
        try {
            await workflowService.confirmRemark(remarkId);
            setNotice("Замечание отмечено устранённым — согласование продолжится");
            await reload();
        } catch {
            setError("Не удалось подтвердить устранение замечания");
        } finally {
            setSaving(false);
        }
    };

    const withdraw = async () => {
        if (!sz) return;
        if (!withdrawReason.trim()) {
            setError("Укажите обоснование отзыва");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await szService.withdraw(sz.id, withdrawReason.trim());
            applyDetails(updated);
            await reload();
            setWithdrawOpen(false);
            setWithdrawReason("");
            setNotice("Записка отозвана и возвращена в черновик");
        } catch {
            setError("Не удалось отозвать записку");
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (action: "submit" | "register" | "delete") => {
        if (!sz) return;
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            if (action === "delete") {
                await szService.remove(sz.id);
                navigate("/sz");
                return;
            }
            const updated = action === "submit"
                ? await szService.submit(sz.id)
                : await szService.register(sz.id);

            // Ответ описывает записку, но маршрут создаётся тем же действием, и
            // ссылка на него может ещё не попасть в ответ. Перечитываем карточку,
            // иначе лист согласования появится только после перезагрузки страницы.
            applyDetails(updated);
            await reload();
            setNotice(action === "submit"
                ? "Записка отправлена на регистрацию"
                : `Зарегистрирована: ${updated.regNumber} · срок исполнения ${formatDate(updated.dueDate)}`);
        } catch {
            setError(action === "submit"
                ? "Не удалось отправить: проверьте текст и адресата"
                : "Не удалось зарегистрировать записку");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</div>;

    const tone = sz ? STATUS_TONE[sz.statusCode] ?? colors.status.draft : colors.status.draft;

    return (
        <div className="px-7 py-6 max-w-[1100px]">
            <button
                onClick={() => navigate("/sz")}
                className="inline-flex items-center gap-1.5 mb-3 border-none bg-transparent text-[13px] font-medium text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft className="w-4 h-4"/> Служебные записки
            </button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[13px] text-[#55617a]">{sz?.regNumber ?? "без номера"}</span>
                        {sz && (
                            <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                  style={{color: tone.fg, background: tone.bg}}>
                                {SZ_STATUS_LABEL[sz.statusCode]}
                            </span>
                        )}
                    </div>
                    <h1 className="mt-1.5 mb-0 text-[21px] font-bold tracking-[-0.02em]">
                        {isNew ? "Новая служебная записка" : sz?.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {editable && (
                        <button
                            onClick={save}
                            disabled={saving}
                            className="h-10 px-4 rounded-[10px] border-none bg-[#2f68f5] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                        >
                            {saving ? "Сохранение…" : "Сохранить"}
                        </button>
                    )}
                    {sz && isAuthor && (sz.statusCode === "Draft" || sz.statusCode === "OnRevision") && (
                        <button
                            onClick={() => runAction("submit")}
                            disabled={saving}
                            className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#2f68f5] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50"
                        >
                            Отправить на регистрацию
                        </button>
                    )}
                    {sz?.statusCode === "PendingRegistration" && (
                        <button
                            onClick={() => runAction("register")}
                            disabled={saving}
                            className="h-10 px-4 rounded-[10px] border-none bg-[#1c7a4d] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                        >
                            Зарегистрировать
                        </button>
                    )}
                    {/* Печатная форма нужна и электронной записке — например, для подшивки в дело. */}
                    {sz && sz.statusCode !== "Draft" && (
                        <a
                            href={`/sz/${sz.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] no-underline inline-flex items-center hover:bg-[#f6f8fb]"
                        >
                            Печатная форма
                        </a>
                    )}
                    {sz && isAuthor && ["PendingRegistration", "Registered", "OnRevision"].includes(sz.statusCode) && (
                        <button
                            onClick={() => setWithdrawOpen((v) => !v)}
                            disabled={saving}
                            className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50"
                        >
                            Отозвать
                        </button>
                    )}
                    {sz?.statusCode === "Draft" && isAuthor && (
                        <button
                            onClick={() => runAction("delete")}
                            disabled={saving}
                            className="h-10 px-4 rounded-[10px] border border-[#f1c9c2] bg-white text-[#c0392b] font-semibold text-[13px] cursor-pointer hover:bg-[#fbeae7] disabled:opacity-50"
                        >
                            Удалить
                        </button>
                    )}
                </div>
            </div>

            {notice && (
                <div className="mt-4 rounded-[10px] border border-[#c3e6d1] bg-[#e9f6ee] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    {notice}
                </div>
            )}
            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {withdrawOpen && (
                <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                    <div className="text-[13px] font-semibold text-[#0f1b2d]">Отзыв записки</div>
                    <p className="mt-1 mb-2.5 text-[12.5px] text-[#8b97ab]">
                        Согласование прервётся, записка вернётся вам в черновик. Повторная отправка пойдёт с первого этапа.
                    </p>
                    <textarea
                        value={withdrawReason}
                        onChange={(e) => setWithdrawReason(e.target.value)}
                        rows={3}
                        placeholder="Обоснование отзыва — его увидят участники согласования"
                        className="w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none resize-y focus:border-[#2f68f5]"
                    />
                    <div className="mt-2.5 flex gap-2">
                        <button
                            onClick={withdraw}
                            disabled={saving}
                            className="h-9 px-4 rounded-[9px] border-none bg-[#c0392b] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                        >
                            Отозвать записку
                        </button>
                        <button
                            onClick={() => setWithdrawOpen(false)}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {sz?.withdrawReason && sz.statusCode === "Draft" && (
                <div className="mt-4 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
                    Записка была отозвана: {sz.withdrawReason}
                </div>
            )}

            <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Тема">
                        <input className={inputClass} value={form.title} disabled={!editable}
                               onChange={(e) => set("title", e.target.value)}/>
                    </Field>
                    <Field label="Вид записки">
                        <select className={inputClass} value={form.kindId} disabled={!editable}
                                onChange={(e) => set("kindId", Number(e.target.value))}>
                            {kinds.map((k) => <option key={k.id} value={k.id}>{k.titleRu}</option>)}
                        </select>
                    </Field>
                    <Field label="Кому">
                        <select className={inputClass} value={form.addresseeUserId ?? ""} disabled={!editable}
                                onChange={(e) => set("addresseeUserId", e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Не выбрано</option>
                            {userList.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </Field>
                    <Field label="Адресат — структурное подразделение">
                        <select className={inputClass} value={form.correspondentUnitId ?? ""} disabled={!editable}
                                onChange={(e) => set("correspondentUnitId", e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Не выбрано</option>
                            {ORG_UNITS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </Field>
                    <label className="flex items-end gap-2 pb-2.5 text-[13px] text-[#55617a]">
                        <input type="checkbox" checked={form.isPaperCarrier ?? kind?.isPaperByDefault ?? false}
                               disabled={!editable}
                               onChange={(e) => set("isPaperCarrier", e.target.checked)}/>
                        Бумажный носитель
                    </label>
                </div>

                <div className="mt-4">
                    <span className={labelClass}>Текст записки</span>
                    <textarea
                        value={form.body ?? ""} disabled={!editable}
                        onChange={(e) => set("body", e.target.value)}
                        rows={7}
                        className="w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] leading-[1.6] outline-none resize-y focus:border-[#2f68f5]"
                    />
                </div>

                {formKey === "Hr" && (
                    <div className="mt-4">
                        <Field label="Вид кадровой записки">
                            <select className={inputClass} value={form.hrKindId ?? ""} disabled={!editable}
                                    onChange={(e) => set("hrKindId", e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Не выбрано</option>
                                {hrKinds.map((k) => <option key={k.id} value={k.id}>{k.titleRu}</option>)}
                            </select>
                        </Field>

                        {/* Поля зависят от вида: у командировки свои, у изменения оклада свои.
                            Схему отдаёт сервер, здесь её только рисуют. */}
                        <SzHrForm
                            schema={hrForms[hrKinds.find((k) => k.id === form.hrKindId)?.titleRu ?? ""] ?? null}
                            employees={form.employees ?? []}
                            onEmployeesChange={(list) => set("employees", list)}
                            values={hrValues}
                            onValuesChange={setHrValues}
                            users={userList}
                            orgUnits={ORG_UNITS.map((u) => ({id: Number(u.id), name: u.name}))}
                            editable={editable}
                        />
                    </div>
                )}

                {formKey === "Procurement" && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <label className="flex items-end gap-2 pb-2.5 text-[13px] text-[#55617a]">
                            <input type="checkbox" checked={form.hasBudget ?? false} disabled={!editable}
                                   onChange={(e) => set("hasBudget", e.target.checked)}/>
                            Заложено в бюджет
                        </label>
                        <Field label="Сумма закупки">
                            <input className={inputClass} type="number" step="0.01" value={form.amount ?? ""} disabled={!editable}
                                   onChange={(e) => set("amount", e.target.value ? Number(e.target.value) : null)}/>
                        </Field>
                    </div>
                )}

                {formKey === "Training" && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <Field label="ФИО сотрудника">
                            <input className={inputClass} value={form.employeeName ?? ""} disabled={!editable}
                                   onChange={(e) => set("employeeName", e.target.value)}/>
                        </Field>
                        <Field label="Филиал / СП сотрудника">
                            <select className={inputClass} value={form.employeeUnitId ?? ""} disabled={!editable}
                                    onChange={(e) => set("employeeUnitId", e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Не выбрано</option>
                                {ORG_UNITS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </Field>
                        <label className="flex items-end gap-2 pb-2.5 text-[13px] text-[#55617a]">
                            <input type="checkbox" checked={form.travelExpenses ?? false} disabled={!editable}
                                   onChange={(e) => set("travelExpenses", e.target.checked)}/>
                            Есть командировочные расходы
                        </label>
                    </div>
                )}

                <div className="mt-4">
                    <span className={labelClass}>Рубрикатор (записка может лежать в нескольких рубриках)</span>
                    <div className="flex flex-wrap gap-2">
                        {RUBRICS.map((r) => {
                            const rid = Number(r.id);
                            const on = (form.rubricIds ?? []).includes(rid);
                            return (
                                <button
                                    key={r.id}
                                    disabled={!editable}
                                    onClick={() => set("rubricIds", on
                                        ? (form.rubricIds ?? []).filter((x) => x !== rid)
                                        : [...(form.rubricIds ?? []), rid])}
                                    className={`h-8 px-3 rounded-full border text-[12.5px] font-semibold cursor-pointer disabled:cursor-not-allowed ${
                                        on ? "border-[#cbddff] bg-[#e9f0ff] text-[#2f68f5]" : "border-[#e5e9f0] bg-white text-[#55617a]"}`}
                                >
                                    {r.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <SzApproversField
                    value={form.approverUserIds ?? []}
                    onChange={(ids) => set("approverUserIds", ids)}
                    users={userList}
                    parallel={form.approvalIsParallel ?? false}
                    onParallelChange={(p) => set("approvalIsParallel", p)}
                    editable={editable}
                />

                {/*
                  Подписант замыкает маршрут: он ставит подпись после того, как
                  согласующие высказались по существу. Поле необязательное — записка
                  может идти и без отдельного подписания.
                */}
                <div className="mt-4">
                    <Field label="Подписант">
                        <select className={inputClass} value={form.signerUserId ?? ""} disabled={!editable}
                                onChange={(e) => set("signerUserId", e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Без подписания</option>
                            {userList.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </Field>
                    <div className="mt-1 text-[11.5px] text-[#8b97ab]">
                        Подписывает записку последним, после согласования
                    </div>
                </div>

                <AttachmentsPanel
                    documentId={sz?.documentId ?? null}
                    editable={editable}
                    hint="необязательно"
                />
            </div>

            {sz && (
                <SzAddresseeDecisionPanel
                    sz={sz}
                    currentUserId={user?.id}
                    users={userList}
                    onDecided={applyDetails}
                />
            )}

            {sz && (
                <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                    <h2 className="m-0 mb-3 text-[15px] font-semibold">Регистрация и сроки</h2>
                    <div className="grid grid-cols-4 gap-4">
                        <ReadOnly label="Автор" value={sz.author}/>
                        <ReadOnly label="СП автора" value={sz.authorUnit}/>
                        <ReadOnly label="Дата регистрации" value={formatDate(sz.registeredOn)}/>
                        <ReadOnly label="Срок исполнения" value={
                            sz.dueDate
                                ? <span className="inline-flex items-center gap-2">
                                    {formatDate(sz.dueDate)}
                                    <span className="text-[11.5px] font-semibold"
                                          style={{color: sz.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                        {sz.isOverdue ? `−${Math.abs(sz.daysLeft ?? 0)} дн` : `через ${sz.daysLeft} дн`}
                                    </span>
                                  </span>
                                : "—"
                        }/>
                    </div>
                </div>
            )}

            {/* Исполнение начинается после согласования — панель ведёт поручения и сроки. */}
            {sz && (sz.statusCode === "OnExecution" || sz.statusCode === "Executed") && (
                <SzExecutionPanel sz={sz} onChanged={reload}/>
            )}

            {/* Бумажный контур: оригинал существует только у зарегистрированной записки. */}
            {sz && sz.statusCode !== "Draft" && (
                <SzOriginalPanel szId={sz.id} isPaperCarrier={sz.isPaperCarrier}/>
            )}

            {/* Закупка запускается по согласованной записке — панель ведёт передачу реквизитов. */}
            {sz && sz.statusCode !== "Draft" && (
                <SzProcurementPanel szId={sz.id} formKey={formKey}/>
            )}

            {sz && <SzArchivePanel szId={sz.id} statusCode={sz.statusCode} onChanged={reload}/>}

            {route && (
                <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="m-0 text-[15px] font-semibold">Согласование</h2>
                        <span className="text-[12.5px] text-[#8b97ab]">
                            {ROUTE_STATUS_LABEL[route.status]}
                            {sz && sz.approvalRounds > 1 && ` · круг ${sz.approvalRounds}`}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {route.steps.map((step) => (
                            <div key={step.id} className="rounded-[10px] border border-[#eef2f7] px-4 py-3">
                                <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                                    Этап {step.order}
                                    {step.kind === "Signing" && " · подписание"}
                                    {step.isFinalMethodology && " · финальный контроль"}
                                </div>
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {step.participants.map((p) => (
                                        <div key={p.id} className="flex items-start justify-between gap-3 text-[13px]">
                                            <div>
                                                <span className="text-[#1c2740]">
                                                    {p.userFullName
                                                        ?? (p.userId ? users[p.userId] ?? `Пользователь #${p.userId}` : "—")}
                                                </span>
                                                {p.resolution?.comment && (
                                                    <div className="text-[12.5px] text-[#8b97ab]">{p.resolution.comment}</div>
                                                )}
                                                {p.resolution?.signature && (
                                                    <SignatureStampView signature={p.resolution.signature}/>
                                                )}
                                            </div>
                                            <span className="text-[12px] font-semibold whitespace-nowrap"
                                                  style={{color: p.resolution
                                                      ? (p.resolution.type === "Rejected" ? colors.ryg.red.fg : colors.ryg.green.fg)
                                                      : colors.inkSubtle}}>
                                                {p.resolution
                                                    ? RESOLUTION_LABEL[p.resolution.type]
                                                    : PARTICIPANT_STATE_LABEL[p.state]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Резолюция доступна только тому, чья задача сейчас активна. */}
                    {myParticipant && (
                        <div className="mt-4 rounded-[10px] border border-[#cbddff] bg-[#f5f8ff] p-4">
                            <div className="text-[13px] font-semibold text-[#0f1b2d]">
                                {isSigningStep ? "Подписание записки" : "Ваше решение по записке"}
                            </div>

                            {needsQualified && (
                                <div className="mt-2 rounded-[9px] border border-[#cbddff] bg-white px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#55617a]">
                                    Этап закрывается <b>квалифицированной подписью</b>. По кнопке
                                    «{isSigningStep ? "Подписать" : "Согласовать"}» откроется рабочее
                                    место: подпись ставит криптопровайдер на вашем компьютере, ключ
                                    на сервер не передаётся.
                                </div>
                            )}
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                placeholder={isSigningStep
                                    ? "Комментарий (обязателен при возврате на доработку)"
                                    : "Комментарий (обязателен для замечаний и отклонения)"}
                                className="mt-2 w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none resize-y focus:border-[#2f68f5]"
                            />
                            <div className="mt-2.5 flex flex-wrap gap-2">
                                <button onClick={() => resolve("Approved")} disabled={saving}
                                        className="h-9 px-4 rounded-[9px] border-none bg-[#1c7a4d] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50">
                                    {isSigningStep ? "Подписать" : "Согласовать"}
                                </button>
                                {!isSigningStep && (
                                    <button onClick={() => resolve("ApprovedWithRemarks")} disabled={saving}
                                            className="h-9 px-4 rounded-[9px] border border-[#f0dcae] bg-white text-[#b3730a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#fdf3e0] disabled:opacity-50">
                                        С замечаниями
                                    </button>
                                )}
                                <button onClick={() => resolve("Rejected")} disabled={saving}
                                        className="h-9 px-4 rounded-[9px] border border-[#f1c9c2] bg-white text-[#c0392b] font-semibold text-[12.5px] cursor-pointer hover:bg-[#fbeae7] disabled:opacity-50">
                                    {isSigningStep ? "Вернуть на доработку" : "Отклонить"}
                                </button>
                            </div>
                        </div>
                    )}

                    {подписываем && sz && (
                        <QualifiedSignDialog
                            documentId={sz.documentId}
                            onClose={() => setПодписываем(false)}
                            onSigned={async (signature) => {
                                setПодписываем(false);
                                // Подпись поставлена — теперь ею закрывается этап. Разрыв
                                // между этими действиями оставил бы подпись без резолюции.
                                await resolve("Approved", signature.id);
                            }}
                        />
                    )}

                    {/* Замечания устраняет инициатор — после подтверждения маршрут идёт с того же этапа. */}
                    {openRemarks.length > 0 && sz?.authorId === user?.id && (
                        <div className="mt-4 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] p-4">
                            <div className="text-[13px] font-semibold text-[#b3730a]">Замечания к устранению</div>
                            <div className="mt-2 flex flex-col gap-2">
                                {openRemarks.map((r) => (
                                    <div key={r.id} className="flex items-start justify-between gap-3">
                                        <div className="text-[13px] text-[#55617a]">
                                            {r.text}
                                            <span className="ml-2 text-[12px] text-[#a3adbd]">
                                                — {r.userId ? users[r.userId] ?? `#${r.userId}` : "согласующий"}
                                            </span>
                                        </div>
                                        <button onClick={() => confirmRemark(r.id)} disabled={saving}
                                                className="h-8 px-3 rounded-[8px] border border-[#e5e9f0] bg-white text-[12px] font-semibold text-[#1c7a4d] cursor-pointer hover:bg-[#e9f6ee] disabled:opacity-50 whitespace-nowrap">
                                            Замечание устранено
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
