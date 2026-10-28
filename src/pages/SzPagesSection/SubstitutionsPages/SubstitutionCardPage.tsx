import React, {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {useNavigate, useParams} from "react-router-dom";
import {userService} from "@/service/userService/userService.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {
    substitutionService, REASON_LABEL, HANDOVER_LABEL,
    type SubstitutionSaveRequest, type SubstitutionReason, type HandoverMoment,
    type CommissionMember, type SubstitutionDetails, type ApprovalStep, type ApprovalState, type SubstitutionStatus, type SubstitutionSigningState,
    substitutionPrintUrl,
} from "@/service/substitutionService/substitutionService.ts";
import {toast} from "@/service/toastService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {formatDDMMYYYY, parseDDMMYYYYToISO, parseDate} from "@/utils/dateUtils.ts";
import {SubstitutionSigningSection} from "@/components/componentsSubstitutions/SubstitutionSigningSection.tsx";
import {signingKey, useSubstitutionSigning} from "@/components/componentsSubstitutions/useSubstitutionSigning.tsx";
import {SubstitutionBankSignersSection} from "@/components/componentsSubstitutions/SubstitutionBankSignersSection.tsx";
import {
    PersonRow, SubstitutionPersonField, personMeta,
} from "@/components/componentsSubstitutions/SubstitutionPersonField.tsx";
import {SzButton, szButtonClass} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SzFormSection} from "@/components/componentsSz/componentsSzCard/form/SzFormSection.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {
    TreeSingleSelectModal
} from "@/components/componentsGeneral/selects/SingleSelects/TreeSingleSelectModal.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {colors} from "@/design/tokens.ts";
import {
    AlertTriangle, ArrowLeft, BadgeCheck, Building2, Check, ChevronDown, Download, FilePlus, Plus, Save, Send,
    FileSignature, FlaskConical, PencilLine, Trash2, Undo2, X,
} from "lucide-react";

const empty: SubstitutionSaveRequest = {
    subject: "", reason: "Other", absentName: "", substituteName: "",
    handoverMoment: "EndOfDay", commissionMembers: [],
};

const STATUS_TONE: Record<SubstitutionStatus, { fg: string; bg: string }> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    OnExecution: colors.status.onact,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
};

/** Роли этапов приходят с бэкенда русской строкой и участвуют в логике — переводим только подпись. */
const ROLE_KEY: Record<string, string> = {
    "Операционное управление": "ops",
    "УЧР": "hr",
};

// Стили элементов, общие с Реестром СЗ
const FOCUS = "outline-none focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]";
const FIELD = `w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#0f1b2d] placeholder:text-[#a3adbd] ${FOCUS} disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]`;
const BTN = "inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY = `${BTN} h-[42px] rounded-[11px] border-none bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]`;
const BTN_SECONDARY = `${BTN} h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]`;

type StatusTone = "success" | "danger" | "active" | "warning" | "muted";
const TONE_CLASS: Record<StatusTone, string> = {
    success: "bg-[#e9f6ee] text-[#1c7a4d]",
    danger: "bg-[#fdeceb] text-[#c0392b]",
    active: "bg-[#e9f0ff] text-[#2f68f5]",
    warning: "bg-[#fdf3e0] text-[#b3730a]",
    muted: "bg-[#f1f3f7] text-[#8b97ab]",
};
const APPROVAL_TONE: Record<ApprovalState, StatusTone> = {
    Approved: "success", Rejected: "danger", Active: "active", Pending: "muted", Skipped: "muted",
};
/** Колонка статуса в маршруте: «Согласование» / «Подпись». */
const STATUS_COL = "w-[150px] flex-none";

function StatusPill({tone, children}: {tone: StatusTone; children: React.ReactNode}) {
    return (
        <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none ${TONE_CLASS[tone]}`}>
            {children}
        </span>
    );
}

export function SubstitutionCardPage() {
    const {t, i18n} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();
    const {user} = useAuth();

    const [users, setUsers] = useState<PickableUser[]>([]);
    const [filials, setFilials] = useState<{ id: number; titleRu: string; label: string }[]>([]);
    // Родитель каждого подразделения — чтобы по отделу сотрудника найти его филиал.
    const [unitParents, setUnitParents] = useState<Map<number, number | null>>(new Map());
    const [form, setForm] = useState<SubstitutionSaveRequest>(empty);
    const [details, setDetails] = useState<SubstitutionDetails | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!isNew);
    // Отклонение — модалкой с обязательной причиной; «Отмена» просто закрывает её.
    const [rejectReason, setRejectReason] = useState("");
    const [rejectError, setRejectError] = useState<string | null>(null);
    // Переназначение непройденного этапа (УЧР, администратор): id этапа, кому, почему.
    const [reassignFor, setReassignFor] = useState<number | null>(null);
    const [reassignUserId, setReassignUserId] = useState<number | null>(null);
    const [reassignReason, setReassignReason] = useState("");
    const [reassignError, setReassignError] = useState<string | null>(null);
    // Подтверждения действий из шапки — как в карточке СЗ.
    const [confirm, setConfirm] = useState<null | "submit" | "execute" | "withdraw" | "delete" | "approve" | "reject" | "correct">(null);
    // Корректировка на согласовании/подписании — после подтверждения в модалке.
    const [correcting, setCorrecting] = useState(false);
    // Зафиксированные документы и подписи ЭЦП — с отправки заявки (на согласовании подписывает
    // директор филиала и др. на своём этапе) и на этапе «На подписании».
    const [signing, setSigning] = useState<SubstitutionSigningState | null>(null);
    // Счётчик перезагрузки подписания: правка УЧР или решение по этапу могут завести новую версию
    // документов, а статус заявки при этом не меняется.
    const [signingReload, setSigningReload] = useState(0);

    useEffect(() => {
        userService.lookup().then((list) => setUsers(list.map((u) => ({
            id: u.id, fullName: u.fullName, position: u.position ?? null,
            orgUnit: u.orgUnit ?? null, orgUnitId: u.orgUnitId ?? null,
            isBoardMember: u.isBoardMember ?? false, isUnitHead: u.isUnitHead ?? false,
        })))).catch(() => {
        });
    }, []);

    // Справочник подразделений для выбора: филиалы (сберкассы) из оргструктуры.
    // Название показываем на языке интерфейса, а в заявку по-прежнему пишем русское.
    useEffect(() => {
        organizationUnitService.getAll()
            .then((list) => {
                setUnitParents(new Map(list.map((u) => [u.id, u.parentId])));
                setFilials(list
                    .filter((u) => /филиал/i.test(u.titleRu))
                    .map((u) => ({
                        id: u.id,
                        titleRu: u.titleRu,
                        label: (i18n.language === "ky" ? u.titleKg : i18n.language === "en" ? u.titleEn : null) || u.titleRu,
                    })));
            })
            .catch(() => {
            });
    }, [i18n.language]);

    /** Филиал сотрудника: его подразделение, если это филиал, иначе ближайший филиал выше по дереву. */
    const filialOf = (orgUnitId: number | null | undefined) => {
        const seen = new Set<number>();
        let cur = orgUnitId ?? null;
        while (cur != null && !seen.has(cur)) {
            const hit = filials.find((x) => x.id === cur);
            if (hit) return hit;
            seen.add(cur);
            cur = unitParents.get(cur) ?? null;
        }
        return null;
    };

    useEffect(() => {
        if (isNew) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDetails(null);
            setForm(empty);
            setLoading(false);
            return;
        }
        setLoading(true);
        substitutionService.get(Number(id))
            .then((d) => {
                setDetails(d);
                setForm(toForm(d));
            })
            .catch(() => setError(t("substitutionCard.loadError")))
            .finally(() => setLoading(false));
    }, [id, isNew, t]);

    // Документы фиксируются при отправке — грузим их для всех, кроме черновиков.
    const status = details?.status;
    useEffect(() => {
        if (!details || status === "Draft") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSigning(null);
            return;
        }
        substitutionService.signingState(details.id).then(setSigning).catch(() => setSigning(null));
    }, [details?.id, status, signingReload]); // eslint-disable-line react-hooks/exhaustive-deps

    // Действующий маршрут — последний круг согласования; прошлые круги только история.
    const currentRound = Math.max(1, ...(details?.approvals ?? []).map((a) => a.round ?? 1));
    const currentSteps = (details?.approvals ?? []).filter((a) => (a.round ?? 1) === currentRound);
    const activeStep = currentSteps.find((a) => a.state === "Active");
    // Решает назначенный на этап или тот, кто его сейчас замещает (GEN-14).
    const canDecide = details?.status === "OnApproval" && !!activeStep && !!user
        && (activeStep.userId === user.id || (details?.actingForUserIds ?? []).includes(activeStep.userId));
    // Подпись ЭЦП прямо из маршрута: после согласования у этапа появляются кнопки «Подписать …».
    const routeSigning = useSubstitutionSigning(details?.id ?? 0, setSigning);
    /** Места подписей этапа, которые текущий пользователь может поставить сейчас. */
    const signableFor = (a: ApprovalStep) => (signing?.documents ?? [])
        .filter((d) => d.isCurrent)
        .flatMap((doc) => doc.slots
            .filter((sl) => sl.canSign && !sl.signature && sl.userId != null
                && (sl.userId === a.userId || sl.userId === a.decidedByUserId))
            .map((slot) => ({doc, slot})));
    const decidesOnBehalfOf = canDecide && activeStep && activeStep.userId !== user?.id ? activeStep.userName : null;
    // Что можно — считает сервер (details.access): УЧР из настроек маршрута и администратор ведут
    // все заявки; инициатор — только свою (отправить, отозвать, удалить черновик).
    const access = details?.access;
    const canManage = !!access?.canManage;
    const isInitiator = isNew || !!access?.isInitiator;
    // Переназначать этапы могут УЧР и администратор — как проверяет сервер.
    const canManageRoute = canManage;

    // Корректировка (право CorrectSubstitution или УЧР) — на любом этапе, после «Корректировать».
    const canCorrect = !!access?.canCorrect;
    const hrCanEdit = canCorrect && correcting
        && (details?.status === "OnApproval" || details?.status === "OnExecution");
    // Сколько согласований уже собрано в действующем круге — от этого зависит предупреждение.
    const approvedInRound = currentSteps.filter((a) => a.state === "Approved").length;
    // Withdrawn — заявки, отозванные до того, как отзыв стал возвращать в черновик: их тоже можно
    // поправить и отправить заново.
    const ownDraft = isInitiator
        && (details?.status === "Draft" || details?.status === "Rejected" || details?.status === "Withdrawn");
    const editable = isNew || ownDraft || hrCanEdit;
    const canSubmit = !!details && ownDraft;
    const set = <K extends keyof SubstitutionSaveRequest>(k: K, v: SubstitutionSaveRequest[K]) =>
        setForm((f) => ({...f, [k]: v}));

    const days = useMemo(() => {
        if (!form.startsOn || !form.endsOn) return null;
        const a = new Date(form.startsOn), b = new Date(form.endsOn);
        const n = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
        return n > 0 ? n : null;
    }, [form.startsOn, form.endsOn]);

    const unitOptions = useMemo(
        () => filials.map((f) => ({key: String(f.id), label: f.label})),
        [filials]);

    /** Новая заявка — «Создать черновик» (как в СЗ): заявка появляется в статусе «Черновик»,
     *  на согласование уходит только по кнопке «Отправить на согласование». */
    async function saveDraft(): Promise<number | null> {
        setBusy(true);
        setError(null);
        try {
            const d = isNew ? await substitutionService.create(form)
                : await substitutionService.update(Number(id), form);
            if (isNew) {
                toast.success(t("substitutionCard.toast.draftCreated"), d.subject || undefined);
                navigate(`/substitutions/${d.id}`, {replace: true});
            } else {
                setDetails(d);
                setForm(toForm(d));
                setSigningReload((n) => n + 1);
                setCorrecting(false);
                toast.success(t("substitutionCard.toast.saved"));
            }
            return d.id;
        } catch (e) {
            toast.error(t("substitutionCard.toast.saveFailed"), msgOf(e, t));
            return null;
        } finally {
            setBusy(false);
        }
    }

    /** Отправка: сначала сохраняем правки черновика, затем отправляем на согласование. */
    async function submit() {
        if (details == null) return;
        setBusy(true);
        try {
            await substitutionService.update(details.id, form);
            const d = await substitutionService.submit(details.id);
            setDetails(d);
            setForm(toForm(d));
            toast.success(
                d.status === "OnExecution" ? t("substitutionCard.toast.submittedToSigning") : t("substitutionCard.toast.submitted"),
                d.routeNote ?? undefined);
        } catch (e) {
            toast.error(t("substitutionCard.toast.submitFailed"), msgOf(e, t));
        } finally {
            setBusy(false);
        }
    }

    /** Выполнить действие над заявкой; true — успешно (формы отклонения/переназначения закрываются только тогда). */
    async function act(fn: () => Promise<SubstitutionDetails>, okTitle: string): Promise<boolean> {
        setBusy(true);
        setError(null);
        try {
            const d = await fn();
            setDetails(d);
            setForm(toForm(d));
            setSigningReload((n) => n + 1);
            toast.success(okTitle);
            return true;
        } catch (e) {
            toast.error(t("substitutionCard.toast.actionFailed"), msgOf(e, t));
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function confirmReject() {
        if (details == null) return;
        const reason = rejectReason.trim();
        if (!reason) {
            setRejectError(t("substitutionCard.rejectForm.required"));
            return;
        }
        if (!await act(() => substitutionService.reject(details.id, reason), t("substitutionCard.toast.rejected"))) return;
        setConfirm(null);
        setRejectReason("");
        setRejectError(null);
    }

    async function confirmReassign() {
        if (details == null || reassignFor == null) return;
        if (reassignUserId == null) {
            setReassignError(t("substitutionCard.reassign.userRequired"));
            return;
        }
        const reason = reassignReason.trim();
        if (!reason) {
            setReassignError(t("substitutionCard.reassign.reasonRequired"));
            return;
        }
        if (!await act(() => substitutionService.reassign(details.id, reassignFor, reassignUserId, reason),
            t("substitutionCard.toast.reassigned"))) return;
        setReassignFor(null);
        setReassignUserId(null);
        setReassignReason("");
        setReassignError(null);
    }

    async function remove() {
        if (details == null) return;
        setBusy(true);
        setError(null);
        try {
            await substitutionService.remove(details.id);
            toast.success(t("substitutionCard.toast.deleted"));
            navigate("/substitutions");
        } catch (e) {
            toast.error(t("substitutionCard.toast.actionFailed"), msgOf(e, t));
            setBusy(false);
        }
    }

    if (loading) return <div className="p-6 text-[13px] text-[#8b97ab]">{t("general.loading")}</div>;

    const statusTone = details ? (STATUS_TONE[details.status] ?? colors.status.draft) : null;

    const signedAll = !!signing?.allSigned;

    /**
     * Статус подписи участника маршрута: его места на листах подписей действующих документов
     * (приказ, договор МО). Если мест нет — подпись от этапа не требуется.
     */
    const signStateOf = (a: ApprovalStep): {label: string; tone: StatusTone} => {
        const docs = (signing?.documents ?? []).filter((d) => d.isCurrent);
        if (docs.length === 0) return {label: t("substitutionCard.signState.notFrozen"), tone: "muted"};
        const slots = docs.flatMap((d) => d.slots)
            .filter((sl) => sl.userId != null && (sl.userId === a.userId || sl.userId === a.decidedByUserId));
        if (slots.length === 0) return {label: t("substitutionCard.signState.notRequired"), tone: "muted"};
        const done = slots.filter((sl) => sl.signature).length;
        if (done === slots.length) return {label: t("substitutionCard.signState.signed"), tone: "success"};
        if (done > 0) return {label: t("substitutionCard.signState.partial", {done, total: slots.length}), tone: "warning"};
        if (slots.every((sl) => sl.autoApproved)) return {label: t("substitutionCard.signState.autoApproved"), tone: "muted"};
        return {label: t("substitutionCard.signState.waiting"), tone: "warning"};
    };

    // Автор заявки — кто её завёл; неизменяемое поле. У новой заявки им станет текущий пользователь.
    const authorId = isNew ? (user?.id ?? null) : (details?.authorUserId ?? null);
    const authorPerson = authorId != null ? users.find((u) => u.id === authorId) : undefined;
    const authorName = authorPerson?.fullName
        ?? (isNew ? user?.fullName : details?.authorName)
        ?? null;

    return (
        <div className="px-7 py-6 max-w-[1700px]">
            <button type="button" onClick={() => navigate("/substitutions")}
                    className="inline-flex items-center gap-1.5 mb-3 border-none bg-transparent text-[13px] font-medium text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft className="w-4 h-4"/> {t("substitutionRequests.title")}
            </button>
            {/* Шапка как у карточки СЗ: номер, статус, заголовок — слева, действия — справа */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    {details && (
                        <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[13px] text-[#55617a]">{details.regNumber ?? t("substitutionRequests.draftNumber")}</span>
                            {statusTone && (
                                <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                      style={{color: statusTone.fg, background: statusTone.bg}}>
                                    {t(`substitutionRequests.status.${details.status}`)}
                                </span>
                            )}
                        </div>
                    )}
                    <h1 className="mt-1.5 mb-0 text-[21px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                        {isNew ? t("substitutionCard.newTitle") : (details?.subject || t("substitutionCard.defaultTitle"))}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Новая заявка: «Отмена» и «Создать черновик» — как на создании СЗ */}
                    {isNew && (
                        <>
                            <button type="button" onClick={() => navigate("/substitutions")} disabled={busy}
                                    className="inline-flex items-center gap-2 h-11 px-[18px] rounded-[11px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[13.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed">
                                <X className="w-[18px] h-[18px]" strokeWidth={2}/>
                                {t("substitutionCard.buttons.cancelCreate")}
                            </button>
                            <button type="button" onClick={() => void saveDraft()} disabled={busy}
                                    className={`inline-flex items-center gap-2 h-11 px-[22px] rounded-[11px] border-none font-semibold text-[14px] ${
                                        busy ? "bg-[#e5e9f0] text-[#a3adbd] cursor-not-allowed"
                                            : "bg-[#2f68f5] text-white cursor-pointer hover:brightness-[1.06] shadow-[0_8px_20px_-8px_#2f68f5]"}`}>
                                <FilePlus className="w-[18px] h-[18px]" strokeWidth={2}/>
                                {busy ? t("substitutionCard.buttons.creatingDraft") : t("substitutionCard.buttons.createDraft")}
                            </button>
                        </>
                    )}
                    {/* Сохранить: черновик/отклонённая — инициатор, после Операционного управления — УЧР */}
                    {!isNew && editable && (
                        <SzButton variant="primary" icon={<Save size={16}/>} onClick={() => void saveDraft()} disabled={busy}>
                            {hrCanEdit && !ownDraft ? t("substitutionCard.buttons.saveHr") : t("substitutionCard.buttons.save")}
                        </SzButton>
                    )}
                    {/* Корректировать — право CorrectSubstitution или УЧР */}
                    {details && canCorrect && !correcting
                        && (details.status === "OnApproval" || details.status === "OnExecution") && (
                        <SzButton icon={<PencilLine size={16}/>} onClick={() => setConfirm("correct")} disabled={busy}>
                            {t("substitutionCard.correction.start")}
                        </SzButton>
                    )}
                    {correcting && (
                        <SzButton icon={<X size={16}/>} disabled={busy}
                                  onClick={() => { setCorrecting(false); if (details) setForm(toForm(details)); }}>
                            {t("substitutionCard.correction.cancel")}
                        </SzButton>
                    )}
                    {canSubmit && (
                        <SzButton variant="outline" icon={<Send size={16}/>} onClick={() => setConfirm("submit")} disabled={busy}>
                            {t("substitutionCard.buttons.submit")}
                        </SzButton>
                    )}
                    {/* «Исполнено» — УЧР вручную, в том числе с неподписанными документами */}
                    {details && access?.canExecute && (
                        <SzButton variant="success" icon={<BadgeCheck size={16}/>} onClick={() => setConfirm("execute")} disabled={busy}>
                            {t("substitutionCard.buttons.execute")}
                        </SzButton>
                    )}
                    {/* «Печатные формы приказа/договора МО» — как «Скачать / печать» у СЗ: страница в новой
                        вкладке, сверху табы документов (приказ, договор МО), ниже — «С подписями ЭЦП» /
                        «Для подписи от руки», PDF, DOCX и печать. */}
                    {details && (
                        <Tooltip content={t("substitutionCard.buttons.printHint")} side="bottom">
                            <a href={substitutionPrintUrl(details.id, "order")} target="_blank" rel="noreferrer"
                               className={`${szButtonClass("muted")} no-underline gap-1.5`}>
                                <Download size={15}/>
                                {t("substitutionCard.buttons.printForms")}
                            </a>
                        </Tooltip>
                    )}
                    {/* «Выгрузить (все поля)» — листок самой заявки на замещение (DOCX со всеми полями) */}
                    {details && (
                        <SzButton variant="muted" icon={<Download size={15}/>}
                                  onClick={() => void substitutionService.print(details.id, "card",
                                      t("substitutionCard.files.card", {name: details.regNumber ?? details.id}))}>
                            {t("substitutionCard.buttons.exportAll")}
                        </SzButton>
                    )}
                    {access?.canWithdraw && (
                        <SzButton icon={<Undo2 size={16}/>} onClick={() => setConfirm("withdraw")} disabled={busy}>
                            {t("substitutionCard.buttons.withdraw")}
                        </SzButton>
                    )}
                    {access?.canDelete && (
                        <Tooltip content={t("substitutionCard.buttons.delete")} side="bottom">
                            <button type="button" onClick={() => setConfirm("delete")} disabled={busy}
                                    aria-label={t("substitutionCard.buttons.delete")}
                                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[#f1c9c2] bg-white text-[#c0392b] transition-colors hover:bg-[#fbeae7] disabled:opacity-50">
                                <Trash2 size={16}/>
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            {details?.routeNote && (
                <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#f0dcae] bg-[#fdf6e7] px-4 py-2.5 text-[13px] text-[#8a5a00]">
                    <AlertTriangle size={16} className="mt-[1px] flex-none"/>
                    <div>
                        <div className="font-semibold">{t("substitutionCard.routeNoteTitle")}</div>
                        <div className="whitespace-pre-wrap">{details.routeNote}</div>
                    </div>
                </div>
            )}
            {details?.passportExpiresBeforeEnd && (
                <div
                    className="mt-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {t("substitutionCard.passportWarning")}
                </div>
            )}
            {error && (
                <div
                    className="mt-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="mt-5 flex flex-col gap-4">
                {/* Блок 1 */}
                <SzFormSection title={t("substitutionCard.sections.general")} hint={t("substitutionCard.sections.generalHint")}>
                    <Grid>
                        <Field label={t("substitutionCard.fields.author")}
                               hint={t("substitutionCard.fields.authorHint")}>
                            {authorName ? (
                                <PersonRow name={authorName} meta={personMeta(authorPerson)} muted={!authorPerson}/>
                            ) : (
                                <div className="flex h-10 items-center rounded-[9px] border border-[#e5e9f0] bg-[#f9fafc] px-3 text-[13px] text-[#a3adbd]">—</div>
                            )}
                        </Field>
                        <Field label={t("substitutionCard.fields.createdAt")}>
                            <div className="flex h-10 items-center rounded-[9px] border border-[#e5e9f0] bg-[#f9fafc] px-3 font-mono text-[13px] text-[#55617a]">
                                {details?.createdAt ? formatDateTime(details.createdAt) : t("substitutionCard.fields.createdAtNew")}
                            </div>
                        </Field>
                        <Field label={t("substitutionCard.fields.subject")} required>
                            <Input value={form.subject} disabled={!editable} onChange={(v) => set("subject", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.reason")} required>
                            <Select value={form.reason} disabled={!editable}
                                    onChange={(v) => set("reason", v as SubstitutionReason)}
                                    options={(Object.keys(REASON_LABEL) as SubstitutionReason[]).map((c) => ({
                                        value: c, label: t(`substitutionRequests.reason.${c}`),
                                    }))}/>
                        </Field>
                    </Grid>
                </SzFormSection>

                {/* Блок 2 */}
                <SzFormSection title={t("substitutionCard.sections.absent")} hint={t("substitutionCard.sections.absentHint")}>
                    <Grid>
                        <Field label={t("substitutionCard.fields.employee")}>
                            <UserField users={users} value={form.absentUserId ?? null} disabled={!editable}
                                       fallbackName={form.absentName} fallbackPosition={form.absentPosition}
                                       excludeId={form.substituteUserId ?? undefined}
                                       onChange={(u) => {
                                           // Подразделение подставляем из сотрудника; не нашли — оставляем выбранное вручную.
                                           const unit = filialOf(u?.orgUnitId);
                                           setForm((f) => ({
                                               ...f,
                                               absentUserId: u?.id ?? null,
                                               absentName: u?.fullName ?? f.absentName,
                                               absentPosition: u?.position ?? f.absentPosition,
                                               absentUnitId: unit?.id ?? f.absentUnitId,
                                               absentBranch: unit?.titleRu ?? f.absentBranch,
                                           }));
                                       }}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.fullNameManual")}>
                            <Input value={form.absentName} disabled={!editable} onChange={(v) => set("absentName", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.position")}>
                            <Input value={form.absentPosition ?? ""} disabled={!editable}
                                   onChange={(v) => set("absentPosition", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.unit")} hint={editable ? t("substitutionCard.fields.unitAutoHint") : undefined}>
                            <UnitField value={form.absentUnitId ? String(form.absentUnitId) : null} disabled={!editable}
                                    options={unitOptions}
                                    onChange={(v) => {
                                        const uid = v ? Number(v) : null;
                                        const f = filials.find((x) => x.id === uid);
                                        setForm((s) => ({...s, absentUnitId: uid, absentBranch: f?.titleRu ?? null}));
                                    }}/>
                        </Field>
                    </Grid>
                </SzFormSection>

                {/* Блок 3 */}
                <SzFormSection title={t("substitutionCard.sections.substitute")} hint={t("substitutionCard.sections.substituteHint")}>
                    <Grid>
                        <Field label={t("substitutionCard.fields.employee")}>
                            <UserField users={users} value={form.substituteUserId ?? null} disabled={!editable}
                                       fallbackName={form.substituteName} fallbackPosition={form.substitutePosition}
                                       excludeId={form.absentUserId ?? undefined}
                                       onChange={(u) => {
                                           const unit = filialOf(u?.orgUnitId);
                                           setForm((f) => ({
                                               ...f,
                                               substituteUserId: u?.id ?? null,
                                               substituteName: u?.fullName ?? f.substituteName,
                                               substitutePosition: u?.position ?? f.substitutePosition,
                                               substituteUnitId: unit?.id ?? f.substituteUnitId,
                                               substituteBranch: unit?.titleRu ?? f.substituteBranch,
                                           }));
                                       }}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.fullNameManual")}>
                            <Input value={form.substituteName} disabled={!editable}
                                   onChange={(v) => set("substituteName", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.position")}>
                            <Input value={form.substitutePosition ?? ""} disabled={!editable}
                                   onChange={(v) => set("substitutePosition", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.unit")} hint={editable ? t("substitutionCard.fields.unitAutoHint") : undefined}>
                            <UnitField value={form.substituteUnitId ? String(form.substituteUnitId) : null}
                                    disabled={!editable}
                                    options={unitOptions}
                                    onChange={(v) => {
                                        const uid = v ? Number(v) : null;
                                        const f = filials.find((x) => x.id === uid);
                                        setForm((s) => ({
                                            ...s,
                                            substituteUnitId: uid,
                                            substituteBranch: f?.titleRu ?? null
                                        }));
                                    }}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.passportSeriesNumber")}>
                            <Input value={form.passportSeriesNumber ?? ""} disabled={!editable}
                                   onChange={(v) => set("passportSeriesNumber", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.passportIssuedBy")}>
                            <Input value={form.passportIssuedBy ?? ""} disabled={!editable}
                                   onChange={(v) => set("passportIssuedBy", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.inn")}>
                            <InnInput value={form.inn ?? ""} disabled={!editable} onChange={(v) => set("inn", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.passportIssuedOn")}>
                            <DateInput value={form.passportIssuedOn} disabled={!editable}
                                       onChange={(v) => set("passportIssuedOn", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.passportValidUntil")}>
                            <DateInput value={form.passportValidUntil} disabled={!editable}
                                       onChange={(v) => set("passportValidUntil", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.addressRegistration")}>
                            <Input value={form.addressRegistration ?? ""} disabled={!editable}
                                   onChange={(v) => set("addressRegistration", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.addressResidence")}>
                            <Input value={form.addressResidence ?? ""} disabled={!editable}
                                   onChange={(v) => set("addressResidence", v)}/>
                        </Field>
                    </Grid>
                </SzFormSection>

                {/* Блок 4 */}
                <SzFormSection title={t("substitutionCard.sections.period")} hint={t("substitutionCard.sections.periodHint")}>
                    <Grid>
                        <Field label={t("substitutionCard.fields.startsOn")} required>
                            <DateInput value={form.startsOn} disabled={!editable} onChange={(v) => set("startsOn", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.endsOn")} required>
                            <DateInput value={form.endsOn} disabled={!editable} onChange={(v) => set("endsOn", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.daysCount")}>
                            <div
                                className="flex h-10 items-center font-mono text-[13px] font-semibold text-[#3a4560]">{days ?? "—"}</div>
                        </Field>
                    </Grid>
                </SzFormSection>

                {/* Блок 5 */}
                <SzFormSection title={t("substitutionCard.sections.commission")} hint={t("substitutionCard.sections.commissionHint")}>
                    <Grid>
                        <Field label={t("substitutionCard.fields.chair")}>
                            <UserField users={users} value={form.commissionChairUserId ?? null} disabled={!editable}
                                       fallbackName={form.commissionChairName} fallbackPosition={form.commissionChairPosition}
                                       onChange={(u) => setForm((f) => ({
                                           ...f,
                                           commissionChairUserId: u?.id ?? null,
                                           commissionChairName: u?.fullName ?? f.commissionChairName,
                                           commissionChairPosition: u?.position ?? f.commissionChairPosition
                                       }))}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.chairPosition")}>
                            <Input value={form.commissionChairPosition ?? ""} disabled={!editable}
                                   onChange={(v) => set("commissionChairPosition", v)}/>
                        </Field>
                        <Field label={t("substitutionCard.fields.handoverMoment")}>
                            <div
                                className="inline-flex h-10 rounded-[9px] border border-[#e5e9f0] bg-[#f6f8fb] p-[2px]">
                                {(Object.keys(HANDOVER_LABEL) as HandoverMoment[]).map((v) => {
                                    const active = form.handoverMoment === v;
                                    return (
                                        <button key={v} type="button" disabled={!editable}
                                                onClick={() => set("handoverMoment", v)}
                                                className={`cursor-pointer rounded-[8px] border-none px-3 text-[12.5px] font-semibold disabled:cursor-default ${
                                                    active ? "bg-white text-[#2f68f5] shadow-sm" : "bg-transparent text-[#8b97ab] hover:text-[#3a4560]"}`}>
                                            {t(`substitutionCard.handover.${v}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>
                        <Field label={t("substitutionCard.fields.handoverOn")}>
                            <DateInput value={form.handoverOn} disabled={!editable}
                                       onChange={(v) => set("handoverOn", v)}/>
                        </Field>
                    </Grid>

                    <div className="mt-4">
                        <div className="mb-[5px] text-[11.5px] text-[#4d5a72]">
                            {t("substitutionCard.fields.members")}
                        </div>
                        <div className="flex flex-col gap-2">
                            {form.commissionMembers.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1"><UserField users={users} value={m.userId ?? null}
                                                                    disabled={!editable}
                                                                    fallbackName={m.fullName}
                                                                    fallbackPosition={m.position}
                                                                    onChange={(u) => updateMember(setForm, i, {
                                                                        userId: u?.id ?? null,
                                                                        fullName: u?.fullName ?? m.fullName,
                                                                        position: u?.position ?? m.position
                                                                    })}/></div>
                                    <input className={`flex-1 ${FIELD}`}
                                           placeholder={t("substitutionCard.fields.position")} disabled={!editable}
                                           value={m.position ?? ""}
                                           onChange={(e) => updateMember(setForm, i, {position: e.target.value})}/>
                                    {editable && (
                                        <Tooltip content={t("substitutionCard.buttons.removeMember")} side="top">
                                            <button type="button" onClick={() => removeMember(setForm, i)}
                                                    aria-label={t("substitutionCard.buttons.removeMember")}
                                                    className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-[9px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]">
                                                <Trash2 size={16}/>
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            ))}
                        </div>
                        {editable && (
                            <button type="button" onClick={() => addMember(setForm)}
                                    className="mt-2.5 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#cbddff] bg-[#f6f9ff] px-3 text-[13px] font-semibold text-[#2f68f5] hover:bg-[#e9f0ff]">
                                <Plus size={15}/> {t("substitutionCard.buttons.addMember")}
                            </button>
                        )}
                    </div>
                </SzFormSection>

                {/* Блок 6 */}
                <SzFormSection title={t("substitutionCard.sections.other")} hint={t("substitutionCard.sections.otherHint")}>
                    <Field label={t("substitutionCard.fields.description")}>
                        <textarea
                            className={`w-full min-h-[88px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] text-[#0f1b2d] ${FOCUS} disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]`}
                            disabled={!editable} value={form.description ?? ""}
                            onChange={(e) => set("description", e.target.value)}/>
                    </Field>
                </SzFormSection>

                {/* Маршрут согласования */}
                {details && details.approvals.length > 0 && (
                    <SzFormSection title={t("substitutionCard.sections.route")} hint={t("substitutionCard.sections.routeHint")}>
                        <div className="flex flex-col gap-2.5">
                            {/* Шапка колонок: статус согласования и статус подписи ЭЦП */}
                            <div className="flex items-center gap-3 border-b border-[#eef1f5] pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#8b97ab]">
                                <span className="flex-1"/>
                                <span className={STATUS_COL}>{t("substitutionCard.routeColumns.approval")}</span>
                                <span className={STATUS_COL}>{t("substitutionCard.routeColumns.signature")}</span>
                            </div>
                            {details.approvals.map((a, i) => {
                                const round = a.round ?? 1;
                                const isHistory = round !== currentRound;
                                const color = a.state === "Approved" ? "#1c7a4d"
                                    : a.state === "Rejected" ? "#c0392b"
                                        : a.state === "Active" ? "#2f68f5" : "#8b97ab";
                                const roleKey = ROLE_KEY[a.roleLabel];
                                const roleTitle = roleKey ? t(`substitutionCard.roles.${roleKey}`) : a.roleLabel;
                                // Заголовок круга — только когда кругов несколько (была повторная отправка).
                                const showRoundHeader = currentRound > 1
                                    && (i === 0 || (details.approvals[i - 1].round ?? 1) !== round);
                                const decidedBy = a.decidedByUserId != null && a.decidedByUserId !== a.userId
                                    ? details.deciderNames?.[a.decidedByUserId] ?? null
                                    : null;
                                const canReassign = canManageRoute && !isHistory && details.status === "OnApproval"
                                    && (a.state === "Active" || a.state === "Pending");
                                return (
                                    <React.Fragment key={a.id ?? `${round}-${a.order}`}>
                                        {showRoundHeader && (
                                            <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#8b97ab]">
                                                {t("substitutionCard.round", {n: round})}
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-1 text-[13px] ${isHistory ? "opacity-70" : ""}`}>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-white text-[12px] font-semibold"
                                                    style={{background: color}}>{a.order}</span>
                                                <span className="min-w-[170px] font-semibold text-[#1c2740]">{roleTitle}</span>
                                                <span className="flex-1 text-[#55617a]">
                                                    {a.userName ?? "—"}
                                                    {decidedBy && (
                                                        <span className="ml-1.5 text-[12px] text-[#8b97ab]">
                                                            · {t("substitutionCard.decidedOnBehalf", {name: decidedBy})}
                                                        </span>
                                                    )}
                                                </span>
                                                {canReassign && reassignFor !== a.id && (
                                                    <button type="button" className={BTN_SECONDARY} disabled={busy}
                                                            onClick={() => {
                                                                setReassignFor(a.id);
                                                                setReassignUserId(null);
                                                                setReassignReason("");
                                                                setReassignError(null);
                                                            }}>
                                                        {t("substitutionCard.reassign.button")}
                                                    </button>
                                                )}
                                                <span className={STATUS_COL}>
                                                    <StatusPill tone={APPROVAL_TONE[a.state]}>
                                                        {t(`substitutionCard.approvalState.${a.state}`)}
                                                    </StatusPill>
                                                </span>
                                                <span className={STATUS_COL}>
                                                    {isHistory ? (
                                                        <span className="text-[12px] text-[#a3adbd]">—</span>
                                                    ) : (() => {
                                                        const sign = signStateOf(a);
                                                        return <StatusPill tone={sign.tone}>{sign.label}</StatusPill>;
                                                    })()}
                                                </span>
                                            </div>
                                            {a.comment && (
                                                <div className="ml-9 whitespace-pre-wrap text-[12.5px] text-[#55617a]">«{a.comment}»</div>
                                            )}
                                            {/* Решение по своему этапу — прямо в строке маршрута */}
                                            {!isHistory && canDecide && activeStep?.id === a.id && (
                                                <div className="ml-9 mt-1 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#cbddff] bg-[#f6f9ff] px-3 py-2.5">
                                                    <span className="mr-1 text-[12.5px] font-semibold text-[#2f68f5]">
                                                        {decidesOnBehalfOf
                                                            ? t("substitutionCard.routeActions.decideFor", {name: decidesOnBehalfOf})
                                                            : t("substitutionCard.routeActions.decide")}
                                                    </span>
                                                    <SzButton size="xs" variant="success" icon={<Check size={14}/>} disabled={busy}
                                                              onClick={() => setConfirm("approve")}>
                                                        {t("substitutionCard.buttons.approve")}
                                                    </SzButton>
                                                    <SzButton size="xs" variant="danger" icon={<X size={14}/>} disabled={busy}
                                                              onClick={() => {
                                                                  setRejectError(null);
                                                                  setConfirm("reject");
                                                              }}>
                                                        {t("substitutionCard.buttons.reject")}
                                                    </SzButton>
                                                </div>
                                            )}
                                            {/* После согласования — подпись ЭЦП документов этого участника */}
                                            {!isHistory && a.state === "Approved" && (() => {
                                                const items = signableFor(a);
                                                if (items.length === 0) return null;
                                                return (
                                                    <div className="ml-9 mt-1 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#cbddff] bg-[#f6f9ff] px-3 py-2.5">
                                                        <span className="mr-1 text-[12.5px] font-semibold text-[#2f68f5]">
                                                            {t("substitutionCard.routeActions.sign")}
                                                        </span>
                                                        {items.map(({doc, slot}) => {
                                                            const key = signingKey(doc.id, slot.role, slot.userId);
                                                            return (
                                                                <React.Fragment key={key}>
                                                                    <SzButton size="xs" variant="primary" icon={<FileSignature size={14}/>}
                                                                              disabled={routeSigning.busyKey !== null || routeSigning.quietSigning}
                                                                              onClick={() => void routeSigning.sign(doc, slot.role, slot.userId)}>
                                                                        {routeSigning.busyKey === key
                                                                            ? t("substitutionSigning.signing")
                                                                            : t(doc.kind === "Order"
                                                                                ? "substitutionCard.routeActions.signOrder"
                                                                                : "substitutionCard.routeActions.signLiability")}
                                                                    </SzButton>
                                                                    {signing?.allowTestEcp && (
                                                                        <SzButton size="xs" variant="warning" icon={<FlaskConical size={14}/>}
                                                                                  disabled={routeSigning.busyKey !== null}
                                                                                  onClick={() => void routeSigning.signTest(doc, slot.role, slot.userId)}>
                                                                            {t("substitutionSigning.signTest")}
                                                                        </SzButton>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                            {reassignFor === a.id && (
                                                <div className="ml-9 mt-1 flex flex-col gap-2 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3">
                                                    <div className="text-[12.5px] font-semibold text-[#1c2740]">
                                                        {t("substitutionCard.reassign.title", {role: roleTitle})}
                                                    </div>
                                                    <Field label={t("substitutionCard.reassign.user")}>
                                                        <UserField users={users} value={reassignUserId}
                                                                   onChange={(u) => setReassignUserId(u?.id ?? null)}/>
                                                    </Field>
                                                    <textarea
                                                        className={`w-full min-h-[64px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] text-[#0f1b2d] ${FOCUS}`}
                                                        placeholder={t("substitutionCard.reassign.placeholder")}
                                                        value={reassignReason}
                                                        onChange={(e) => setReassignReason(e.target.value)}/>
                                                    {reassignError && (
                                                        <div className="text-[12.5px] text-[#c0392b]">{reassignError}</div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button type="button" className={BTN_PRIMARY} disabled={busy}
                                                                onClick={() => void confirmReassign()}>
                                                            {t("substitutionCard.reassign.confirm")}
                                                        </button>
                                                        <button type="button" className={BTN_SECONDARY} disabled={busy}
                                                                onClick={() => setReassignFor(null)}>
                                                            {t("substitutionCard.reassign.cancel")}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </SzFormSection>
                )}

                {/* Подписание документов: приказ и договор, подписи ЭЦП участников, просмотр (глазик).
                    Показывается всегда, у черновика — с пояснением, что документы зафиксируются при отправке. */}
                {/* Подписанты договора МО от имени Банка: основной (Председатель Правления из настроек)
                    и дополнительные — их добавляет делопроизводство или УЧР. */}
                {details && (
                    <SubstitutionBankSignersSection details={details} users={users}
                                                    onSaved={(d) => {
                                                        setDetails(d);
                                                        setSigningReload((n) => n + 1);
                                                    }}/>
                )}

                {details && (
                    <SubstitutionSigningSection requestId={details.id} regNumber={details.regNumber}
                                                state={signing} onChange={setSigning}/>
                )}


            </div>

            {routeSigning.modal}

            {/* Подтверждения действий из шапки */}
            <ConfirmActionModal
                open={confirm === "correct"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => { setCorrecting(true); setConfirm(null); }}
                title={t("substitutionCard.correction.confirmTitle")}
                message={details?.status === "OnExecution"
                    ? t("substitutionCard.correction.confirmSigning")
                    : approvedInRound > 0
                        ? t("substitutionCard.correction.confirmWithVisas", {count: approvedInRound})
                        : t("substitutionCard.correction.confirmNoVisas")}
                confirmLabel={t("substitutionCard.correction.start")}
                loadingLabel={t("substitutionCard.correction.start")}
                loading={busy}
                variant="primary"
                icon={PencilLine}
            />
            <ConfirmActionModal
                open={confirm === "approve"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => {
                    if (details && await act(() => substitutionService.approve(details.id), t("substitutionCard.toast.approved"))) {
                        setConfirm(null);
                    }
                }}
                title={t("substitutionCard.confirm.approveTitle")}
                message={t("substitutionCard.confirm.approveMessage")}
                confirmLabel={t("substitutionCard.buttons.approve")}
                loadingLabel={t("substitutionCard.confirm.processing")}
                loading={busy}
                variant="success"
                icon={Check}
            />
            <ConfirmActionModal
                open={confirm === "reject"}
                onClose={() => {
                    setConfirm(null);
                    setRejectError(null);
                }}
                onConfirm={() => void confirmReject()}
                title={t("substitutionCard.confirm.rejectTitle")}
                message={t("substitutionCard.confirm.rejectMessage")}
                confirmLabel={t("substitutionCard.rejectForm.confirm")}
                loadingLabel={t("substitutionCard.confirm.processing")}
                loading={busy}
                error={rejectError}
                variant="danger"
                icon={X}
            >
                <textarea
                    autoFocus
                    className={`w-full min-h-[96px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] text-[#0f1b2d] ${FOCUS}`}
                    placeholder={t("substitutionCard.rejectForm.placeholder")}
                    value={rejectReason}
                    onChange={(e) => {
                        setRejectReason(e.target.value);
                        if (rejectError && e.target.value.trim()) setRejectError(null);
                    }}/>
            </ConfirmActionModal>
            <ConfirmActionModal
                open={confirm === "submit"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => {
                    await submit();
                    setConfirm(null);
                }}
                title={t("substitutionCard.confirm.submitTitle")}
                message={t("substitutionCard.confirm.submitMessage")}
                confirmLabel={t("substitutionCard.buttons.submit")}
                loadingLabel={t("substitutionCard.confirm.processing")}
                loading={busy}
                variant="primary"
                accent="blue"
                icon={Send}
                wideConfirm
            />
            <ConfirmActionModal
                open={confirm === "execute"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => {
                    if (details) await act(() => substitutionService.execute(details.id), t("substitutionCard.toast.executed"));
                    setConfirm(null);
                }}
                title={t("substitutionCard.confirm.executeTitle")}
                message={signedAll ? t("substitutionCard.confirm.executeMessageSigned") : t("substitutionCard.confirm.executeMessageUnsigned")}
                confirmLabel={t("substitutionCard.buttons.execute")}
                loadingLabel={t("substitutionCard.confirm.processing")}
                loading={busy}
                variant={signedAll ? "success" : "warning"}
                icon={BadgeCheck}
                wideConfirm
            />
            <ConfirmActionModal
                open={confirm === "withdraw"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => {
                    if (details) await act(() => substitutionService.withdraw(details.id), t("substitutionCard.toast.withdrawn"));
                    setConfirm(null);
                }}
                title={t("substitutionCard.confirm.withdrawTitle")}
                message={t("substitutionCard.confirm.withdrawMessage")}
                confirmLabel={t("substitutionCard.buttons.withdraw")}
                loadingLabel={t("substitutionCard.confirm.processing")}
                loading={busy}
                variant="warning"
                icon={Undo2}
            />
            <ConfirmDeleteModal
                open={confirm === "delete"}
                onClose={() => setConfirm(null)}
                onConfirm={async () => {
                    await remove();
                    setConfirm(null);
                }}
                title={t("substitutionCard.confirm.deleteTitle")}
                message={t("substitutionCard.confirm.deleteMessage")}
                loading={busy}
            />
        </div>
    );
}

// ── helpers ──────────────────────────────────────────────────────────────
function toForm(d: SubstitutionDetails): SubstitutionSaveRequest {
    return {
        subject: d.subject,
        reason: d.reasonCode,
        absentUserId: d.absentUserId,
        absentName: d.absentName,
        absentPosition: d.absentPosition,
        absentBranch: d.absentBranch,
        absentUnitId: d.absentUnitId,
        substituteUserId: d.substituteUserId,
        substituteName: d.substituteName,
        substitutePosition: d.substitutePosition,
        substituteBranch: d.substituteBranch,
        substituteUnitId: d.substituteUnitId,
        passportSeriesNumber: d.passportSeriesNumber,
        passportIssuedBy: d.passportIssuedBy,
        inn: d.inn,
        passportIssuedOn: d.passportIssuedOn,
        passportValidUntil: d.passportValidUntil,
        addressRegistration: d.addressRegistration,
        addressResidence: d.addressResidence,
        daysCount: d.daysCount,
        startsOn: d.startsOn,
        endsOn: d.endsOn,
        commissionChairUserId: d.commissionChairUserId,
        commissionChairName: d.commissionChairName,
        commissionChairPosition: d.commissionChairPosition,
        handoverMoment: d.handoverMoment,
        handoverOn: d.handoverOn,
        commissionMembers: d.commissionMembers,
        description: d.description,
    };
}

function msgOf(e: unknown, t: TFunction): string {
    return (e as {
        response?: { data?: { message?: string } }
    })?.response?.data?.message || t("substitutionCard.saveFailed");
}

type SetForm = React.Dispatch<React.SetStateAction<SubstitutionSaveRequest>>;

function addMember(setForm: SetForm) {
    setForm((f) => ({...f, commissionMembers: [...f.commissionMembers, {fullName: "", position: ""}]}));
}

function removeMember(setForm: SetForm, i: number) {
    setForm((f) => ({...f, commissionMembers: f.commissionMembers.filter((_, x) => x !== i)}));
}

function updateMember(setForm: SetForm, i: number, patch: Partial<CommissionMember>) {
    setForm((f) => ({...f, commissionMembers: f.commissionMembers.map((m, x) => x === i ? {...m, ...patch} : m)}));
}

function Grid({children}: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

/** Подпись и поле — как в форме СЗ (componentsDocumentsTypes/Field), но без <label>:
 *  внутри бывают кнопки-модалки, и клик по подписи не должен их открывать. */
function Field({label, hint, required, children}: {
    label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-w-0">
            <span className="mb-[5px] text-[11.5px] text-[#4d5a72]">
                {label}{required && <span className="text-[#c0392b]"> *</span>}
            </span>
            {children}
            {hint && <span className="mt-1 text-[11.5px] leading-[1.5] text-[#8b97ab]">{hint}</span>}
        </div>
    );
}

function Input({value, onChange, disabled}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return <input className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}/>;
}

/** Длина ИНН — 14 цифр (КСЗ-ЗМ-15), та же проверка, что и на сервере (SubstitutionService.Validate). */
const INN_LENGTH = 14;

/** ИНН: только цифры, не длиннее 14, со счётчиком «n/14» справа в поле — видно, сколько ещё ввести. */
function InnInput({value, onChange, disabled}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    const len = value.length;
    // Неполный ИНН подсвечиваем: сервер его всё равно не примет при сохранении.
    const tone = len === 0 ? "text-[#a3adbd]" : len === INN_LENGTH ? "text-[#1c7a4d]" : "text-[#c27c0e]";
    return (
        <div className="relative">
            <input className={`${FIELD} pr-14`} value={value} disabled={disabled}
                   inputMode="numeric" maxLength={INN_LENGTH} autoComplete="off"
                   onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, INN_LENGTH))}/>
            <span
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold tabular-nums ${tone}`}>
                {len}/{INN_LENGTH}
            </span>
        </div>
    );
}

/** Дата — через календарь-модалку проекта. В форме хранится ISO (гггг-мм-дд), в календаре — дд.мм.гггг. */
function DateInput({value, onChange, disabled}: {
    value?: string | null;
    onChange: (v: string | null) => void;
    disabled?: boolean
}) {
    const d = parseDate(value ? value.slice(0, 10) : null);
    return (
        <DatePickerInput modal accent="blue" disabled={disabled}
                         value={d ? formatDDMMYYYY(d) : ""}
                         onChange={(v) => onChange(parseDDMMYYYYToISO(v) || null)}/>
    );
}

/** Выбор сотрудника: пока не выбран — кнопка поиска, выбран — строка с аватаркой (как у согласующих СЗ). */
function UserField({users, value, onChange, disabled, fallbackName, fallbackPosition, excludeId}: {
    users: PickableUser[];
    value: number | null;
    onChange: (u: PickableUser | null) => void;
    disabled?: boolean;
    fallbackName?: string | null;
    fallbackPosition?: string | null;
    excludeId?: number;
}) {
    const {t} = useTranslation();
    return (
        <SubstitutionPersonField users={users} value={value} onChange={onChange} disabled={disabled}
                                 fallbackName={fallbackName} fallbackPosition={fallbackPosition}
                                 excludeId={excludeId}
                                 placeholder={t("substitutionCard.fields.findEmployee")}
                                 modalTitle={t("substitutionCard.fields.selectEmployeeTitle")}
                                 searchPlaceholder={t("substitutionCard.fields.findEmployee")}
                                 clearLabel={t("substitutionCard.fields.clearEmployee")}/>
    );
}

/** Дата и время создания: дд.мм.гггг чч:мм по местному времени. */
function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Выбор подразделения в модалке со списком и поиском. */
function UnitField({value, onChange, options, disabled}: {
    value: string | null;
    onChange: (v: string | null) => void;
    options: { key: string; label: string }[];
    disabled?: boolean;
}) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.key === value);
    return (
        <>
            <button type="button" disabled={disabled} onClick={() => setOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none hover:bg-[#f6f8fb] focus:border-[#2f68f5] disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]">
                <span className="flex min-w-0 items-center gap-2">
                    <Building2 size={14} className="flex-none text-[#a3adbd]"/>
                    <span className={`truncate ${selected ? "text-[#1c2740]" : "text-[#a3adbd]"}`}>
                        {selected?.label ?? t("substitutionCard.fields.unitPlaceholder")}
                    </span>
                </span>
                {selected && !disabled ? (
                    <span role="button" tabIndex={0}
                          onClick={(e) => {
                              e.stopPropagation();
                              onChange(null);
                          }}
                          onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                  e.stopPropagation();
                                  onChange(null);
                              }
                          }}
                          className="flex-none cursor-pointer text-[#c3cbdb] hover:text-[#8b97ab]">
                        <X size={14}/>
                    </span>
                ) : (
                    <ChevronDown size={15} className="flex-none text-[#a3adbd]"/>
                )}
            </button>
            <TreeSingleSelectModal open={open} onClose={() => setOpen(false)}
                                   title={t("substitutionCard.fields.selectUnitTitle")}
                                   searchPlaceholder={t("substitutionCard.fields.searchUnit")}
                                   options={options} selectedKey={value}
                                   onSelect={onChange} accent="blue"/>
        </>
    );
}

/** Выпадающий список проекта (как в Реестре СЗ). У него нет disabled — блокируем оболочкой. */
function Select({value, onChange, options, disabled}: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
    disabled?: boolean;
}) {
    return (
        <div className={disabled ? "pointer-events-none opacity-60" : ""}>
            <SelectDropdown className="w-full" minWidth="100%" options={options} value={value}
                            onChange={onChange} accent="blue"/>
        </div>
    );
}
