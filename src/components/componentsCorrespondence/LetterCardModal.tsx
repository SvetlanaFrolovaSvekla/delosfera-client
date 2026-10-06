/**
 * Карточка письма: реквизиты, резолюция, закрытие.
 *
 * Резолюция и закрытие живут здесь, а не отдельными экранами: и то и другое —
 * действие над письмом, которое человек уже открыл и прочитал.
 */
import {useEffect, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {
    correspondenceService,
    type Letter,
} from "@/service/correspondenceService/correspondenceService.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {FormField, LetterModalShell, ModalActions} from "@/components/componentsCorrespondence/LetterModalShell.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime, formatDaysLeft} from "@/components/componentsGeneral/DataTable.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {
    EditableDateField, EditableTextAreaField,
} from "@/components/componentsGeneral/RequisitesEditFields.tsx";

interface Props {
    id: number;
    onClose: () => void;
    onChanged: () => void;
}

export function LetterCardModal({id, onClose, onChanged}: Props) {
    const {t} = useTranslation();
    const {users} = useUserLookup();

    const [letter, setLetter] = useState<Letter | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    const [mode, setMode] = useState<"view" | "resolve" | "close">("view");
    const [resolution, setResolution] = useState("");
    const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        correspondenceService.get(id)
            .then((data) => {
                setLetter(data);
                setResponsibleUserId(data.responsibleUserId ?? null);
                setDueDate(data.dueDate?.slice(0, 10) ?? "");
            })
            .catch(() => setLoadFailed(true));
    }, [id]);

    const act = async (action: () => Promise<Letter>) => {
        setBusy(true);
        setError(null);
        try {
            setLetter(await action());
            setMode("view");
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? t("correspondencePage.cardModal.actionFailed"));
        } finally {
            setBusy(false);
        }
    };

    const closed = Boolean(letter
        && (letter.status === "Answered" || letter.status === "Closed" || letter.status === "Sent"));

    // Пока письмо не загрузилось: либо крутилка, либо причина, почему его нет
    if (!letter) {
        return (
            <LetterModalShell
                onClose={onClose}
                widthClass="max-w-[760px]"
                header={(
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        {t("correspondencePage.cardModal.title")}
                    </h3>
                )}
            >
                {loadFailed
                    ? (
                        <p className="rounded-lg bg-[#fbe3e3] px-3 py-2 text-[12.5px] text-[#a12b2b]">
                            {t("correspondencePage.cardModal.loadFailed")}
                        </p>
                    )
                    : <Loader label={t("correspondencePage.cardModal.loading")}/>}
            </LetterModalShell>
        );
    }

    const canSend = letter.direction === "Outgoing"
        && (letter.status === "Draft" || letter.status === "Registered");

    const footer = closed ? null : mode === "view" ? (
        <div className="flex flex-wrap gap-2.5">
            {canSend && (
                <PrimaryButton
                    disabled={busy}
                    onClick={() => act(() => correspondenceService.send(letter.id))}
                >
                    {busy ? t("correspondencePage.cardModal.sending") : t("correspondencePage.cardModal.send")}
                </PrimaryButton>
            )}
            <PrimaryButton onClick={() => setMode("resolve")}>
                {letter.resolution
                    ? t("correspondencePage.cardModal.editResolution")
                    : t("correspondencePage.cardModal.resolve")}
            </PrimaryButton>
            <button
                type="button"
                onClick={() => setMode("close")}
                className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]"
            >
                {t("correspondencePage.cardModal.closeWithoutReply")}
            </button>
        </div>
    ) : mode === "resolve" ? (
        <ModalActions
            busy={busy}
            disabled={resolution.trim().length < 3}
            onCancel={() => setMode("view")}
            onSubmit={() => void act(() => correspondenceService.resolve(
                letter.id, resolution.trim(), {
                    responsibleUserId: responsibleUserId ?? undefined,
                    dueDate: dueDate || undefined,
                }))}
            submitLabel={t("correspondencePage.cardModal.saveResolution")}
            busyLabel={t("correspondencePage.cardModal.saving")}
        />
    ) : (
        <ModalActions
            busy={busy}
            disabled={letter.isControlled && note.trim().length < 3}
            onCancel={() => setMode("view")}
            onSubmit={() => void act(() => correspondenceService.close(letter.id, note.trim()))}
            submitLabel={t("correspondencePage.cardModal.closeLetter")}
            busyLabel={t("correspondencePage.cardModal.saving")}
        />
    );

    const resolutionTitle = [
        t("correspondencePage.cardModal.resolution"),
        letter.resolutionBy,
        letter.resolutionAt ? formatDateTime(letter.resolutionAt) : null,
    ].filter(Boolean).join(" · ");

    const executedTitle = [
        t("correspondencePage.cardModal.executed"),
        letter.executedAt ? formatDateTime(letter.executedAt) : null,
    ].filter(Boolean).join(" · ");

    return (
        <LetterModalShell
            onClose={onClose}
            widthClass="max-w-[760px]"
            footer={footer}
            header={(
                <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] text-[#8593a8]">
                            {letter.regNumber ?? t("correspondencePage.draft")}
                        </span>
                        <Badge tone="neutral">{t(`correspondencePage.directionSingular.${letter.direction}`)}</Badge>
                        {letter.category !== "Ordinary" && (
                            <Badge tone={letter.isOverdue ? "bad" : "warn"}>
                                {t(`correspondencePage.categoriesFull.${letter.category}`)}
                            </Badge>
                        )}
                        <Badge tone={closed ? "good" : letter.isOverdue ? "bad" : "info"}>
                            {t(`correspondencePage.statuses.${letter.status}`)}
                        </Badge>
                    </div>
                    <h3 className="m-0 text-[17px] font-semibold leading-snug text-[#101a2c]">
                        {letter.subject}
                    </h3>
                </div>
            )}
        >
            <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-3">
                    <ReadOnlyField
                        label={t("correspondencePage.cardModal.fields.correspondent")}
                        value={letter.correspondentTitle || "—"}
                    />
                </div>
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.registered")}
                    value={formatDate(letter.registeredOn)}
                />
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.theirNumberDate")}
                    value={letter.theirNumber
                        ? t("correspondencePage.cardModal.theirNumberFrom", {
                            number: letter.theirNumber,
                            date: formatDate(letter.theirDate),
                        })
                        : "—"}
                />
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.method")}
                    value={t(`correspondencePage.delivery.${letter.deliveryMethod}`)}
                />
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.sheets")}
                    value={letter.sheetCount?.toString() || "—"}
                />
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.executor")}
                    value={letter.responsibleName || "—"}
                />
                <ReadOnlyField
                    label={t("correspondencePage.cardModal.fields.unit")}
                    value={letter.responsibleUnit || "—"}
                />
                {letter.dueDate && (
                    <ReadOnlyField
                        label={t("correspondencePage.cardModal.fields.due")}
                        value={`${formatDate(letter.dueDate)} · ${formatDaysLeft(letter.daysLeft, t)}`}
                        highlighted={letter.isOverdue}
                    />
                )}
                {letter.inReplyToNumber && (
                    <ReadOnlyField
                        label={t("correspondencePage.cardModal.fields.inReplyTo")}
                        value={letter.inReplyToNumber}
                    />
                )}
                {letter.replyCount > 0 && (
                    <ReadOnlyField
                        label={t("correspondencePage.cardModal.fields.replies")}
                        value={String(letter.replyCount)}
                    />
                )}
            </div>

            {letter.summary && (
                <Block title={t("correspondencePage.cardModal.summary")}>{letter.summary}</Block>
            )}

            {letter.enclosures && (
                <Block title={t("correspondencePage.cardModal.enclosures")}>{letter.enclosures}</Block>
            )}

            {letter.resolution && (
                <Block title={resolutionTitle}>{letter.resolution}</Block>
            )}

            {letter.executionNote && (
                <Block title={executedTitle} tone="good">{letter.executionNote}</Block>
            )}

            {error && (
                <p className="mb-3 rounded-lg bg-[#fbe3e3] px-3 py-2 text-[12.5px] text-[#a12b2b]">{error}</p>
            )}

            {!closed && mode === "resolve" && (
                <div className="flex flex-col gap-3.5 border-t border-[#eef2f7] pt-4">
                    <EditableTextAreaField
                        label={t("correspondencePage.cardModal.resolutionLabel")}
                        value={resolution}
                        onChange={setResolution}
                        placeholder={t("correspondencePage.cardModal.resolutionPlaceholder")}
                        required
                    />
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <FormField label={t("correspondencePage.cardModal.fields.executor")}>
                            <UserPickerField
                                people={users}
                                value={responsibleUserId}
                                onChange={setResponsibleUserId}
                                placeholder={t("correspondencePage.cardModal.keepExecutor")}
                                modalTitle={t("correspondencePage.executorModalTitle")}
                                searchPlaceholder={t("correspondencePage.executorSearch")}
                                clearable
                                onClear={() => setResponsibleUserId(null)}
                            />
                        </FormField>
                        <EditableDateField
                            label={t("correspondencePage.cardModal.dueLabel")}
                            value={dueDate}
                            onChange={setDueDate}
                        />
                    </div>
                </div>
            )}

            {!closed && mode === "close" && (
                <div className="flex flex-col gap-2 border-t border-[#eef2f7] pt-4">
                    {letter.isControlled && (
                        <p className="m-0 text-[12.5px] text-[#b3730a]">
                            {t("correspondencePage.cardModal.controlledHint")}
                        </p>
                    )}
                    <EditableTextAreaField
                        label={t("correspondencePage.cardModal.closeNoteLabel")}
                        value={note}
                        onChange={setNote}
                        required={letter.isControlled}
                    />
                </div>
            )}
        </LetterModalShell>
    );
}

function Block({title, children, tone}: {
    title: string; children: ReactNode; tone?: "good";
}) {
    return (
        <div className="mb-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                {title}
            </div>
            <p className={`m-0 whitespace-pre-wrap rounded-[10px] p-3.5 text-[13.5px] leading-[1.6]
                ${tone === "good" ? "bg-[#e6f4ec] text-[#1c4d35]" : "bg-[#f7f9fc] text-[#101a2c]"}`}>
                {children}
            </p>
        </div>
    );
}

function PrimaryButton({children, onClick, disabled}: {
    children: ReactNode; onClick: () => void; disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-9 cursor-pointer rounded-[9px] border-none bg-[#4e57d6] px-5 text-[12.5px] font-semibold text-white hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {children}
        </button>
    );
}
