import {useCallback, useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {
    procurementService,
    SUBJECT_KIND_LABEL,
    type ProcurementCreateRequest,
    type SubjectKind,
} from "@/service/procurementService/procurementService.ts";
import {
    authorityMatrixService,
    type MatrixResolveResult,
} from "@/service/procurementService/authorityMatrixService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {AttachmentsPanel} from "@/components/attachments/AttachmentsPanel.tsx";
import {attachmentService} from "@/service/documentService/attachmentService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {MatrixNotesList} from "@/components/procurement/MatrixNotesList.tsx";
import {OrgUnitPicker} from "@/components/procurement/OrgUnitPicker.tsx";
import {PlanItemPicker} from "@/components/procurement/PlanItemPicker.tsx";
import type {PlanItemLookup} from "@/service/procurementService/planItemLookupService.ts";
import {useAuth} from "@/context/AuthContext.ts";

/**
 * Мастер новой заявки на закупку (экран v8 isPrcNew), три шага:
 * предмет и сумма → обоснование и бюджет → маршрут из Матрицы полномочий.
 *
 * Способ закупки не выбирается вслепую: как только заданы сумма и признак
 * аффилированности, матрица показывает применимый способ и состав согласования,
 * поэтому инициатор видит последствия до отправки.
 */

const STEPS = ["Предмет закупки", "Обоснование и бюджет", "Маршрут согласования"];

const SUBJECT_KINDS: SubjectKind[] = [
    "Goods", "HouseholdGoods", "SpecificGoods", "GoodsWithInstallation", "Works", "Services",
];

export const ProcurementNewPage = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolved, setResolved] = useState<MatrixResolveResult | null>(null);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [planItem, setPlanItem] = useState<PlanItemLookup | null>(null);

    // Подразделение инициатора — из его профиля: почти всякая заявка подаётся
    // от своего подразделения, и заставлять выбирать его руками незачем.
    const {user} = useAuth();
    const ownUnitId = user?.orgUnit?.id ?? null;

    // Обоснование и ТЗ приходят файлами, но заявки ещё нет — файлы ждут её создания.
    const [files, setFiles] = useState<File[]>([]);

    const [form, setForm] = useState<ProcurementCreateRequest>({
        subject: "",
        justification: "",
        subjectKind: "Goods",
        amount: 0,
        isAffiliated: false,
        hasBudget: true,
        hasSpecification: false,
        preferredMethod: undefined,
        methodJustification: "",
    });

    const patch = (p: Partial<ProcurementCreateRequest>) => setForm(prev => ({...prev, ...p}));

    // Окно объявления задаётся целиком: одна дата без второй не определяет ни день
    // публикации, ни день окончания приёма предложений.
    const announcementProblem = (() => {
        const from = form.announcementFrom;
        const to = form.announcementTo;
        if (!from && !to) return null;
        if (!from || !to) return "Укажите обе даты — «с» и «по»";
        if (to < from) return "Дата окончания раньше даты начала";
        return null;
    })();

    useEffect(() => {
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, []);

    // Как только справочник подразделений загрузился, подставляем своё — вместе
    // с его куратором. Инициатор может переопределить выбор: закупку иногда
    // подают в интересах другого подразделения.
    useEffect(() => {
        if (form.initiatorUnitId || units.length === 0 || ownUnitId === null) return;
        const own = units.find(u => u.id === ownUnitId);
        if (own) patch({initiatorUnitId: own.id, curatorUserId: own.curatorUserId ?? undefined});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [units, ownUnitId]);

    /** Куратор подразделения — тот же, что и куратор закупки по умолчанию (PRC-01). */
    const selectUnit = (unitId: number) => {
        const unit = units.find(u => u.id === unitId);
        patch({initiatorUnitId: unitId, curatorUserId: unit?.curatorUserId ?? undefined});
    };

    // Матрица пересчитывается на каждое изменение суммы и аффилированности —
    // экран должен показывать способ до того, как заявка создана.
    const resolve = useCallback(async () => {
        if (form.amount <= 0) {
            setResolved(null);
            return;
        }
        try {
            setResolved(await authorityMatrixService.resolve({
                amount: form.amount,
                isAffiliated: form.isAffiliated,
                preferredMethod: form.preferredMethod,
            }));
        } catch {
            setResolved(null);
        }
    }, [form.amount, form.isAffiliated, form.preferredMethod]);

    useEffect(() => {
        void resolve();
    }, [resolve]);

    const submit = async () => {
        try {
            setSaving(true);
            setError(null);
            const card = await procurementService.create({
                ...form,
                justification: form.justification?.trim() || undefined,
                methodJustification: form.methodJustification?.trim() || undefined,
            });
            // Заявка создана — файлы, собранные в мастере, цепляются к её карточке.
            // Сбой загрузки заявку не отменяет: недостающий файл прикладывается на
            // карточке, и туда мы пользователя и уводим, назвав, что не прошло.
            const failed: string[] = [];
            for (const file of files) {
                try {
                    await attachmentService.upload(card.documentId, file);
                } catch {
                    failed.push(file.name);
                }
            }

            navigate(`/prc/${card.id}`, {
                state: failed.length
                    ? {attachmentError: `Не приложились файлы: ${failed.join(", ")}`}
                    : undefined,
            });
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось создать заявку");
        } finally {
            setSaving(false);
        }
    };

    const canNext =
        (step === 0 && form.subject.trim().length > 0 && form.amount > 0) ||
        (step === 1 && !announcementProblem) ||
        step === 2;

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1080}}>
            <div>
                <div style={{fontSize: 12.5, color: "#8b97ab"}}>Реестр закупок</div>
                <h1 style={{margin: "3px 0 0", fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                    Новая заявка на закупку
                </h1>
            </div>

            {/* шаги */}
            <div style={{display: "flex", gap: 8}}>
                {STEPS.map((s, i) => (
                    <div
                        key={s}
                        style={{
                            flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                            border: `1px solid ${i === step ? "#2f68f5" : "#e5e9f0"}`,
                            background: i === step ? "#eef3ff" : i < step ? "#f6f8fb" : "#fff",
                            color: i === step ? "#2f68f5" : i < step ? "#55617a" : "#8b97ab",
                        }}
                    >
                        {i + 1}. {s}
                    </div>
                ))}
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr minmax(300px, 380px)", gap: 18, alignItems: "start"}}>
                <section style={card}>
                    {step === 0 && (
                        <>
                            <label style={fieldLabel}>Предмет закупки</label>
                            <input
                                value={form.subject}
                                onChange={e => patch({subject: e.target.value})}
                                placeholder="напр. Ноутбуки бизнес-класса (8 шт.)"
                                style={input}
                            />

                            <label style={{...fieldLabel, marginTop: 14}}>Тип предмета</label>
                            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                                {SUBJECT_KINDS.map(k => (
                                    <button
                                        key={k}
                                        onClick={() => patch({subjectKind: k})}
                                        style={{
                                            ...chip,
                                            background: form.subjectKind === k ? "#eef3ff" : "#f6f8fb",
                                            borderColor: form.subjectKind === k ? "#2f68f5" : "#e5e9f0",
                                            color: form.subjectKind === k ? "#2f68f5" : "#55617a",
                                        }}
                                    >
                                        {SUBJECT_KIND_LABEL[k]}
                                    </button>
                                ))}
                            </div>

                            <label style={{...fieldLabel, marginTop: 14}}>Ориентировочная сумма, сом</label>
                            <input
                                type="number"
                                min={0}
                                value={form.amount || ""}
                                onChange={e => patch({amount: Number(e.target.value) || 0})}
                                style={input}
                            />

                            <label style={{...checkboxRow, marginTop: 14}}>
                                <input
                                    type="checkbox"
                                    checked={form.isAffiliated}
                                    onChange={e => patch({isAffiliated: e.target.checked})}
                                    style={checkbox}
                                />
                                <span>
                                    <span style={checkboxTitle}>Сделка с аффилированным лицом</span>
                                    <span style={checkboxHint}>Пороги считаются от ЧСК, решение принимает СД или ОСА</span>
                                </span>
                            </label>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <label style={fieldLabel}>Обоснование необходимости закупки</label>
                            <textarea
                                value={form.justification}
                                onChange={e => patch({justification: e.target.value})}
                                placeholder="Цель приобретения, риски при непринятии решения, ожидаемая эффективность, наличие в бюджете…"
                                rows={5}
                                style={{...input, height: "auto", padding: "10px 12px", resize: "vertical"}}
                            />

                            <AttachmentsPanel
                                documentId={null}
                                editable
                                title="Вложения к обоснованию"
                                hint="необязательно"
                                pending={files}
                                onPendingChange={setFiles}
                            />

                            <label style={{...checkboxRow, marginTop: 14}}>
                                <input
                                    type="checkbox"
                                    checked={form.hasSpecification}
                                    onChange={e => patch({hasSpecification: e.target.checked})}
                                    style={checkbox}
                                />
                                <span>
                                    <span style={checkboxTitle}>Техническое задание (спецификация) приложено</span>
                                    <span style={checkboxHint}>Характеристики, объём, требования к продукции и поставщику</span>
                                </span>
                            </label>

                            <label style={{...checkboxRow, marginTop: 10}}>
                                <input
                                    type="checkbox"
                                    checked={form.hasBudget}
                                    onChange={e => patch({hasBudget: e.target.checked})}
                                    style={checkbox}
                                />
                                <span>
                                    <span style={checkboxTitle}>Предусмотрено бюджетом Банка</span>
                                    <span style={checkboxHint}>Согласование с УПиА на соответствие бюджету</span>
                                </span>
                            </label>

                            <label style={{...fieldLabel, marginTop: 14}}>Инициирующее подразделение</label>
                            <OrgUnitPicker
                                units={units}
                                value={form.initiatorUnitId ?? null}
                                onChange={selectUnit}
                                ownUnitId={ownUnitId}
                            />
                            {form.curatorUserId && (
                                <div style={{marginTop: 5, fontSize: 11.5, color: "#8b97ab"}}>
                                    Куратор подразделения подставлен как куратор закупки
                                </div>
                            )}

                            <label style={{...fieldLabel, marginTop: 14}}>Позиция Плана закупок</label>
                            <PlanItemPicker
                                value={planItem}
                                onChange={item => { setPlanItem(item); patch({planItemId: item?.id}); }}
                                orgUnitId={form.initiatorUnitId ?? ownUnitId}
                                amount={form.amount}
                            />
                            {!form.hasBudget && planItem === null && (
                                <div style={{marginTop: 6, fontSize: 11.5, color: "#c77700"}}>
                                    Закупка вне бюджета и без позиции Плана пойдёт по ветке внеплановой закупки (PRC-03)
                                    {resolved?.regulationDocumentId && (
                                        <>
                                            {" — "}
                                            <Link
                                                to={`/base-vnd/${resolved.regulationDocumentId}`}
                                                style={{color: "#2f68f5", textDecoration: "underline"}}
                                            >
                                                раздел 7 Положения — планирование закупок и бюджет
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            <label style={{...fieldLabel, marginTop: 14}}>Сроки объявления закупки</label>
                            <div style={{display: "flex", gap: 10, alignItems: "center"}}>
                                <input
                                    type="date"
                                    value={form.announcementFrom ?? ""}
                                    onChange={e => patch({announcementFrom: e.target.value || null})}
                                    style={{...input, flex: 1}}
                                />
                                <span style={{fontSize: 12.5, color: "#8b97ab"}}>по</span>
                                <input
                                    type="date"
                                    value={form.announcementTo ?? ""}
                                    min={form.announcementFrom ?? undefined}
                                    onChange={e => patch({announcementTo: e.target.value || null})}
                                    style={{...input, flex: 1}}
                                />
                            </div>
                            <div style={{marginTop: 5, fontSize: 11.5, color: "#8b97ab"}}>
                                Объявление публикуется на сайте Банка и tenders.kg, конкурсный период — не менее 5 рабочих дней
                            </div>
                            {announcementProblem && (
                                <div style={{marginTop: 6, fontSize: 11.5, color: "#c0392b"}}>
                                    {announcementProblem}
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div style={cardTitle}>Маршрут по Матрице полномочий</div>

                            {resolved ? (
                                <>
                                    <div style={{fontSize: 17, fontWeight: 700, color: "#0f1b2d"}}>
                                        {resolved.methodTitle}
                                    </div>
                                    <div style={{marginTop: 10, fontSize: 13, color: "#26324a", lineHeight: 1.8}}>
                                        Согласование: <b>{resolved.approvalChain}</b><br/>
                                        Утверждение расхода: <b>{resolved.approvalAuthorityTitle}</b><br/>
                                        {resolved.commissionRequired && (
                                            <>Комиссия: <b>{resolved.commissionSize} членов</b>
                                                {resolved.commissionMinBoardMembers
                                                    ? `, не менее ${resolved.commissionMinBoardMembers} членов Правления`
                                                    : ""}<br/></>
                                        )}
                                        Протокол закупки: <b>{resolved.protocolRequired ? "требуется" : "не требуется"}</b>
                                    </div>

                                    {resolved.requiresJustification && (
                                        <>
                                            <label style={{...fieldLabel, marginTop: 14}}>
                                                Обоснование применения способа (п. 6.6 Положения)
                                            </label>
                                            <textarea
                                                value={form.methodJustification}
                                                onChange={e => patch({methodJustification: e.target.value})}
                                                rows={3}
                                                style={{...input, height: "auto", padding: "10px 12px", resize: "vertical"}}
                                            />
                                        </>
                                    )}

                                    {resolved.notes.length > 0 && (
                                        <MatrixNotesList
                                            notes={resolved.notes}
                                            className="mt-3.5 pl-[18px] text-[12.5px] leading-[1.7] text-[#55617a]"
                                        />
                                    )}
                                </>
                            ) : (
                                <div style={{color: "#8b97ab", fontSize: 13}}>
                                    Укажите сумму закупки — матрица подберёт способ и состав согласования
                                </div>
                            )}
                        </>
                    )}

                    {error && <div style={{marginTop: 14, color: "#e0483d", fontSize: 13}}>{error}</div>}

                    <div style={{display: "flex", gap: 8, marginTop: 20}}>
                        <button
                            onClick={() => (step === 0 ? navigate("/prc") : setStep(step - 1))}
                            style={secondaryButton}
                        >
                            {step === 0 ? "Отмена" : "Назад"}
                        </button>
                        <div style={{flex: 1}}/>
                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext}
                                style={{...primaryButton, opacity: canNext ? 1 : 0.5}}
                            >
                                Далее
                            </button>
                        ) : (
                            <button
                                onClick={submit}
                                disabled={saving || !resolved}
                                style={{...primaryButton, opacity: saving || !resolved ? 0.5 : 1}}
                            >
                                {saving ? "Создание…" : "Создать заявку"}
                            </button>
                        )}
                    </div>
                </section>

                {/* сводка справа — видна на всех шагах */}
                <aside style={card}>
                    <div style={cardTitle}>Сводка заявки</div>
                    <Row label="Предмет" value={form.subject || "—"}/>
                    <Row label="Тип предмета" value={SUBJECT_KIND_LABEL[form.subjectKind]}/>
                    <Row label="Сумма" value={form.amount ? `${form.amount.toLocaleString("ru-RU")} сом` : "—"}/>
                    <Row label="Аффилированное лицо" value={form.isAffiliated ? "да" : "нет"}/>
                    <Row label="Бюджет" value={form.hasBudget ? "предусмотрено" : "вне бюджета"}/>
                    <Row
                        label="Инициирующее СП"
                        value={units.find(u => u.id === form.initiatorUnitId)?.titleRu ?? "—"}
                    />
                    <Row label="ТЗ приложено" value={form.hasSpecification ? "да" : "нет"}/>
                    <Row
                        label="Объявление"
                        value={form.announcementFrom && form.announcementTo
                            ? `${formatDate(form.announcementFrom)} — ${formatDate(form.announcementTo)}`
                            : "—"}
                    />
                    <Row label="Способ" value={resolved?.methodShortTitle ?? "—"}/>
                    <Row label="Утверждает" value={resolved?.approvalAuthorityTitle ?? "—"}/>
                </aside>
            </div>
        </div>
    );
};

const Row = ({label, value}: { label: string; value: string }) => (
    <div style={{display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid #f3f6f9", fontSize: 12.5}}>
        <span style={{flex: 1, color: "#8b97ab"}}>{label}</span>
        <span style={{flex: 1, color: "#26324a", fontWeight: 600, textAlign: "right"}}>{value}</span>
    </div>
);

const card: React.CSSProperties = {
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

const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#55617a",
    marginBottom: 6,
};

const input: React.CSSProperties = {
    width: "100%",
    height: 38,
    padding: "0 12px",
    border: "1px solid #e5e9f0",
    borderRadius: 10,
    background: "#f6f8fb",
    font: "inherit",
    fontSize: 13,
    color: "#0f1b2d",
    outline: "none",
};

const chip: React.CSSProperties = {
    padding: "6px 11px",
    borderRadius: 8,
    border: "1px solid #e5e9f0",
    font: "inherit",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
};

const checkboxRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f6f8fb",
    cursor: "pointer",
};

const checkbox: React.CSSProperties = {width: 16, height: 16, marginTop: 2, accentColor: "#2f68f5"};
const checkboxTitle: React.CSSProperties = {display: "block", fontSize: 13, fontWeight: 600, color: "#26324a"};
const checkboxHint: React.CSSProperties = {display: "block", fontSize: 11.5, color: "#8b97ab"};

const primaryButton: React.CSSProperties = {
    height: 38, padding: "0 18px", border: "none", borderRadius: 10,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 38, padding: "0 16px", border: "1px solid #e5e9f0", borderRadius: 10,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
