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
import {MatrixNotesList} from "@/components/componentsProcurement/MatrixNotesList.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {planItemLookupService, type PlanItemLookup} from "@/service/procurementService/planItemLookupService.ts";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {AttachmentsPanel} from "@/components/componentsGeneral/attachments/AttachmentsPanel.tsx";
import {ArrowLeft, Check, ClipboardList} from "lucide-react";
import {EditableTextField, EditableTextAreaField} from "@/components/componentsGeneral/RequisitesEditFields.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {parseDDMMYYYYToISO} from "@/utils/dateUtils.ts";

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
    // Передумали править — возвращаемся в карточку заявки, а не в реестр.
    const exitTo = isEdit ? `/prc/${id}` : "/prc";

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolved, setResolved] = useState<MatrixResolveResult | null>(null);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    // Позиции Плана грузятся списком целиком (свои — первыми), а ищет по ним уже
    // SelectDropdown на клиенте, с подсветкой совпадений.
    const [planItems, setPlanItems] = useState<PlanItemLookup[]>([]);

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

    // Сотрудники для выбора куратора вручную
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    useEffect(() => {
        userService.lookup().then(setUsers).catch(() => undefined);
    }, []);

    const planOrgUnitId = form.initiatorUnitId ?? ownUnitId;
    useEffect(() => {
        let cancelled = false;
        planItemLookupService.search("", planOrgUnitId, 500)
            .then(items => { if (!cancelled) setPlanItems(items); })
            .catch(() => { if (!cancelled) setPlanItems([]); });
        return () => { cancelled = true; };
    }, [planOrgUnitId]);

    const planItem = planItems.find(p => p.id === form.planItemId) ?? null;

    // СП для модалки выбора: дерево строится по parentId.
    const unitOptions = useMemo(() => units.map(u => ({
        key: String(u.id),
        label: u.titleRu,
        parentId: u.parentId != null ? String(u.parentId) : undefined,
    })), [units]);

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
        if (own) patch({initiatorUnitId: own.id, curatorUserId: defaultCurator(own)});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [units, ownUnitId]);

    // Правим заявку, созданную без куратора (в справочнике СП его не было): как только
    // заявка и справочник загрузились, подставляем куратора по умолчанию.
    useEffect(() => {
        if (!isEdit || form.curatorUserId || !form.initiatorUnitId || units.length === 0) return;
        const unit = units.find(u => u.id === form.initiatorUnitId);
        const curator = unit ? defaultCurator(unit) : undefined;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (curator) patch({curatorUserId: curator});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, units, form.initiatorUnitId]);

    /** Куратор подразделения — тот же, что и куратор закупки по умолчанию (PRC-01). */
    const selectUnit = (unitId: number) => {
        const unit = units.find(u => u.id === unitId);
        patch({initiatorUnitId: unitId, curatorUserId: unit ? defaultCurator(unit) : undefined});
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

    // Куратор совпадает с тем, что подставил справочник, — показываем подсказку об этом
    const selectedUnit = units.find(u => u.id === form.initiatorUnitId);
    const curatorFromUnit = !!form.curatorUserId && !!selectedUnit
        && form.curatorUserId === defaultCurator(selectedUnit);

    const canNext =
        (step === 0 && form.subject.trim().length > 0 && form.amount > 0) ||
        (step === 1 && !announcementProblem && missing.length === 0) ||
        step === 2;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">

            {/* Шапка — как у новой служебной записки (SzCardHeader): возврат в реестр
                над заголовком, номера у новой заявки нет. */}
            <Link
                to={exitTo}
                // "!" — глобальное правило "a { color }" из index.css иначе перебивает цвет и ссылка всегда синяя
                className="inline-flex items-center gap-1.5 mb-3 text-[13px] font-medium text-[#55617a]! cursor-pointer hover:text-[#2f68f5]!"
            >
                {/* К заявке / Реестр закупок */}
                <ArrowLeft className="w-4 h-4"/> {isEdit ? t("procurementNew.back") : t("procurementTracker.back")}
            </Link>
            <h1 className="mt-0 mb-[18px] text-[21px] font-bold tracking-[-0.02em]">
                {isEdit ? t("procurementNew.titleEdit") : t("procurementNew.title")}
            </h1>

            {/* шаги */}
            <div className="flex gap-[26px] mb-[15px]">
                {STEPS.map((s, i) => {
                    // На пройденный шаг можно вернуться кликом по нему. Вперёд — только
                    // кнопкой «Далее»: она проверяет, что текущий шаг заполнен.
                    const done = i < step;
                    const current = i === step;
                    return (
                        <button
                            key={s}
                            type="button"
                            disabled={!done}
                            onClick={() => setStep(i)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-left text-[12.5px] font-semibold transition-colors ${
                                current
                                    ? "border-[#2f68f5] bg-[#eef3ff] text-[#2f68f5] cursor-default"
                                    : done
                                        ? "border-[#e5e9f0] bg-white text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] hover:border-[#cbd3df]"
                                        : "border-[#e5e9f0] bg-white text-[#8b97ab] cursor-default"
                            }`}
                        >
                            {/* Пройденный шаг — спокойная зелёная галочка без кружка */}
                            {done && <Check className="w-[15px] h-[15px] flex-none text-[#1c7a4d]" strokeWidth={2.5}/>}
                            {i + 1}. {t(`procurementNew.steps.${s}`)}
                        </button>
                    );
                })}
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr minmax(300px, 380px)", gap: 18, alignItems: "start"}}>
                {/* Подложка с полями — как SzFormSection при создании СЗ: чуть голубоватая, поля на ней белые */}
                <section className="bg-[#fbfcff] border border-[#e1e6ee] rounded-2xl px-5 py-[18px]">
                    {step === 0 && (
                        <div className="flex flex-col gap-3.5">
                            <EditableTextField
                                label={t("procurementNew.fields.subject")}
                                value={form.subject}
                                onChange={v => patch({subject: v})}
                                placeholder={t("procurementNew.fields.subjectPlaceholder")}
                                required
                            />

                            <div className="min-w-0">
                                <FieldLabel>{t("procurementNew.fields.subjectKind")}</FieldLabel>
                                <SelectDropdown
                                    options={SUBJECT_KINDS.map(k => ({value: k, label: t(`procurementNew.subjectKinds.${k}`)}))}
                                    value={form.subjectKind}
                                    onChange={v => patch({subjectKind: v as SubjectKind})}
                                    className="w-full"
                                    minWidth="100%"
                                    accent="blue"
                                />
                            </div>

                            <div className="min-w-0">
                                <FieldLabel required>{t("procurementNew.fields.amount")}</FieldLabel>
                                <input
                                    type="number"
                                    min={0}
                                    required
                                    value={form.amount || ""}
                                    onChange={e => patch({amount: Number(e.target.value) || 0})}
                                    // Пустое поле подсвечивается сразу: по сумме Матрица
                                    // полномочий подбирает способ закупки и орган
                                    // утверждения, и без неё заявке некуда идти.
                                    className={`w-full h-10 min-w-0 px-3 rounded-[9px] border bg-white outline-none text-[13px] text-[#1c2740] box-border focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff] ${
                                        form.amount > 0 ? "border-[#e5e9f0]" : "border-[#e6b8b8]"
                                    }`}
                                />
                                {form.amount <= 0 && (
                                    <div className="mt-1.5 text-[12px] text-[#a94442]">
                                        {t("procurementNew.fields.amountHint")}
                                    </div>
                                )}
                            </div>

                            {/* Признак аффилированности убран из заявки: он определяется
                                при выборе поставщика (аффилированность — свойство поставщика,
                                supplier.IsAffiliated), а не заявляется заранее инициатором. */}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="flex flex-col gap-3.5">
                            <EditableTextAreaField
                                label={t("procurementNew.fields.justification")}
                                value={form.justification ?? ""}
                                onChange={v => patch({justification: v})}
                                placeholder={t("procurementNew.fields.justificationPlaceholder")}
                                rows={5}
                                required
                            />

                            <AttachmentsPanel
                                documentId={null}
                                editable
                                title={t("procurementNew.attachments.title")}
                                hint={t("procurementNew.attachments.hint")}
                                pending={files}
                                onPendingChange={setFiles}
                            />

                            <div className="min-w-0">
                                <FieldLabel required>{t("procurementNew.spec.label")}</FieldLabel>
                                <div
                                    className={`border border-dashed border-[#cfd8e6] rounded-[10px] px-3.5 py-3 ${
                                        specFile || form.specificationAttachmentId ? "bg-[#f4faf6]" : "bg-white"
                                    }`}
                                >
                                    {specFile ? (
                                        <div className="flex items-center gap-2.5">
                                            {/* min-w-0 + truncate — длинное имя файла без пробелов
                                                иначе распирает флекс и наезжает на кнопку «Убрать». */}
                                            <span title={specFile.name} className="flex-1 min-w-0 truncate text-[13px] text-[#26324a]">
                                                {specFile.name}
                                            </span>
                                            <SzButton variant="muted" size="xs" onClick={() => setSpecFile(null)}>
                                                {t("procurementNew.spec.remove")}
                                            </SzButton>
                                        </div>
                                    ) : form.specificationAttachmentId ? (
                                        <div className="text-[13px] text-[#26324a]">
                                            {t("procurementNew.spec.alreadyAttached")}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                onChange={e => setSpecFile(e.target.files?.[0] ?? null)}
                                                className="text-[12.5px] text-[#55617a] file:mr-3 file:h-8 file:px-3 file:rounded-[8px] file:border file:border-solid file:border-[#cbddff] file:bg-[#f5f8ff] file:text-[#2f68f5] file:font-semibold file:text-[12px] file:cursor-pointer hover:file:bg-[#eaf1ff]"
                                            />
                                            <div className="mt-1.5 text-[11.5px] text-[#8b97ab]">
                                                {t("procurementNew.spec.hint")}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="px-3 py-2.5 rounded-[10px] border border-[#e5e9f0] bg-white">
                                <PlainCheckbox
                                    checked={form.hasBudget}
                                    onChange={v => patch({hasBudget: v})}
                                    tone="brand"
                                >
                                    <span>
                                        <span className="block text-[13px] font-semibold text-[#26324a]">{t("procurementNew.budget.title")}</span>
                                        <span className="block text-[11.5px] text-[#8b97ab]">{t("procurementNew.budget.hint")}</span>
                                    </span>
                                </PlainCheckbox>
                            </div>

                            <div className="min-w-0">
                                <SingleSelectListField
                                    label={t("procurementNew.unit.label")}
                                    modalTitle={t("procurementNew.unit.label")}
                                    options={unitOptions}
                                    selectedKey={form.initiatorUnitId ? String(form.initiatorUnitId) : null}
                                    onChange={key => key
                                        ? selectUnit(Number(key))
                                        : patch({initiatorUnitId: undefined, curatorUserId: undefined})}
                                    searchPlaceholder={t("selectApproverModal.orgUnitSearchPlaceholder")}
                                    boldLabel={false}
                                    required
                                    accent="blue"
                                />
                                {ownUnitId === null && !form.initiatorUnitId && (
                                    <div className="mt-[5px] text-[11.5px] text-[#c77700]">
                                        {t("procurementNew.unit.noProfileUnit")}
                                    </div>
                                )}
                            </div>

                            {/* Куратор сначала подставляется из справочника СП, но автор может
                                выбрать другого: раньше поменять его было нельзя. */}
                            <div className="min-w-0">
                                <FieldLabel>Куратор закупки</FieldLabel>
                                <UserPickerField
                                    people={users}
                                    value={form.curatorUserId ?? null}
                                    onChange={id => patch({curatorUserId: id})}
                                    clearable
                                    onClear={() => patch({curatorUserId: undefined})}
                                    placeholder="Выберите куратора"
                                    modalTitle="Выбор куратора закупки"
                                    searchPlaceholder="Поиск по ФИО, должности, подразделению"
                                    accent="blue"
                                />
                                <div className="mt-[5px] text-[11.5px] text-[#8b97ab]">
                                    {curatorFromUnit
                                        ? t("procurementNew.unit.curatorHint")
                                        : form.initiatorUnitId && !form.curatorUserId
                                            ? "У подразделения в справочнике не указан куратор — выберите его вручную"
                                            : null}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <FieldLabel>{t("procurementNew.plan.label")}</FieldLabel>
                                <SelectDropdown
                                    options={[
                                        {value: "", label: "Без позиции Плана (внеплановая)"},
                                        ...planItems.map(p => ({value: String(p.id), label: `${p.code} — ${p.subject}`})),
                                    ]}
                                    value={form.planItemId ? String(form.planItemId) : ""}
                                    onChange={v => patch({planItemId: v ? Number(v) : undefined})}
                                    placeholder="— выберите позицию Плана —"
                                    searchable
                                    searchPlaceholder="Код или предмет закупки…"
                                    className="w-full"
                                    minWidth="100%"
                                    accent="blue"
                                />
                                {planItem && (
                                    <div className="mt-[5px] text-[11.5px] text-[#8b97ab]">
                                        План {planItem.year}
                                        {planItem.quarter && ` · ${planItem.quarter} квартал`}
                                        {" · "}
                                        <span className={planItem.remainingAmount < 0 ? "text-[#c0392b]" : ""}>
                                            {planItem.remainingAmount < 0
                                                ? `перебор ${(-planItem.remainingAmount).toLocaleString("ru-RU")} ${t("procurementNew.som")}`
                                                : `остаток ${planItem.remainingAmount.toLocaleString("ru-RU")} ${t("procurementNew.som")}`}
                                        </span>
                                        {planItem.orgUnitTitle && ` · ${planItem.orgUnitTitle}`}
                                    </div>
                                )}
                                {/* Не хватает остатка — предупреждаем, но не запрещаем: решение
                                    о превышении принимают согласующие по маршруту. */}
                                {planItem && form.amount > planItem.remainingAmount && (
                                    <div className="mt-1.5 text-[11.5px] text-[#c77700]">
                                        Сумма заявки больше остатка по позиции — потребуется корректировка Плана
                                    </div>
                                )}
                                {!form.hasBudget && planItem === null && (
                                    <div className="mt-1.5 text-[11.5px] text-[#c77700]">
                                        {t("procurementNew.plan.unplannedBranch")}
                                        {resolved?.regulationDocumentId && (
                                            <>
                                                {" — "}
                                                <Link
                                                    to={`/base-vnd/${resolved.regulationDocumentId}`}
                                                    className="text-[#2f68f5] underline"
                                                >
                                                    {t("procurementNew.plan.regulationLink")}
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <FieldLabel>{t("procurementNew.announcement.label")}</FieldLabel>
                                <div className="flex gap-2.5 items-center">
                                    <div className="flex-1 min-w-0">
                                        <DatePickerInput
                                            modal
                                            modalTitle={t("procurementNew.announcement.label")}
                                            value={form.announcementFrom ? formatDate(form.announcementFrom) : ""}
                                            onChange={d => patch({announcementFrom: parseDDMMYYYYToISO(d) || null})}
                                            accent="blue"
                                        />
                                    </div>
                                    <span className="text-[12.5px] text-[#8b97ab]">{t("procurementNew.announcement.to")}</span>
                                    <div className="flex-1 min-w-0">
                                        <DatePickerInput
                                            modal
                                            modalTitle={t("procurementNew.announcement.label")}
                                            value={form.announcementTo ? formatDate(form.announcementTo) : ""}
                                            onChange={d => patch({announcementTo: parseDDMMYYYYToISO(d) || null})}
                                            accent="blue"
                                        />
                                    </div>
                                </div>
                                <div className="mt-[5px] text-[11.5px] text-[#8b97ab]">
                                    {t("procurementNew.announcement.hint")}
                                </div>
                                {announcementProblem && (
                                    <div className="mt-1.5 text-[11.5px] text-[#c0392b]">
                                        {announcementProblem}
                                    </div>
                                )}
                            </div>
                        </div>
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
                                        <div className="mt-3.5">
                                            <EditableTextAreaField
                                                label={t("procurementNew.route.methodJustification")}
                                                value={form.methodJustification ?? ""}
                                                onChange={v => patch({methodJustification: v})}
                                                rows={3}
                                                required
                                            />
                                        </div>
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
                        <SzButton
                            variant="muted"
                            onClick={() => (step === 0 ? navigate(exitTo) : setStep(step - 1))}
                        >
                            {step === 0 ? t("general.cancel") : t("procurementNew.back")}
                        </SzButton>

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
                            <SzButton
                                variant="primary"
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext}
                            >
                                {t("procurementNew.next")}
                            </SzButton>
                        ) : (
                            <SzButton
                                variant="primary"
                                onClick={submit}
                                disabled={saving || !resolved || missing.length > 0}
                            >
                                {saving ? t("general.saving") : isEdit ? t("procurementNew.save") : t("procurementNew.submit")}
                            </SzButton>
                        )}
                    </div>
                </section>

                {/* сводка справа — видна на всех шагах */}
                <aside className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
                    {/* Заголовок в стиле карточек личного профиля («Учётная запись», «Электронная подпись») */}
                    <div className="flex items-center gap-[9px] mb-[13px]">
                        <span
                            className="w-[30px] h-[30px] flex-none grid place-items-center text-[#0f1b2d]">
                            <ClipboardList size={17} strokeWidth={1.8}/>
                        </span>
                        <h3 className="m-0 text-[13.5px] font-bold text-[#0f1b2d]">{t("procurementNew.summary.title")}</h3>
                    </div>
                    <div className="flex flex-col gap-[11px]">
                        <Row label={t("procurementNew.summary.subject")} value={form.subject || "—"}/>
                        <Row label={t("procurementNew.summary.subjectKind")} value={t(`procurementNew.subjectKinds.${form.subjectKind}`)}/>
                        <Row label={t("procurementNew.summary.amount")} value={form.amount ? `${form.amount.toLocaleString("ru-RU")} ${t("procurementNew.som")}` : "—"}/>
                        <Row label={t("procurementNew.summary.budget")} value={form.hasBudget ? t("procurementNew.summary.inBudget") : t("procurementNew.summary.offBudget")}/>
                        <Row
                            label={t("procurementNew.summary.unit")}
                            value={units.find(u => u.id === form.initiatorUnitId)?.titleRu ?? "—"}
                        />
                        <Row
                            label="Куратор"
                            value={users.find(u => u.id === form.curatorUserId)?.fullName ?? "—"}
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
                    </div>
                </aside>
            </div>
        </div>
    );
};

// Строка сводки — как Row в личном профиле (UserProfileView): серая подпись слева,
// жирное значение справа, без разделителей. min-w-0 + break-words — длинные значения
// (напр. имя файла ТЗ) не вылезают за границу карточки.
const Row = ({label, value}: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-4">
        <span className="flex-none max-w-[45%] text-[12px] text-[#8b97ab]">{label}</span>
        <span title={value} className="min-w-0 text-[12.5px] font-semibold text-[#1c2740] text-right ml-auto [overflow-wrap:anywhere]">
            {value}
        </span>
    </div>
);

const cardTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: "#8b97ab",
    textTransform: "uppercase",
    marginBottom: 12,
};

/** Подпись поля в том же стиле, что у EditableTextField; required — красная звёздочка. */
const FieldLabel = ({children, required}: { children: React.ReactNode; required?: boolean }) => (
    <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
        {children} {required && <span className="text-[#c0392b]">*</span>}
    </span>
);

/** Куратор по умолчанию — куратор СП из справочника. */
function defaultCurator(unit: OrganizationUnitResponse): number | undefined {
    return unit.curatorUserId ?? undefined;
}
