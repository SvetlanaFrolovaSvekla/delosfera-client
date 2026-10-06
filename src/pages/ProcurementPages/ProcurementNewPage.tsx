/**
 * Мастер новой заявки на закупку (экран v8 isPrcNew), три шага:
 * предмет и сумма → обоснование и бюджет → маршрут из Матрицы полномочий.
 *
 * Способ закупки не выбирается вслепую: как только заданы сумма и признак
 * аффилированности, матрица показывает применимый способ и состав согласования,
 * поэтому инициатор видит последствия до отправки.
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {
    procurementService,
    // SUBJECT_KIND_LABEL,
    type ProcurementCreateRequest,
    type SubjectKind,
} from "@/service/procurementService/procurementService.ts";
import {
    authorityMatrixService,
    type MatrixResolveResult,
} from "@/service/procurementService/authorityMatrixService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {attachmentService} from "@/service/documentService/attachmentService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {MatrixNotesList} from "@/components/procurement/MatrixNotesList.tsx";
import {OrgUnitPicker} from "@/components/procurement/OrgUnitPicker.tsx";
import {PlanItemPicker} from "@/components/procurement/PlanItemPicker.tsx";
import type {PlanItemLookup} from "@/service/procurementService/planItemLookupService.ts";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";

// Шаги мастера: подписи берутся из переводов по ключам
const STEPS = ["subject", "justification", "route"] as const;

const SUBJECT_KINDS: SubjectKind[] = [
    "Goods", "HouseholdGoods", "SpecificGoods", "GoodsWithInstallation", "Works", "Services",
];

export const ProcurementNewPage = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    // Тот же мастер правит существующую заявку: поля и проверки те же, и
    // разводить два экрана с одними правилами значит однажды поправить один.
    const {id} = useParams<{id: string}>();
    const isEdit = !!id;

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

    // Техническое задание — отдельным файлом, а не галочкой: без него заявку не
    // отправить, и проверка должна опираться на документ, а не на отметку,
    // поставленную, чтобы она не мешала двигаться дальше.
    const [specFile, setSpecFile] = useState<File | null>(null);

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
        if (!from || !to) return t("procurementNew.announcement.bothDates");
        if (to < from) return t("procurementNew.announcement.endBeforeStart");
        return null;
    })();

    useEffect(() => {
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, []);

    // Правим существующую — подтягиваем её поля в форму.
    useEffect(() => {
        if (!id) return;

        procurementService.get(Number(id))
            .then((card) => {
                setForm({
                    subject: card.subject,
                    justification: card.justification ?? "",
                    subjectKind: card.subjectKind,
                    amount: card.amount,
                    isAffiliated: card.isAffiliated,
                    hasBudget: card.hasBudget,
                    hasSpecification: card.hasSpecification,
                    specificationAttachmentId: card.specificationAttachmentId ?? undefined,
                    planItemId: card.planItemId ?? undefined,
                    initiatorUnitId: card.initiatorUnitId ?? undefined,
                    curatorUserId: card.curatorUserId ?? undefined,
                    announcementFrom: card.announcementFrom ?? undefined,
                    announcementTo: card.announcementTo ?? undefined,
                    methodJustification: card.methodJustification ?? "",
                });
            })
            .catch(() => setError(t("procurementNew.notFound")));
    }, [id, t]);

    // Как только справочник подразделений загрузился, подставляем своё — вместе
    // с его куратором. Инициатор может переопределить выбор: закупку иногда
    // подают в интересах другого подразделения.
    useEffect(() => {
        if (form.initiatorUnitId || units.length === 0 || ownUnitId === null) return;
        const own = units.find(u => u.id === ownUnitId);
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void resolve();
    }, [resolve]);

    const submit = async () => {
        try {
            setSaving(true);
            setError(null);
            const payload = {
                ...form,
                justification: form.justification?.trim() || undefined,
                methodJustification: form.methodJustification?.trim() || undefined,
            };

            const card = isEdit
                ? await procurementService.update(Number(id), payload)
                : await procurementService.create(payload);
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

            // Техническое задание грузится последним и сразу привязывается к
            // заявке: без ссылки это просто ещё один файл среди вложений, и
            // проверка «ТЗ приложено» его не увидит.
            if (specFile) {
                try {
                    const attachment = await attachmentService.upload(card.documentId, specFile);
                    await procurementService.update(card.id, {
                        ...payload,
                        specificationAttachmentId: attachment.id,
                        hasSpecification: true,
                    });
                } catch {
                    failed.push(specFile.name);
                }
            }

            navigate(`/prc/${card.id}`, {
                state: failed.length
                    ? {attachmentError: t("procurementNew.attachmentsFailed", {files: failed.join(", ")})}
                    : undefined,
            });
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? t("procurementNew.createError"));
        } finally {
            setSaving(false);
        }
    };

    /**
     * Чего не хватает, чтобы заявку можно было отправить на согласование.
     *
     * Те же условия, что и на сервере. Раньше человек узнавал о них после
     * создания заявки: она сохранялась, он уходил на карточку и там читал
     * «Заявку нельзя отправить на согласование: не указано инициирующее
     * подразделение». Заполнять это надо было до, а не после.
     */
    const missing = useMemo(() => {
        const list: string[] = [];

        if (!form.initiatorUnitId) list.push(t("procurementNew.missing.unit"));
        if (!form.justification?.trim()) list.push(t("procurementNew.missing.justification"));
        const hasSpec = specFile !== null
            || form.specificationAttachmentId !== undefined
            || form.hasSpecification;

        if (!hasSpec) list.push(t("procurementNew.missing.specification"));

        if (resolved?.requiresJustification && !form.methodJustification?.trim())
            list.push(t("procurementNew.missing.methodJustification"));

        return list;
    }, [specFile, form.specificationAttachmentId,
        form.initiatorUnitId, form.justification, form.hasSpecification,
        form.methodJustification, resolved?.requiresJustification, t]);

    const canNext =
        (step === 0 && form.subject.trim().length > 0 && form.amount > 0) ||
        (step === 1 && !announcementProblem && missing.length === 0) ||
        step === 2;

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1080}}>
            <div>
                <div style={{fontSize: 12.5, color: "#8b97ab"}}>{t("procurementNew.breadcrumb")}</div>
                <h1 style={{margin: "3px 0 0", fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                    {isEdit ? t("procurementNew.titleEdit") : t("procurementNew.title")}
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
                        {i + 1}. {t(`procurementNew.steps.${s}`)}
                    </div>
                ))}
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr minmax(300px, 380px)", gap: 18, alignItems: "start"}}>
                <section style={card}>
                    {step === 0 && (
                        <>
                            <label style={fieldLabel}>
                                {t("procurementNew.fields.subject")} <span style={{color: "#d14343"}}>*</span>
                            </label>
                            <input
                                value={form.subject}
                                onChange={e => patch({subject: e.target.value})}
                                placeholder={t("procurementNew.fields.subjectPlaceholder")}
                                style={input}
                            />

                            <label style={{...fieldLabel, marginTop: 14}}>{t("procurementNew.fields.subjectKind")}</label>
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
                                        {t(`procurementNew.subjectKinds.${k}`)}
                                    </button>
                                ))}
                            </div>

                            <label style={{...fieldLabel, marginTop: 14}}>
                                {t("procurementNew.fields.amount")} <span style={{color: "#d14343"}}>*</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                required
                                value={form.amount || ""}
                                onChange={e => patch({amount: Number(e.target.value) || 0})}
                                style={{
                                    ...input,
                                    // Пустое поле подсвечивается сразу: по сумме Матрица
                                    // полномочий подбирает способ закупки и орган
                                    // утверждения, и без неё заявке некуда идти.
                                    borderColor: form.amount > 0 ? undefined : "#e6b8b8",
                                }}
                            />
                            {form.amount <= 0 && (
                                <div style={{marginTop: 6, fontSize: 12.5, color: "#a94442"}}>
                                    {t("procurementNew.fields.amountHint")}
                                </div>
                            )}

                            {/* Признак аффилированности убран из заявки: он определяется
                                при выборе поставщика (аффилированность — свойство поставщика,
                                supplier.IsAffiliated), а не заявляется заранее инициатором. */}
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <label style={fieldLabel}>{t("procurementNew.fields.justification")}</label>
                            <textarea
                                value={form.justification}
                                onChange={e => patch({justification: e.target.value})}
                                placeholder={t("procurementNew.fields.justificationPlaceholder")}
                                rows={5}
                                style={{...input, height: "auto", padding: "10px 12px", resize: "vertical"}}
                            />

                            <AttachmentsPanel
                                documentId={null}
                                editable
                                title={t("procurementNew.attachments.title")}
                                hint={t("procurementNew.attachments.hint")}
                                pending={files}
                                onPendingChange={setFiles}
                            />

                            <label style={{...fieldLabel, marginTop: 14}}>
                                {t("procurementNew.spec.label")}
                            </label>
                            <div style={{
                                border: "1px dashed #cfd8e6", borderRadius: 10, padding: "12px 14px",
                                background: specFile || form.specificationAttachmentId ? "#f4faf6" : "#fbfcfe",
                            }}>
                                {specFile ? (
                                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                                        {/* minWidth:0 + ellipsis — длинное имя файла без пробелов
                                            иначе распирает флекс и наезжает на кнопку «Убрать». */}
                                        <span
                                            title={specFile.name}
                                            style={{
                                                flex: 1, minWidth: 0, fontSize: 13, color: "#26324a",
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}
                                        >
                                            {specFile.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSpecFile(null)}
                                            style={{
                                                border: "none", background: "none", cursor: "pointer",
                                                color: "#8b97ab", font: "inherit", fontSize: 12.5, flexShrink: 0,
                                            }}
                                        >
                                            {t("procurementNew.spec.remove")}
                                        </button>
                                    </div>
                                ) : form.specificationAttachmentId ? (
                                    <div style={{fontSize: 13, color: "#26324a"}}>
                                        {t("procurementNew.spec.alreadyAttached")}
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="file"
                                            onChange={e => setSpecFile(e.target.files?.[0] ?? null)}
                                            style={{fontSize: 12.5}}
                                        />
                                        <div style={{marginTop: 6, fontSize: 11.5, color: "#8b97ab"}}>
                                            {t("procurementNew.spec.hint")}
                                        </div>
                                    </>
                                )}
                            </div>

                            <label style={{...checkboxRow, marginTop: 10}}>
                                <input
                                    type="checkbox"
                                    checked={form.hasBudget}
                                    onChange={e => patch({hasBudget: e.target.checked})}
                                    style={checkbox}
                                />
                                <span>
                                    <span style={checkboxTitle}>{t("procurementNew.budget.title")}</span>
                                    <span style={checkboxHint}>{t("procurementNew.budget.hint")}</span>
                                </span>
                            </label>

                            <label style={{...fieldLabel, marginTop: 14}}>{t("procurementNew.unit.label")}</label>
                            <OrgUnitPicker
                                units={units}
                                value={form.initiatorUnitId ?? null}
                                onChange={selectUnit}
                                ownUnitId={ownUnitId}
                            />
                            {ownUnitId === null && !form.initiatorUnitId && (
                                <div style={{marginTop: 5, fontSize: 11.5, color: "#c77700"}}>
                                    {t("procurementNew.unit.noProfileUnit")}
                                </div>
                            )}
                            {form.curatorUserId && (
                                <div style={{marginTop: 5, fontSize: 11.5, color: "#8b97ab"}}>
                                    {t("procurementNew.unit.curatorHint")}
                                </div>
                            )}

                            <label style={{...fieldLabel, marginTop: 14}}>{t("procurementNew.plan.label")}</label>
                            <PlanItemPicker
                                value={planItem}
                                onChange={item => { setPlanItem(item); patch({planItemId: item?.id}); }}
                                orgUnitId={form.initiatorUnitId ?? ownUnitId}
                                amount={form.amount}
                            />
                            {!form.hasBudget && planItem === null && (
                                <div style={{marginTop: 6, fontSize: 11.5, color: "#c77700"}}>
                                    {t("procurementNew.plan.unplannedBranch")}
                                    {resolved?.regulationDocumentId && (
                                        <>
                                            {" — "}
                                            <Link
                                                to={`/base-vnd/${resolved.regulationDocumentId}`}
                                                style={{color: "#2f68f5", textDecoration: "underline"}}
                                            >
                                                {t("procurementNew.plan.regulationLink")}
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            <label style={{...fieldLabel, marginTop: 14}}>{t("procurementNew.announcement.label")}</label>
                            <div style={{display: "flex", gap: 10, alignItems: "center"}}>
                                <input
                                    type="date"
                                    value={form.announcementFrom ?? ""}
                                    onChange={e => patch({announcementFrom: e.target.value || null})}
                                    style={{...input, flex: 1}}
                                />
                                <span style={{fontSize: 12.5, color: "#8b97ab"}}>{t("procurementNew.announcement.to")}</span>
                                <input
                                    type="date"
                                    value={form.announcementTo ?? ""}
                                    min={form.announcementFrom ?? undefined}
                                    onChange={e => patch({announcementTo: e.target.value || null})}
                                    style={{...input, flex: 1}}
                                />
                            </div>
                            <div style={{marginTop: 5, fontSize: 11.5, color: "#8b97ab"}}>
                                {t("procurementNew.announcement.hint")}
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
                            <div style={cardTitle}>{t("procurementNew.route.title")}</div>

                            {resolved ? (
                                <>
                                    <div style={{fontSize: 17, fontWeight: 700, color: "#0f1b2d"}}>
                                        {resolved.methodTitle}
                                    </div>
                                    <div style={{marginTop: 10, fontSize: 13, color: "#26324a", lineHeight: 1.8}}>
                                        {t("procurementNew.route.approval")}: <b>{resolved.approvalChain}</b><br/>
                                        {t("procurementNew.route.expenseApproval")}: <b>{resolved.approvalAuthorityTitle}</b><br/>
                                        {resolved.commissionRequired && (
                                            <>{t("procurementNew.route.commission")}: <b>{t("procurementNew.route.members", {count: resolved.commissionSize ?? 0})}</b>
                                                {resolved.commissionMinBoardMembers
                                                    ? t("procurementNew.route.boardMembers", {count: resolved.commissionMinBoardMembers})
                                                    : ""}<br/></>
                                        )}
                                        {t("procurementNew.route.protocol")}: <b>{resolved.protocolRequired ? t("procurementNew.route.required") : t("procurementNew.route.notRequired")}</b>
                                    </div>

                                    {resolved.requiresJustification && (
                                        <>
                                            <label style={{...fieldLabel, marginTop: 14}}>
                                                {t("procurementNew.route.methodJustification")}
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
                                    {t("procurementNew.route.enterAmount")}
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
                            {step === 0 ? t("general.cancel") : t("procurementNew.back")}
                        </button>

                        {step > 0 && missing.length > 0 && (
                            <div style={{
                                flex: 1, margin: "0 16px", fontSize: 12,
                                color: "#8a5a00", lineHeight: 1.5,
                            }}>
                                {t("procurementNew.missing.prefix")}{" "}
                                {missing.join(", ").toLowerCase()}
                            </div>
                        )}

                        {(step === 0 || missing.length === 0) && <div style={{flex: 1}}/>}
                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext}
                                style={{...primaryButton, opacity: canNext ? 1 : 0.5}}
                            >
                                {t("procurementNew.next")}
                            </button>
                        ) : (
                            <button
                                onClick={submit}
                                disabled={saving || !resolved || missing.length > 0}
                                style={{
                                    ...primaryButton,
                                    opacity: saving || !resolved || missing.length > 0 ? 0.5 : 1,
                                }}
                            >
                                {saving ? t("general.saving") : isEdit ? t("procurementNew.save") : t("procurementNew.submit")}
                            </button>
                        )}
                    </div>
                </section>

                {/* сводка справа — видна на всех шагах */}
                <aside style={card}>
                    <div style={cardTitle}>{t("procurementNew.summary.title")}</div>
                    <Row label={t("procurementNew.summary.subject")} value={form.subject || "—"}/>
                    <Row label={t("procurementNew.summary.subjectKind")} value={t(`procurementNew.subjectKinds.${form.subjectKind}`)}/>
                    <Row label={t("procurementNew.summary.amount")} value={form.amount ? `${form.amount.toLocaleString("ru-RU")} ${t("procurementNew.som")}` : "—"}/>
                    <Row label={t("procurementNew.summary.budget")} value={form.hasBudget ? t("procurementNew.summary.inBudget") : t("procurementNew.summary.offBudget")}/>
                    <Row
                        label={t("procurementNew.summary.unit")}
                        value={units.find(u => u.id === form.initiatorUnitId)?.titleRu ?? "—"}
                    />
                    <Row
                        label={t("procurementNew.summary.spec")}
                        value={specFile?.name ?? (form.specificationAttachmentId || form.hasSpecification ? t("procurementNew.yes") : t("procurementNew.no"))}
                    />
                    <Row
                        label={t("procurementNew.summary.announcement")}
                        value={form.announcementFrom && form.announcementTo
                            ? `${formatDate(form.announcementFrom)} — ${formatDate(form.announcementTo)}`
                            : "—"}
                    />
                    <Row label={t("procurementNew.summary.method")} value={resolved?.methodShortTitle ?? "—"}/>
                    <Row label={t("procurementNew.summary.approvedBy")} value={resolved?.approvalAuthorityTitle ?? "—"}/>
                </aside>
            </div>
        </div>
    );
};

const Row = ({label, value}: { label: string; value: string }) => (
    <div style={{display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid #f3f6f9", fontSize: 12.5}}>
        <span style={{flex: 1, color: "#8b97ab", minWidth: 0}}>{label}</span>
        {/* minWidth:0 + break-word — длинные значения (напр. имя файла ТЗ) не должны
            вылезать за границу карточки. */}
        <span
            title={value}
            style={{
                flex: 1, minWidth: 0, color: "#26324a", fontWeight: 600,
                textAlign: "right", overflowWrap: "anywhere",
            }}
        >
            {value}
        </span>
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
