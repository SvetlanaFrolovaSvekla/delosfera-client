import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {poaService, type Poa, type PoaHolderKind} from "@/service/poaService/poaService.ts";
import {useUserLookup, userLabel} from "@/hooks/useUserLookup.ts";

/**
 * Выдача доверенности.
 *
 * Поля идут в том порядке, в каком их читают в самом документе: кто доверяет,
 * кому, на что, на какой срок. Порядок в форме и в бумаге совпадает не для
 * красоты — заполняют её, глядя в проект доверенности.
 */

interface Props {
    poa: Poa | null;
    onClose: () => void;
    onSaved: () => void;
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Год — обычный срок доверенности в банке; дальше правят руками. */
function yearAhead(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
}

export function PoaEditModal({poa, onClose, onSaved}: Props) {
    const {users} = useUserLookup();

    const [issuedOn, setIssuedOn] = useState(poa?.issuedOn.slice(0, 10) ?? today());
    const [grantorUserId, setGrantorUserId] = useState<number | "">(poa?.grantorUserId ?? "");
    const [holderKind, setHolderKind] = useState<PoaHolderKind>(poa?.holderKind ?? "Employee");
    const [holderUserId, setHolderUserId] = useState<number | "">(poa?.holderUserId ?? "");
    const [holderName, setHolderName] = useState(poa?.holderName ?? "");
    const [holderPosition, setHolderPosition] = useState(poa?.holderPosition ?? "");
    const [identityDocument, setIdentityDocument] = useState(poa?.holderIdentityDocument ?? "");
    const [powers, setPowers] = useState(poa?.powers ?? "");
    const [allowsDelegation, setAllowsDelegation] = useState(poa?.allowsDelegation ?? false);
    const [amountLimit, setAmountLimit] = useState(poa?.amountLimit?.toString() ?? "");
    const [amountCurrency, setAmountCurrency] = useState(poa?.amountCurrency ?? "KGS");
    const [validFrom, setValidFrom] = useState(poa?.validFrom.slice(0, 10) ?? today());
    const [validTo, setValidTo] = useState(poa?.validTo.slice(0, 10) ?? yearAhead());
    const [originalLocation, setOriginalLocation] = useState(poa?.originalLocation ?? "");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    /**
     * Выбрали сотрудника — подставляем ФИО и должность. В доверенности они
     * фиксируются на дату выдачи, но набирать их заново, когда система уже знает,
     * незачем; поправить руками всё равно можно.
     */
    const pickEmployee = (id: number | "") => {
        setHolderUserId(id);
        if (id === "") return;

        const user = users.find((u) => u.id === id);
        if (!user) return;

        setHolderName(user.fullName);
        setHolderPosition(user.position ?? "");
    };

    const submit = async () => {
        if (grantorUserId === "") {
            setError("Выберите доверителя.");
            return;
        }
        if (holderKind === "Employee" && holderUserId === "") {
            setError("Выберите сотрудника.");
            return;
        }
        if (holderName.trim().length < 3) {
            setError("Укажите, кому выдаётся доверенность.");
            return;
        }
        if (powers.trim().length < 5) {
            setError("Укажите полномочия по доверенности.");
            return;
        }
        if (validTo < validFrom) {
            setError("Дата окончания раньше даты начала.");
            return;
        }

        const limit = amountLimit.trim() ? Number(amountLimit.replace(",", ".")) : null;
        if (limit !== null && (Number.isNaN(limit) || limit <= 0)) {
            setError("Предельная сумма должна быть числом больше нуля.");
            return;
        }

        setSaving(true);
        setError(null);

        const request = {
            issuedOn,
            grantorUserId: grantorUserId as number,
            holderKind,
            holderUserId: holderKind === "Employee" ? (holderUserId as number) : null,
            holderName: holderName.trim(),
            holderPosition: holderPosition.trim() || null,
            holderIdentityDocument: identityDocument.trim() || null,
            powers: powers.trim(),
            allowsDelegation,
            amountLimit: limit,
            amountCurrency: limit !== null ? amountCurrency : null,
            validFrom,
            validTo,
            originalLocation: originalLocation.trim() || null,
        };

        try {
            if (poa) await poaService.update(poa.id, request);
            else await poaService.create(request);
            onSaved();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось сохранить.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <h2 className="text-[19px] font-semibold text-[#101a2c]">
                        {poa ? "Изменить доверенность" : "Выдать доверенность"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <Group title="От кого">
                        <Select
                            label="Доверитель"
                            value={grantorUserId}
                            onChange={setGrantorUserId}
                            options={users.map((u) => ({value: u.id, label: userLabel(u)}))}
                        />
                        <Input label="Дата выдачи" type="date" value={issuedOn} onChange={setIssuedOn}/>
                    </Group>

                    <Group title="Кому">
                        <div className="col-span-2">
                            <Label>Представитель</Label>
                            <div className="flex gap-2">
                                {(["Employee", "External"] as PoaHolderKind[]).map((kind) => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setHolderKind(kind)}
                                        className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                                            ${holderKind === kind
                                            ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                                            : "border-[#e1e7ef] text-[#4d5a72]"}`}
                                    >
                                        {kind === "Employee" ? "Сотрудник банка" : "Стороннее лицо"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {holderKind === "Employee" && (
                            <Select
                                label="Сотрудник"
                                value={holderUserId}
                                onChange={pickEmployee}
                                options={users.map((u) => ({value: u.id, label: userLabel(u)}))}
                                wide
                            />
                        )}

                        <Input label="ФИО в доверенности" value={holderName} onChange={setHolderName} wide/>
                        <Input label="Должность" value={holderPosition} onChange={setHolderPosition} wide/>
                        <Input
                            label="Документ, удостоверяющий личность"
                            value={identityDocument}
                            onChange={setIdentityDocument}
                            placeholder="Паспорт ID 0000000, выдан…"
                            wide
                        />
                    </Group>

                    <Group title="На что">
                        <div className="col-span-2">
                            <Label>Полномочия</Label>
                            <textarea
                                value={powers}
                                onChange={(event) => setPowers(event.target.value)}
                                rows={5}
                                placeholder="Как записано в самом документе — спор решается по формулировке."
                                className="w-full resize-y rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                           text-[14px] outline-none transition focus:border-[#2f68f5]"
                            />
                        </div>

                        <Input
                            label="Предельная сумма"
                            value={amountLimit}
                            onChange={setAmountLimit}
                            placeholder="не ограничена"
                        />
                        <Input label="Валюта" value={amountCurrency} onChange={setAmountCurrency}/>

                        <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[13.5px] text-[#4d5a72]">
                            <input
                                type="checkbox"
                                checked={allowsDelegation}
                                onChange={(event) => setAllowsDelegation(event.target.checked)}
                            />
                            С правом передоверия
                        </label>
                    </Group>

                    <Group title="Срок и оригинал">
                        <Input label="Действует с" type="date" value={validFrom} onChange={setValidFrom}/>
                        <Input label="Действует по" type="date" value={validTo} onChange={setValidTo}/>
                        <Input
                            label="Где хранится оригинал"
                            value={originalLocation}
                            onChange={setOriginalLocation}
                            placeholder="Юридическое управление, сейф 2"
                            wide
                        />
                    </Group>
                </div>

                {error && <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>}

                <div className="mt-5 flex justify-end gap-2 border-t border-[#eef2f7] pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={submit}
                        className="rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium text-white
                                   transition hover:bg-[#2554cc] disabled:opacity-60"
                    >
                        {saving ? "Сохраняем…" : "Сохранить проект"}
                    </button>
                </div>

                <p className="mt-2 text-right text-[12px] text-[#8593a8]">
                    Номер по книге присваивается при выдаче, а не сейчас.
                </p>
            </div>
        </div>,
        document.body,
    );
}

function Group({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <fieldset className="rounded-[12px] border border-[#e1e7ef] p-4">
            <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                {title}
            </legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
        </fieldset>
    );
}

function Label({children}: {children: React.ReactNode}) {
    return (
        <div className="mb-1 text-[12.5px] font-medium text-[#4d5a72]">{children}</div>
    );
}

const FIELD_CLASS =
    "w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2 text-[14px] outline-none " +
    "transition focus:border-[#2f68f5]";

function Input({label, value, onChange, type = "text", placeholder, wide}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    wide?: boolean;
}) {
    return (
        <div className={wide ? "col-span-2" : ""}>
            <Label>{label}</Label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className={FIELD_CLASS}
            />
        </div>
    );
}

function Select({label, value, onChange, options, wide}: {
    label: string;
    value: number | "";
    onChange: (value: number | "") => void;
    options: {value: number; label: string}[];
    wide?: boolean;
}) {
    return (
        <div className={wide ? "col-span-2" : ""}>
            <Label>{label}</Label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value ? Number(event.target.value) : "")}
                className={FIELD_CLASS}
            >
                <option value="">— выберите —</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );
}
