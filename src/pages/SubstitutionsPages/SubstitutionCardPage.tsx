import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {ArrowLeft, Plus, Trash2} from "lucide-react";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {
    substitutionService, REASON_LABEL, HANDOVER_LABEL,
    type SubstitutionSaveRequest, type SubstitutionReason, type HandoverMoment,
    type CommissionMember, type SubstitutionDetails,
} from "@/service/substitutionService/substitutionService.ts";

const empty: SubstitutionSaveRequest = {
    subject: "", reason: "Other", absentName: "", substituteName: "",
    handoverMoment: "EndOfDay", commissionMembers: [],
};

export function SubstitutionCardPage() {
    const {id} = useParams<{id: string}>();
    const isNew = !id || id === "new";
    const navigate = useNavigate();

    const [users, setUsers] = useState<PickableUser[]>([]);
    const [form, setForm] = useState<SubstitutionSaveRequest>(empty);
    const [details, setDetails] = useState<SubstitutionDetails | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!isNew);

    useEffect(() => {
        userService.lookup().then((list) => setUsers(list.map((u) => ({
            id: u.id, fullName: u.fullName, position: u.position ?? null,
            orgUnit: u.orgUnit ?? null, orgUnitId: u.orgUnitId ?? null,
            isBoardMember: u.isBoardMember ?? false, isUnitHead: u.isUnitHead ?? false,
        })))).catch(() => {});
    }, []);

    useEffect(() => {
        if (isNew) return;
        substitutionService.get(Number(id))
            .then((d) => { setDetails(d); setForm(toForm(d)); })
            .catch(() => setError("Не удалось загрузить заявку"))
            .finally(() => setLoading(false));
    }, [id, isNew]);

    const editable = isNew || details?.status === "Draft" || details?.status === "Rejected";
    const set = <K extends keyof SubstitutionSaveRequest>(k: K, v: SubstitutionSaveRequest[K]) =>
        setForm((f) => ({...f, [k]: v}));

    const days = useMemo(() => {
        if (!form.startsOn || !form.endsOn) return null;
        const a = new Date(form.startsOn), b = new Date(form.endsOn);
        const n = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
        return n > 0 ? n : null;
    }, [form.startsOn, form.endsOn]);

    async function saveDraft(): Promise<number | null> {
        setBusy(true); setError(null);
        try {
            const d = isNew ? await substitutionService.create(form)
                            : await substitutionService.update(Number(id), form);
            if (isNew) { navigate(`/substitutions/${d.id}`, {replace: true}); }
            else { setDetails(d); setForm(toForm(d)); }
            return d.id;
        } catch (e) { setError(msgOf(e)); return null; }
        finally { setBusy(false); }
    }

    async function submit() {
        const sid = await saveDraft();
        if (sid == null) return;
        setBusy(true); setError(null);
        try { const d = await substitutionService.submit(sid); setDetails(d); setForm(toForm(d)); }
        catch (e) { setError(msgOf(e)); }
        finally { setBusy(false); }
    }

    async function act(fn: () => Promise<SubstitutionDetails>) {
        setBusy(true); setError(null);
        try { const d = await fn(); setDetails(d); setForm(toForm(d)); }
        catch (e) { setError(msgOf(e)); }
        finally { setBusy(false); }
    }

    if (loading) return <div className="p-6 text-[13px] text-[#8b97ab]">Загрузка…</div>;

    return (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 pt-5 pb-16">
            <button type="button" onClick={() => navigate("/substitutions")}
                    className="flex items-center gap-1.5 text-[13px] text-[#2f68f5] bg-transparent border-none cursor-pointer hover:underline mb-2">
                <ArrowLeft size={16}/> Заявки на замещение
            </button>
            <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">
                        {isNew ? "Новая заявка на замещение" : (details?.regNumber ?? "Заявка на замещение")}
                    </h1>
                    {details && <div className="mt-1 text-[12.5px] text-[#8b97ab]">Статус: {details.statusTitle}</div>}
                </div>
            </div>

            {details?.passportExpiresBeforeEnd && (
                <div className="mt-3 rounded-[10px] border border-[#f0c8c0] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    Внимание: срок действия паспорта замещающего истекает раньше окончания замещения.
                </div>
            )}
            {error && <div className="mt-3 text-[13px] text-[#c0392b]">{error}</div>}

            <div className="mt-4 flex flex-col gap-4">
                {/* Блок 1 */}
                <Section title="Общие сведения">
                    <Grid>
                        <Field label="Тема" required>
                            <Input value={form.subject} disabled={!editable} onChange={(v) => set("subject", v)}/>
                        </Field>
                        <Field label="Причина замещения" required>
                            <Select value={form.reason} disabled={!editable}
                                    onChange={(v) => set("reason", v as SubstitutionReason)}
                                    options={Object.entries(REASON_LABEL)}/>
                        </Field>
                    </Grid>
                </Section>

                {/* Блок 2 */}
                <Section title="Отсутствующий сотрудник">
                    <Grid>
                        <Field label="Сотрудник">
                            <UserPicker users={users} value={form.absentUserId ?? null} disabled={!editable} clearable
                                        placeholder="Найти сотрудника"
                                        onChange={(u) => setForm((f) => ({...f, absentUserId: u?.id ?? null,
                                            absentName: u?.fullName ?? f.absentName, absentPosition: u?.position ?? f.absentPosition}))}/>
                        </Field>
                        <Field label="ФИО (если не из справочника)">
                            <Input value={form.absentName} disabled={!editable} onChange={(v) => set("absentName", v)}/>
                        </Field>
                        <Field label="Должность">
                            <Input value={form.absentPosition ?? ""} disabled={!editable} onChange={(v) => set("absentPosition", v)}/>
                        </Field>
                        <Field label="Филиал">
                            <Input value={form.absentBranch ?? ""} disabled={!editable} onChange={(v) => set("absentBranch", v)}/>
                        </Field>
                    </Grid>
                </Section>

                {/* Блок 3 */}
                <Section title="Замещающий сотрудник">
                    <Grid>
                        <Field label="Сотрудник">
                            <UserPicker users={users} value={form.substituteUserId ?? null} disabled={!editable} clearable
                                        placeholder="Найти сотрудника"
                                        onChange={(u) => setForm((f) => ({...f, substituteUserId: u?.id ?? null,
                                            substituteName: u?.fullName ?? f.substituteName, substitutePosition: u?.position ?? f.substitutePosition}))}/>
                        </Field>
                        <Field label="ФИО (если не из справочника)">
                            <Input value={form.substituteName} disabled={!editable} onChange={(v) => set("substituteName", v)}/>
                        </Field>
                        <Field label="Должность">
                            <Input value={form.substitutePosition ?? ""} disabled={!editable} onChange={(v) => set("substitutePosition", v)}/>
                        </Field>
                        <Field label="Филиал">
                            <Input value={form.substituteBranch ?? ""} disabled={!editable} onChange={(v) => set("substituteBranch", v)}/>
                        </Field>
                        <Field label="Серия и номер паспорта">
                            <Input value={form.passportSeriesNumber ?? ""} disabled={!editable} onChange={(v) => set("passportSeriesNumber", v)}/>
                        </Field>
                        <Field label="Кем выдан">
                            <Input value={form.passportIssuedBy ?? ""} disabled={!editable} onChange={(v) => set("passportIssuedBy", v)}/>
                        </Field>
                        <Field label="ИНН (14 цифр)">
                            <Input value={form.inn ?? ""} disabled={!editable} onChange={(v) => set("inn", v)}/>
                        </Field>
                        <Field label="Дата выдачи паспорта">
                            <DateInput value={form.passportIssuedOn} disabled={!editable} onChange={(v) => set("passportIssuedOn", v)}/>
                        </Field>
                        <Field label="Паспорт действителен до">
                            <DateInput value={form.passportValidUntil} disabled={!editable} onChange={(v) => set("passportValidUntil", v)}/>
                        </Field>
                        <Field label="Адрес по прописке">
                            <Input value={form.addressRegistration ?? ""} disabled={!editable} onChange={(v) => set("addressRegistration", v)}/>
                        </Field>
                        <Field label="Адрес проживания">
                            <Input value={form.addressResidence ?? ""} disabled={!editable} onChange={(v) => set("addressResidence", v)}/>
                        </Field>
                    </Grid>
                </Section>

                {/* Блок 4 */}
                <Section title="Период замещения">
                    <Grid>
                        <Field label="Дата начала" required>
                            <DateInput value={form.startsOn} disabled={!editable} onChange={(v) => set("startsOn", v)}/>
                        </Field>
                        <Field label="Дата окончания" required>
                            <DateInput value={form.endsOn} disabled={!editable} onChange={(v) => set("endsOn", v)}/>
                        </Field>
                        <Field label="Календарных дней">
                            <div className="h-9 flex items-center text-[13px] text-[#374253]">{days ?? "—"}</div>
                        </Field>
                    </Grid>
                </Section>

                {/* Блок 5 */}
                <Section title="Комиссия приёма-передачи">
                    <Grid>
                        <Field label="Председатель комиссии">
                            <UserPicker users={users} value={form.commissionChairUserId ?? null} disabled={!editable} clearable
                                        placeholder="Найти сотрудника"
                                        onChange={(u) => setForm((f) => ({...f, commissionChairUserId: u?.id ?? null,
                                            commissionChairName: u?.fullName ?? f.commissionChairName, commissionChairPosition: u?.position ?? f.commissionChairPosition}))}/>
                        </Field>
                        <Field label="Должность председателя">
                            <Input value={form.commissionChairPosition ?? ""} disabled={!editable} onChange={(v) => set("commissionChairPosition", v)}/>
                        </Field>
                        <Field label="Момент приёма-передачи">
                            <div className="flex items-center gap-4 h-9">
                                {(Object.entries(HANDOVER_LABEL) as [HandoverMoment, string][]).map(([v, label]) => (
                                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                        <input type="radio" name="handover" disabled={!editable}
                                               checked={form.handoverMoment === v} onChange={() => set("handoverMoment", v)}/>
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </Field>
                        <Field label="День приёма-передачи">
                            <DateInput value={form.handoverOn} disabled={!editable} onChange={(v) => set("handoverOn", v)}/>
                        </Field>
                    </Grid>

                    <div className="mt-3">
                        <div className="text-[12.5px] font-semibold text-[#55617a] mb-1.5">Члены комиссии</div>
                        <div className="flex flex-col gap-2">
                            {form.commissionMembers.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex-1"><UserPicker users={users} value={m.userId ?? null} disabled={!editable} clearable
                                        placeholder="Найти сотрудника"
                                        onChange={(u) => updateMember(setForm, i, {userId: u?.id ?? null,
                                            fullName: u?.fullName ?? m.fullName, position: u?.position ?? m.position})}/></div>
                                    <input className="flex-1 h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px]"
                                           placeholder="Должность" disabled={!editable} value={m.position ?? ""}
                                           onChange={(e) => updateMember(setForm, i, {position: e.target.value})}/>
                                    {editable && (
                                        <button type="button" onClick={() => removeMember(setForm, i)}
                                                className="p-1.5 text-[#c0392b] bg-transparent border-none cursor-pointer"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {editable && (
                            <button type="button" onClick={() => addMember(setForm)}
                                    className="mt-2 flex items-center gap-1.5 text-[13px] text-[#2f68f5] bg-transparent border-none cursor-pointer hover:underline">
                                <Plus size={15}/> Добавить члена комиссии
                            </button>
                        )}
                    </div>
                </Section>

                {/* Блок 6 */}
                <Section title="Прочее">
                    <Field label="Описание">
                        <textarea className="w-full min-h-[80px] px-3 py-2 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5]"
                                  disabled={!editable} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)}/>
                    </Field>
                </Section>

                {/* Действия */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {editable && (
                        <>
                            <button type="button" onClick={() => void saveDraft()} disabled={busy}
                                    className="h-10 px-4 rounded-[10px] border border-[#d5dbe6] bg-white text-[14px] font-medium text-[#374253] cursor-pointer hover:bg-[#f4f6fa] disabled:opacity-50">
                                Сохранить черновик
                            </button>
                            <button type="button" onClick={() => void submit()} disabled={busy}
                                    className="h-10 px-5 rounded-[10px] bg-[#2f68f5] text-white text-[14px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-50">
                                Отправить в УЧР
                            </button>
                        </>
                    )}
                    {details?.status === "OnExecution" && (
                        <button type="button" onClick={() => void act(() => substitutionService.execute(details.id))} disabled={busy}
                                className="h-10 px-5 rounded-[10px] bg-[#1c7a4d] text-white text-[14px] font-semibold cursor-pointer hover:brightness-95 disabled:opacity-50">
                            Исполнено (приказ оформлен)
                        </button>
                    )}
                    {details && details.status !== "Executed" && details.status !== "Withdrawn" && (
                        <button type="button" onClick={() => void act(() => substitutionService.withdraw(details.id))} disabled={busy}
                                className="h-10 px-4 rounded-[10px] border border-[#f0c8c0] bg-white text-[14px] font-medium text-[#c0392b] cursor-pointer hover:bg-[#fbeae7] disabled:opacity-50">
                            Отозвать
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
        subject: d.subject, reason: d.reasonCode,
        absentUserId: d.absentUserId, absentName: d.absentName, absentPosition: d.absentPosition,
        absentBranch: d.absentBranch, absentUnitId: d.absentUnitId,
        substituteUserId: d.substituteUserId, substituteName: d.substituteName, substitutePosition: d.substitutePosition,
        substituteBranch: d.substituteBranch, substituteUnitId: d.substituteUnitId,
        passportSeriesNumber: d.passportSeriesNumber, passportIssuedBy: d.passportIssuedBy, inn: d.inn,
        passportIssuedOn: d.passportIssuedOn, passportValidUntil: d.passportValidUntil,
        addressRegistration: d.addressRegistration, addressResidence: d.addressResidence,
        daysCount: d.daysCount, startsOn: d.startsOn, endsOn: d.endsOn,
        commissionChairUserId: d.commissionChairUserId, commissionChairName: d.commissionChairName,
        commissionChairPosition: d.commissionChairPosition, handoverMoment: d.handoverMoment, handoverOn: d.handoverOn,
        commissionMembers: d.commissionMembers, description: d.description,
    };
}
function msgOf(e: unknown): string {
    return (e as {response?: {data?: {message?: string}}})?.response?.data?.message || "Не удалось сохранить";
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

function Section({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white p-4">
            <div className="text-[14px] font-semibold text-[#0f1b2d] mb-3">{title}</div>
            {children}
        </div>
    );
}
function Grid({children}: {children: React.ReactNode}) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}
function Field({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
    return (
        <div>
            <div className="text-[12px] text-[#8b97ab] mb-1">{label}{required && <span className="text-[#c0392b]"> *</span>}</div>
            {children}
        </div>
    );
}
function Input({value, onChange, disabled}: {value: string; onChange: (v: string) => void; disabled?: boolean}) {
    return <input className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5] disabled:bg-[#f6f8fb]"
                  value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}/>;
}
function DateInput({value, onChange, disabled}: {value?: string | null; onChange: (v: string | null) => void; disabled?: boolean}) {
    return <input type="date" className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5] disabled:bg-[#f6f8fb]"
                  value={value ? value.slice(0, 10) : ""} disabled={disabled}
                  onChange={(e) => onChange(e.target.value || null)}/>;
}
function Select({value, onChange, options, disabled}: {value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean}) {
    return (
        <select className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] disabled:bg-[#f6f8fb]"
                value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
            {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
    );
}
