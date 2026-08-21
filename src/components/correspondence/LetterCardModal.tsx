import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {
    correspondenceService,
    CATEGORY_TITLE, DELIVERY_TITLE, DIRECTION_TITLE, LETTER_STATUS_TITLE,
    type Letter,
} from "@/service/correspondenceService/correspondenceService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime, formatDaysLeft} from "@/components/componentsGeneral/DataTable.tsx";
import {useUserLookup, userLabel} from "@/hooks/useUserLookup.ts";

/**
 * Карточка письма: реквизиты, резолюция, закрытие.
 *
 * Резолюция и закрытие живут здесь, а не отдельными экранами: и то и другое —
 * действие над письмом, которое человек уже открыл и прочитал.
 */

interface Props {
    id: number;
    onClose: () => void;
    onChanged: () => void;
}

export function LetterCardModal({id, onClose, onChanged}: Props) {
    const {users} = useUserLookup();

    const [letter, setLetter] = useState<Letter | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mode, setMode] = useState<"view" | "resolve" | "close">("view");
    const [resolution, setResolution] = useState("");
    const [responsibleUserId, setResponsibleUserId] = useState<number | "">("");
    const [dueDate, setDueDate] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        correspondenceService.get(id)
            .then((data) => {
                setLetter(data);
                setResponsibleUserId(data.responsibleUserId ?? "");
                setDueDate(data.dueDate?.slice(0, 10) ?? "");
            })
            .catch(() => setError("Не удалось загрузить письмо."));
    }, [id]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const act = async (action: () => Promise<Letter>) => {
        setBusy(true);
        setError(null);
        try {
            setLetter(await action());
            setMode("view");
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось выполнить действие.");
        } finally {
            setBusy(false);
        }
    };

    const closed = letter
        && (letter.status === "Answered" || letter.status === "Closed" || letter.status === "Sent");

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {!letter ? (
                    <Loader label="Загружаем…"/>
                ) : (
                    <>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[13px] text-[#8593a8]">
                                        {letter.regNumber ?? "проект"}
                                    </span>
                                    <Badge tone="neutral">{DIRECTION_TITLE[letter.direction]}</Badge>
                                    {letter.category !== "Ordinary" && (
                                        <Badge tone={letter.isOverdue ? "bad" : "warn"}>
                                            {CATEGORY_TITLE[letter.category]}
                                        </Badge>
                                    )}
                                    <Badge tone={closed ? "good" : letter.isOverdue ? "bad" : "info"}>
                                        {LETTER_STATUS_TITLE[letter.status]}
                                    </Badge>
                                </div>
                                <h2 className="text-[18px] font-semibold leading-snug text-[#101a2c]">
                                    {letter.subject}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Закрыть"
                                className="shrink-0 rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                            <Field label="Корреспондент" value={letter.correspondentTitle} wide/>
                            <Field label="Зарегистрировано" value={formatDate(letter.registeredOn)}/>
                            <Field
                                label="Их номер и дата"
                                value={letter.theirNumber
                                    ? `${letter.theirNumber} от ${formatDate(letter.theirDate)}`
                                    : null}
                            />
                            <Field label="Способ" value={DELIVERY_TITLE[letter.deliveryMethod]}/>
                            <Field label="Листов" value={letter.sheetCount?.toString()}/>
                            <Field label="Исполнитель" value={letter.responsibleName}/>
                            <Field label="Подразделение" value={letter.responsibleUnit}/>

                            {letter.dueDate && (
                                <Field
                                    label="Срок ответа"
                                    value={`${formatDate(letter.dueDate)} · ${formatDaysLeft(letter.daysLeft)}`}
                                    alert={letter.isOverdue}
                                />
                            )}
                            {letter.inReplyToNumber && (
                                <Field label="В ответ на" value={letter.inReplyToNumber}/>
                            )}
                            {letter.replyCount > 0 && (
                                <Field label="Ответов" value={String(letter.replyCount)}/>
                            )}
                        </dl>

                        {letter.summary && (
                            <Block title="Краткое изложение">{letter.summary}</Block>
                        )}

                        {letter.enclosures && (
                            <Block title="Приложения">{letter.enclosures}</Block>
                        )}

                        {letter.resolution && (
                            <Block title={`Резолюция · ${letter.resolutionBy ?? ""} · ${formatDateTime(letter.resolutionAt)}`}>
                                {letter.resolution}
                            </Block>
                        )}

                        {letter.executionNote && (
                            <Block title={`Исполнено · ${formatDateTime(letter.executedAt)}`} tone="good">
                                {letter.executionNote}
                            </Block>
                        )}

                        {error && <p className="mb-3 text-[13px] text-[#c0392b]">{error}</p>}

                        {!closed && (
                            <div className="border-t border-[#eef2f7] pt-4">
                                {mode === "view" && (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMode("resolve")}
                                            className="rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium
                                                       text-white transition hover:bg-[#2554cc]"
                                        >
                                            {letter.resolution ? "Изменить резолюцию" : "Вынести резолюцию"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode("close")}
                                            className="rounded-[10px] border border-[#e1e7ef] px-4 py-2 text-[14px]
                                                       text-[#4d5a72] transition hover:border-[#2f68f5]"
                                        >
                                            Закрыть без ответа
                                        </button>
                                    </div>
                                )}

                                {mode === "resolve" && (
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <Label>Резолюция</Label>
                                            <textarea
                                                value={resolution}
                                                onChange={(event) => setResolution(event.target.value)}
                                                rows={3}
                                                autoFocus
                                                placeholder="Кому и что сделать."
                                                className="w-full resize-y rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                                           text-[14px] outline-none transition focus:border-[#2f68f5]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Исполнитель</Label>
                                                <select
                                                    value={responsibleUserId}
                                                    onChange={(event) => setResponsibleUserId(
                                                        event.target.value ? Number(event.target.value) : "")}
                                                    className="w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                                               text-[14px] outline-none focus:border-[#2f68f5]"
                                                >
                                                    <option value="">— не менять —</option>
                                                    {users.map((user) => (
                                                        <option key={user.id} value={user.id}>{userLabel(user)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Срок</Label>
                                                <input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(event) => setDueDate(event.target.value)}
                                                    className="w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                                               text-[14px] outline-none focus:border-[#2f68f5]"
                                                />
                                            </div>
                                        </div>

                                        <Actions
                                            busy={busy}
                                            disabled={resolution.trim().length < 3}
                                            onCancel={() => setMode("view")}
                                            onSubmit={() => act(() => correspondenceService.resolve(
                                                letter.id, resolution.trim(), {
                                                    responsibleUserId: responsibleUserId || undefined,
                                                    dueDate: dueDate || undefined,
                                                }))}
                                            submitLabel="Сохранить резолюцию"
                                        />
                                    </div>
                                )}

                                {mode === "close" && (
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <Label>
                                                Чем закончилось
                                                {letter.isControlled && (
                                                    <span className="ml-2 font-normal text-[#b3730a]">
                                                        письмо на контроле — пояснение обязательно
                                                    </span>
                                                )}
                                            </Label>
                                            <textarea
                                                value={note}
                                                onChange={(event) => setNote(event.target.value)}
                                                rows={3}
                                                autoFocus
                                                className="w-full resize-y rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                                           text-[14px] outline-none transition focus:border-[#2f68f5]"
                                            />
                                        </div>

                                        <Actions
                                            busy={busy}
                                            disabled={letter.isControlled && note.trim().length < 3}
                                            onCancel={() => setMode("view")}
                                            onSubmit={() => act(() => correspondenceService.close(letter.id, note.trim()))}
                                            submitLabel="Закрыть письмо"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

function Field({label, value, wide, alert}: {
    label: string; value?: string | null; wide?: boolean; alert?: boolean;
}) {
    return (
        <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">{label}</dt>
            <dd className={`mt-0.5 text-[13.5px] ${alert ? "font-semibold text-[#c0392b]" : "text-[#101a2c]"}`}>
                {value || "—"}
            </dd>
        </div>
    );
}

function Block({title, children, tone}: {
    title: string; children: React.ReactNode; tone?: "good";
}) {
    return (
        <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                {title}
            </div>
            <p className={`whitespace-pre-wrap rounded-[10px] p-3.5 text-[14px] leading-[1.6]
                ${tone === "good" ? "bg-[#e6f4ec] text-[#1c4d35]" : "bg-[#f7f9fc] text-[#101a2c]"}`}>
                {children}
            </p>
        </div>
    );
}

function Label({children}: {children: React.ReactNode}) {
    return <div className="mb-1 text-[12.5px] font-medium text-[#4d5a72]">{children}</div>;
}

function Actions({busy, disabled, onCancel, onSubmit, submitLabel}: {
    busy: boolean; disabled: boolean; onCancel: () => void; onSubmit: () => void; submitLabel: string;
}) {
    return (
        <div className="flex gap-2">
            <button
                type="button"
                disabled={busy || disabled}
                onClick={onSubmit}
                className="rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium text-white
                           transition hover:bg-[#2554cc] disabled:opacity-50"
            >
                {busy ? "Сохраняем…" : submitLabel}
            </button>
            <button
                type="button"
                onClick={onCancel}
                className="rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
            >
                Отмена
            </button>
        </div>
    );
}
