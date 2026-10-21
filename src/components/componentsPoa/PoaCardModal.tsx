/**
 * Карточка доверенности.
 *
 * Полномочия показаны целиком и без сокращений: спор о том, входило ли действие
 * в доверенность, решается по формулировке, а не по нашей рубрике, - и читать её
 * будут именно здесь.
 */
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {poaService, type Poa} from "@/service/poaService/poaService.ts";
import {toast} from "@/service/toastService.ts";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime} from "@/components/componentsGeneral/DataTable.tsx";
import {Section} from "@/components/componentsGeneral/Section.tsx";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {ModalHeader} from "@/components/componentsGeneral/rubricator/ModalHeader.tsx";
import {ACCENT} from "@/constants/accent.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {PersonRow, personMeta} from "@/components/componentsSubstitutions/SubstitutionPersonField.tsx";
import {FileText, Pencil} from "lucide-react";

interface Props {
    id: number;
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (poa: Poa) => void;
}

const A = ACCENT.violet;

export function PoaCardModal({id, canManage, onClose, onChanged, onEdit}: Props) {
    const {t, i18n} = useTranslation();
    const {users} = useUserLookup();
    const [poa, setPoa] = useState<Poa | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState(false);
    const [reason, setReason] = useState("");
    /** Какое действие ждёт подтверждения */
    const [confirm, setConfirm] = useState<"issue" | "revoke" | null>(null);

    useEffect(() => {
        poaService.get(id)
            .then(setPoa)
            .catch(() => setError(t("poaCard.loadFailed"))); // "Не удалось загрузить доверенность."
    }, [id, t]);

    useEffect(() => {
        // Пока открыта модалка подтверждения, Esc не должен закрывать карточку под ней.
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && !confirm && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose, confirm]);

    const act = async (action: () => Promise<Poa>, onDone: (result: Poa) => void) => {
        setBusy(true);
        setError(null);
        try {
            const result = await action();
            setPoa(result);
            setConfirm(null);
            setRevoking(false);
            setReason("");
            onChanged();
            onDone(result);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message ?? t("poaCard.actionFailed")); // "Не удалось выполнить действие."
        } finally {
            setBusy(false);
        }
    };

    const numberLocale = i18n.language === "en" ? "en-US" : "ru-RU";

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white
                           shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {!poa ? (
                    <>
                        <ModalHeader title="" onClose={onClose}/>
                        {error
                            ? <p className="px-6 py-8 text-center text-[13px] text-[#c0392b]">{error}</p>
                            : <Loader label={t("poaCard.loading" /* "Загружаем…" */)}/>}
                    </>
                ) : (
                    <>
                        {/* "Доверенность на {holderName}" */}
                        <ModalHeader title={t("poaCard.title", {name: poa.holderName})} onClose={onClose}/>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[13px] text-[#8b97ab]">
                                    {/* "без номера" */}
                                    {poa.regNumber ?? t("poaCard.noNumber")}
                                </span>
                                <Badge
                                    tone={poa.status === "Active" ? "good" : poa.status === "Revoked" ? "bad" : "neutral"}>
                                    {/* POA_STATUS_TITLE[poa.status] — Проект / На подписании / Действует / Отозвана / Срок истёк, берём из poaRegistryPage.statuses */}
                                    {t(`poaRegistryPage.statuses.${poa.status}`)}
                                </Badge>

                                {canManage && poa.status === "Draft" && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(poa)}
                                        className={`ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px]
                                                    border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold
                                                    text-[#55617a] transition ${A.hoverSoftBg} ${A.hoverText}`}
                                    >
                                        <Pencil size={14}/>
                                        {/* "Изменить" */}
                                        {t("poaCard.edit")}
                                    </button>
                                )}
                            </div>

                            {/* Доверитель и представитель — с аватаркой-инициалами, как в реестре */}
                            <div className="mb-3.5 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                                <Person
                                    label={t("poaCard.grantor" /* "Доверитель" */)}
                                    name={poa.grantorName}
                                    meta={personMeta(users.find((u) => u.id === poa.grantorUserId))}
                                    href={profileHref(poa.grantorUserId)}
                                />
                                <Person
                                    label={t("poaCard.holder" /* "Кому" */)}
                                    name={poa.holderName}
                                    muted={poa.holderKind === "External"}
                                    // У стороннего лица учётной записи нет - и профиля тоже.
                                    href={profileHref(poa.holderUserId)}
                                />
                            </div>

                            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                                <Field label={t("poaCard.issuedOn" /* "Выдана" */)} value={formatDate(poa.issuedOn)}/>
                                <Field
                                    label={t("poaCard.valid" /* "Действует" */)}
                                    value={`${formatDate(poa.validFrom)} — ${formatDate(poa.validTo)}`}
                                />

                                <Field
                                    label={t("poaCard.holderKind" /* "Кто представитель" */)}
                                    /* HOLDER_KIND_TITLE[poa.holderKind] — "Сотрудник банка" / "Стороннее лицо" */
                                    value={t(`poaCard.holderKinds.${poa.holderKind}`)}
                                />
                                <Field label={t("poaCard.position" /* "Должность" */)} value={poa.holderPosition}/>
                                <Field label={t("poaCard.unit" /* "Подразделение" */)} value={poa.holderUnit}/>

                                {poa.holderIdentityDocument && (
                                    <Field
                                        label={t("poaCard.identityDocument" /* "Документ" */)}
                                        value={poa.holderIdentityDocument}
                                        wide
                                    />
                                )}

                                {poa.amountLimit !== null && (
                                    <Field
                                        label={t("poaCard.amountLimit" /* "Предельная сумма" */)}
                                        value={`${poa.amountLimit.toLocaleString(numberLocale)} ${poa.amountCurrency ?? ""}`}
                                    />
                                )}
                                <Field
                                    label={t("poaCard.delegation" /* "Передоверие" */)}
                                    value={poa.allowsDelegation
                                        ? t("poaCard.delegationAllowed") /* "разрешено" */
                                        : t("poaCard.delegationNotAllowed") /* "не разрешено" */}
                                />

                                {poa.parentRegNumber && (
                                    <Field label={t("poaCard.parent" /* "Выдана по доверенности" */)}
                                           value={poa.parentRegNumber}/>
                                )}
                                {poa.childCount > 0 && (
                                    <Field label={t("poaCard.childCount" /* "Передоверий выдано" */)}
                                           value={String(poa.childCount)}/>
                                )}

                                {poa.originalLocation && (
                                    <Field label={t("poaCard.original" /* "Оригинал" */)} value={poa.originalLocation}
                                           wide/>
                                )}
                                {poa.signedAt && (
                                    <Field label={t("poaCard.signedAt" /* "Подписана" */)}
                                           value={formatDateTime(poa.signedAt)}/>
                                )}
                            </div>

                            <Section
                                icon={<FileText size={16} className={A.text}/>}
                                /* "Полномочия" */
                                title={t("poaCard.powers")}
                                noMarginBottom={poa.status !== "Revoked"}
                            >
                                <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-[#1c2740]">
                                    {poa.powers}
                                </p>
                            </Section>

                            {poa.status === "Revoked" && (
                                <div className="rounded-[10px] bg-[#fbeae7] p-3.5">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-[#c0392b]">
                                        {/* "Отозвана {date}" */}
                                        {t("poaCard.revokedOn", {date: formatDate(poa.revokedOn)})}
                                        {poa.revokedBy && (
                                            <span className="inline-flex items-center gap-1.5 font-medium text-[#4d5a72]">
                                                ·
                                                <Avatar name={poa.revokedBy} size={20}/>
                                                {poa.revokedByUserId ? (
                                                    <Link to={profileHref(poa.revokedByUserId)!}
                                                          className="text-[#7a5ce0] hover:underline underline-offset-2">
                                                        {poa.revokedBy}
                                                    </Link>
                                                ) : poa.revokedBy}
                                            </span>
                                        )}
                                    </div>
                                    {poa.revokeReason && (
                                        <p className="mt-1 text-[13.5px] text-[#4d5a72]">{poa.revokeReason}</p>
                                    )}
                                </div>
                            )}

                            {error && (
                                <p className="mt-3 text-[13px] text-[#c0392b]">{error}</p>
                            )}
                        </div>

                        {canManage && (poa.status === "Draft" || poa.status === "Active") && (
                            <div className="flex-none border-t border-[#eef2f7] px-6 py-4">
                                {poa.status === "Draft" && (
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setError(null);
                                                setConfirm("issue");
                                            }}
                                            className="h-10 cursor-pointer rounded-[10px] bg-[#4e57d6] px-5 text-[13px] font-semibold
                                            text-white transition hover:brightness-[1.06] disabled:cursor-not-allowed
                                            disabled:opacity-60"
                                        >
                                            {/* "Выдать и присвоить номер" */}
                                            {t("poaCard.issue")}
                                        </button>
                                    </div>
                                )}

                                {poa.status === "Active" && !revoking && (
                                    <button
                                        type="button"
                                        onClick={() => setRevoking(true)}
                                        className="h-10 cursor-pointer rounded-[10px] border border-[#e5e9f0] bg-white px-5
                                                   text-[13px] font-semibold text-[#c0392b] transition hover:border-[#c0392b]"
                                    >
                                        {/* "Отозвать" */}
                                        {t("poaCard.revoke")}
                                    </button>
                                )}

                                {revoking && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-semibold text-[#3a4560]">
                                            {/* "Причина отзыва" */}
                                            {t("poaCard.revokeReason")}
                                            {poa.childCount > 0 && (
                                                <span className="ml-2 font-normal text-[#b3730a]">
                                                    {/* "вместе с ней будут отозваны {childCount} передоверий" */}
                                                    {t("poaCard.revokeChildren", {count: poa.childCount})}
                                                </span>
                                            )}
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                            rows={3}
                                            autoFocus
                                            className="w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2
                                                       text-[13px] text-[#1c2740] outline-none transition focus:border-[#c0392b]"
                                        />
                                        <div className="flex gap-2.5">
                                            <button
                                                type="button"
                                                disabled={busy || reason.trim().length < 3}
                                                onClick={() => {
                                                    setError(null);
                                                    setConfirm("revoke");
                                                }}
                                                className="h-9 cursor-pointer rounded-[9px] bg-[#c0392b] px-5 text-[12.5px]
                                                           font-semibold text-white transition hover:bg-[#9c2f23]
                                                           disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {/* "Отозвать" */}
                                                {t("poaCard.revoke")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRevoking(false);
                                                    setReason("");
                                                }}
                                                className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4
                                                           text-[12.5px] font-semibold text-[#55617a] transition-colors
                                                           hover:bg-[#f6f8fb]"
                                            >
                                                {/* "Отмена" */}
                                                {t("general.cancel")}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {poa && (
                    <>
                        {/* "Выдать доверенность?" */}
                        <ConfirmActionModal
                            open={confirm === "issue"}
                            variant="primary"
                            onClose={() => setConfirm(null)}
                            onConfirm={() => void act(
                                () => poaService.issue(poa.id),
                                (result) => toast.success(
                                    t("poaCard.issuedToast"), /* Доверенность выдана */
                                    result.regNumber ? t("poaCard.issuedToastNumber", {number: result.regNumber}) : undefined,
                                ),
                            )}
                            title={t("poaCard.confirmIssueTitle")}
                            message={t("poaCard.confirmIssueMessage", {name: poa.holderName})}
                            confirmLabel={t("poaCard.issue")}
                            loading={busy}
                            error={error}
                        />
                        {/* "Отозвать доверенность?" */}
                        <ConfirmActionModal
                            open={confirm === "revoke"}
                            variant="danger"
                            onClose={() => setConfirm(null)}
                            onConfirm={() => void act(
                                () => poaService.revoke(poa.id, reason.trim()),
                                () => toast.success(t("poaCard.revokedToast")), /* Доверенность отозвана */
                            )}
                            title={t("poaCard.confirmRevokeTitle")}
                            message={poa.childCount > 0
                                ? t("poaCard.confirmRevokeMessageWithChildren", {name: poa.holderName, count: poa.childCount})
                                : t("poaCard.confirmRevokeMessage", {name: poa.holderName})}
                            confirmLabel={t("poaCard.revoke")}
                            loading={busy}
                            error={error}
                        />
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Профиль сотрудника для просмотра (не правка из администрирования). */
function profileHref(userId: number | null | undefined): string | undefined {
    return userId ? `/users/${userId}` : undefined;
}

/** Сотрудник в карточке: подпись и строка с аватаркой, ФИО и должностью · подразделением. */
function Person({label, name, meta, muted, href}: {
    label: string;
    name: string | null;
    meta?: string | null;
    muted?: boolean;
    /** Ссылка на профиль: ФИО становится кликабельным. */
    href?: string;
}) {
    return (
        <div className="flex min-w-0 flex-col">
            <span className="mb-1.5 block text-[12px] font-semibold text-[#3a4560]">{label}</span>
            {name
                ? <PersonRow name={name} meta={meta} muted={muted} nameHref={href}/>
                : (
                    <div className="flex min-h-10 items-center rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] px-3 text-[13px] text-[#1c2740]">
                        —
                    </div>
                )}
        </div>
    );
}

function Field({label, value, wide}: { label: string; value?: string | null; wide?: boolean }) {
    return (
        <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
            <ReadOnlyField label={label} value={value || "—"}/>
        </div>
    );
}
