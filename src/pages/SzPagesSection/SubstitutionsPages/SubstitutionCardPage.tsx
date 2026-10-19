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
    type CommissionMember, type SubstitutionDetails, type SubstitutionStatus,
} from "@/service/substitutionService/substitutionService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import type {PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {
    TreeSingleSelectModal
} from "@/components/componentsGeneral/selects/SingleSelects/TreeSingleSelectModal.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {formatDDMMYYYY, parseDDMMYYYYToISO, parseDate} from "@/utils/dateUtils.ts";
import {colors} from "@/design/tokens.ts";
import {SzFormSection} from "@/components/componentsSz/componentsSzCard/form/SzFormSection.tsx";
import {ArrowLeft, ChevronDown, Building2, Plus, Printer, Trash2, X} from "lucide-react";

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
const BTN_SUCCESS = `${BTN} h-[42px] rounded-[11px] border-none bg-[#1c7a4d] px-[18px] text-[13.5px] font-semibold text-white hover:brightness-95`;
const BTN_SECONDARY = `${BTN} h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]`;
const BTN_DANGER = `${BTN} h-10 rounded-[10px] border border-[#f1c9c2] bg-white px-3.5 text-[12.5px] font-semibold text-[#c0392b] hover:bg-[#fbeae7]`;

export function SubstitutionCardPage() {
    const {t, i18n} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();
    const {hasPermission, user} = useAuth();

    const [users, setUsers] = useState<PickableUser[]>([]);
    const [filials, setFilials] = useState<{ id: number; titleRu: string; label: string }[]>([]);
    // Родитель каждого подразделения — чтобы по отделу сотрудника найти его филиал.
    const [unitParents, setUnitParents] = useState<Map<number, number | null>>(new Map());
    const [form, setForm] = useState<SubstitutionSaveRequest>(empty);
    const [details, setDetails] = useState<SubstitutionDetails | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!isNew);
    // Отклонение — своей формой с обязательной причиной. Раньше был window.prompt, и
    // «Отмена» в нём всё равно отклоняла заявку, причём без причины.
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectError, setRejectError] = useState<string | null>(null);
    // Переназначение непройденного этапа (УЧР, администратор): id этапа, кому, почему.
    const [reassignFor, setReassignFor] = useState<number | null>(null);
    const [reassignUserId, setReassignUserId] = useState<number | null>(null);
    const [reassignReason, setReassignReason] = useState("");
    const [reassignError, setReassignError] = useState<string | null>(null);

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
        if (isNew) return;
        substitutionService.get(Number(id))
            .then((d) => {
                setDetails(d);
                setForm(toForm(d));
            })
            .catch(() => setError(t("substitutionCard.loadError")))
            .finally(() => setLoading(false));
    }, [id, isNew, t]);

    // Действующий маршрут — последний круг согласования; прошлые круги только история.
    const currentRound = Math.max(1, ...(details?.approvals ?? []).map((a) => a.round ?? 1));
    const currentSteps = (details?.approvals ?? []).filter((a) => (a.round ?? 1) === currentRound);
    const activeStep = currentSteps.find((a) => a.state === "Active");
    // Решает назначенный на этап или тот, кто его сейчас замещает (GEN-14).
    const canDecide = details?.status === "OnApproval" && !!activeStep && !!user
        && (activeStep.userId === user.id || (details?.actingForUserIds ?? []).includes(activeStep.userId));
    const decidesOnBehalfOf = canDecide && activeStep && activeStep.userId !== user?.id ? activeStep.userName : null;
    // Переназначать этапы могут УЧР (ViewAllSz) и администратор — как проверяет сервер.
    const canManageRoute = hasPermission(PermissionCode.ViewAllSz) || hasPermission(PermissionCode.ManageSystemSettings);

    // УЧР (ViewAllSz) правит заявку после согласования Операционным управлением — в действующем круге.
    const opsApproved = currentSteps.some(
        (a) => a.roleLabel === "Операционное управление" && a.state === "Approved");
    const hrCanEdit = hasPermission(PermissionCode.ViewAllSz) && opsApproved
        && (details?.status === "OnApproval" || details?.status === "OnExecution");
    const editable = isNew || details?.status === "Draft" || details?.status === "Rejected" || hrCanEdit;
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

    async function saveDraft(): Promise<number | null> {
        setBusy(true);
        setError(null);
        try {
            const d = isNew ? await substitutionService.create(form)
                : await substitutionService.update(Number(id), form);
            if (isNew) {
                navigate(`/substitutions/${d.id}`, {replace: true});
            } else {
                setDetails(d);
                setForm(toForm(d));
            }
            return d.id;
        } catch (e) {
            setError(msgOf(e, t));
            return null;
        } finally {
            setBusy(false);
        }
    }

    async function submit() {
        const sid = await saveDraft();
        if (sid == null) return;
        setBusy(true);
        setError(null);
        try {
            const d = await substitutionService.submit(sid);
            setDetails(d);
            setForm(toForm(d));
        } catch (e) {
            setError(msgOf(e, t));
        } finally {
            setBusy(false);
        }
    }

    /** Выполнить действие над заявкой; true — успешно (формы отклонения/переназначения закрываются только тогда). */
    async function act(fn: () => Promise<SubstitutionDetails>): Promise<boolean> {
        setBusy(true);
        setError(null);
        try {
            const d = await fn();
            setDetails(d);
            setForm(toForm(d));
            return true;
        } catch (e) {
            setError(msgOf(e, t));
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
        if (!await act(() => substitutionService.reject(details.id, reason))) return;
        setRejectOpen(false);
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
        if (!await act(() => substitutionService.reassign(details.id, reassignFor, reassignUserId, reason))) return;
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
            navigate("/substitutions");
        } catch (e) {
            setError(msgOf(e, t));
            setBusy(false);
        }
    }

    if (loading) return <div className="p-6 text-[13px] text-[#8b97ab]">{t("general.loading")}</div>;

    const docNumber = details?.regNumber ?? details?.id;
    const statusTone = details ? (STATUS_TONE[details.status] ?? colors.status.draft) : null;

    return (
        <div className="px-7 py-6 max-w-[1700px]">
            <button type="button" onClick={() => navigate("/substitutions")}
                    className="inline-flex items-center gap-1.5 mb-3 border-none bg-transparent text-[13px] font-medium text-[#55617a] cursor-pointer hover:text-[#2f68f5]"
            >
                <ArrowLeft className="w-4 h-4"/> {t("substitutionRequests.title")}
            </button>
            {/* Номер, статус, заголовок — как в шапке карточки СЗ */}
            <div>
                {details && (
                    <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[13px] text-[#55617a]">{docNumber}</span>
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
                            <Input value={form.inn ?? ""} disabled={!editable} onChange={(v) => set("inn", v)}/>
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
                                    <div className="flex-1"><UserField users={users} value={m.userId ?? null}
                                                                    disabled={!editable}
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
                                        <button type="button" onClick={() => removeMember(setForm, i)}
                                                aria-label={t("substitutionCard.buttons.removeMember")}
                                                title={t("substitutionCard.buttons.removeMember")}
                                                className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-[9px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]">
                                            <Trash2 size={16}/>
                                        </button>
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
                                                <span className="font-semibold"
                                                      style={{color}}>{t(`substitutionCard.approvalState.${a.state}`)}</span>
                                            </div>
                                            {a.comment && (
                                                <div className="ml-9 whitespace-pre-wrap text-[12.5px] text-[#55617a]">«{a.comment}»</div>
                                            )}
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

                {/* Решение за отсутствующего: видно, что этап согласуется по замещению (GEN-14). */}
                {decidesOnBehalfOf && (
                    <div className="rounded-[10px] border border-[#cbddff] bg-[#f6f9ff] px-4 py-2.5 text-[13px] text-[#2f68f5]">
                        {t("substitutionCard.actingFor", {name: decidesOnBehalfOf})}
                    </div>
                )}

                {/* Отклонение: причина обязательна, «Отмена» просто закрывает форму. */}
                {details && canDecide && rejectOpen && (
                    <div className="flex flex-col gap-2 rounded-[12px] border border-[#f1c9c2] bg-[#fdf6f5] p-4">
                        <div className="text-[13.5px] font-semibold text-[#1c2740]">{t("substitutionCard.rejectForm.title")}</div>
                        <textarea
                            autoFocus
                            className={`w-full min-h-[88px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] text-[#0f1b2d] ${FOCUS}`}
                            placeholder={t("substitutionCard.rejectForm.placeholder")}
                            value={rejectReason}
                            onChange={(e) => {
                                setRejectReason(e.target.value);
                                if (rejectError && e.target.value.trim()) setRejectError(null);
                            }}/>
                        {rejectError && <div className="text-[12.5px] text-[#c0392b]">{rejectError}</div>}
                        <div className="flex gap-2">
                            <button type="button" className={BTN_DANGER} disabled={busy}
                                    onClick={() => void confirmReject()}>
                                {t("substitutionCard.rejectForm.confirm")}
                            </button>
                            <button type="button" className={BTN_SECONDARY} disabled={busy}
                                    onClick={() => {
                                        setRejectOpen(false);
                                        setRejectError(null);
                                    }}>
                                {t("substitutionCard.rejectForm.cancel")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Действия */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {(isNew || details?.status === "Draft" || details?.status === "Rejected") && (
                        <>
                            <button type="button" onClick={() => void submit()} disabled={busy} className={BTN_PRIMARY}>
                                {t("substitutionCard.buttons.submit")}
                            </button>
                            <button type="button" onClick={() => void saveDraft()} disabled={busy}
                                    className={BTN_SECONDARY}>
                                {t("substitutionCard.buttons.saveDraft")}
                            </button>
                        </>
                    )}
                    {hrCanEdit && (
                        <button type="button" onClick={() => void saveDraft()} disabled={busy} className={BTN_PRIMARY}>
                            {t("substitutionCard.buttons.saveHr")}
                        </button>
                    )}
                    {details && (
                        <>
                            <button type="button"
                                    onClick={() => void substitutionService.print(details.id, "order", t("substitutionCard.files.order", {name: docNumber}))}
                                    className={BTN_SECONDARY}>
                                <Printer size={16}/> {t("substitutionCard.buttons.order")}
                            </button>
                            <button type="button"
                                    onClick={() => void substitutionService.print(details.id, "liability", t("substitutionCard.files.liability", {name: docNumber}))}
                                    className={BTN_SECONDARY}>
                                <Printer size={16}/> {t("substitutionCard.buttons.liability")}
                            </button>
                            <button type="button"
                                    onClick={() => void substitutionService.print(details.id, "card", t("substitutionCard.files.card", {name: docNumber}))}
                                    className={BTN_SECONDARY}>
                                <Printer size={16}/> {t("substitutionCard.buttons.exportAll")}
                            </button>
                        </>
                    )}
                    {details?.status === "OnExecution"
                        && (hasPermission(PermissionCode.ViewAllSz)
                            || details.approvals?.some((a) => a.roleLabel === "УЧР" && a.userId === user?.id)) && (
                            <button type="button"
                                    onClick={() => void act(() => substitutionService.execute(details.id))}
                                    disabled={busy}
                                    className={BTN_SUCCESS}>
                                {t("substitutionCard.buttons.execute")}
                            </button>
                        )}
                    {details?.status === "Draft" && (
                        <button type="button" onClick={() => void remove()} disabled={busy} className={BTN_DANGER}>
                            <Trash2 size={16}/> {t("substitutionCard.buttons.delete")}
                        </button>
                    )}
                    {details && canDecide && (
                            <>
                                <button type="button"
                                        onClick={() => void act(() => substitutionService.approve(details.id))}
                                        disabled={busy || rejectOpen}
                                        className={BTN_SUCCESS}>
                                    {t("substitutionCard.buttons.approve")}
                                </button>
                                <button type="button" onClick={() => {
                                    setRejectOpen(true);
                                    setRejectError(null);
                                }} disabled={busy || rejectOpen} className={BTN_DANGER}>
                                    {t("substitutionCard.buttons.reject")}
                                </button>
                            </>
                        )}
                    {(details?.status === "OnApproval" || details?.status === "OnExecution") && (
                        <button type="button" onClick={() => void act(() => substitutionService.withdraw(details.id))}
                                disabled={busy}
                                className={BTN_DANGER}>
                            {t("substitutionCard.buttons.withdraw")}
                        </button>
                    )}
                </div>
            </div>
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

/** Выбор сотрудника в модалке (поиск + фильтр по подразделениям). */
function UserField({users, value, onChange, disabled}: {
    users: PickableUser[];
    value: number | null;
    onChange: (u: PickableUser | null) => void;
    disabled?: boolean;
}) {
    const {t} = useTranslation();
    return (
        <div className={disabled ? "pointer-events-none opacity-60" : ""}>
            <UserPickerField people={users} value={value} accent="blue" clearable
                             placeholder={t("substitutionCard.fields.findEmployee")}
                             modalTitle={t("substitutionCard.fields.selectEmployeeTitle")}
                             searchPlaceholder={t("substitutionCard.fields.findEmployee")}
                             onChange={(id) => onChange(users.find((u) => u.id === id) ?? null)}
                             onClear={() => onChange(null)}/>
        </div>
    );
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
