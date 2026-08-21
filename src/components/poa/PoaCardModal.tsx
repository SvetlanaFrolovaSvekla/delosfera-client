import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Pencil, X} from "lucide-react";
import {
    poaService, POA_STATUS_TITLE, HOLDER_KIND_TITLE, type Poa,
} from "@/service/poaService/poaService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {Badge, formatDate, formatDateTime} from "@/components/componentsGeneral/DataTable.tsx";

/**
 * Карточка доверенности.
 *
 * Полномочия показаны целиком и без сокращений: спор о том, входило ли действие
 * в доверенность, решается по формулировке, а не по нашей рубрике, — и читать её
 * будут именно здесь.
 */

interface Props {
    id: number;
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (poa: Poa) => void;
}

export function PoaCardModal({id, canManage, onClose, onChanged, onEdit}: Props) {
    const [poa, setPoa] = useState<Poa | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState(false);
    const [reason, setReason] = useState("");

    useEffect(() => {
        poaService.get(id).then(setPoa).catch(() => setError("Не удалось загрузить доверенность."));
    }, [id]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const act = async (action: () => Promise<Poa>) => {
        setBusy(true);
        setError(null);
        try {
            setPoa(await action());
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось выполнить действие.");
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
            <div
                className="max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {!poa ? (
                    <Loader label="Загружаем…"/>
                ) : (
                    <>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[13px] text-[#8593a8]">
                                        {poa.regNumber ?? "без номера"}
                                    </span>
                                    <Badge tone={poa.status === "Active" ? "good" : poa.status === "Revoked" ? "bad" : "neutral"}>
                                        {POA_STATUS_TITLE[poa.status]}
                                    </Badge>
                                </div>
                                <h2 className="text-[19px] font-semibold text-[#101a2c]">
                                    Доверенность на {poa.holderName}
                                </h2>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                {canManage && poa.status === "Draft" && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(poa)}
                                        aria-label="Изменить"
                                        className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                                    >
                                        <Pencil size={18}/>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Закрыть"
                                    className="rounded-lg p-1.5 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                                >
                                    <X size={20}/>
                                </button>
                            </div>
                        </div>

                        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                            <Field label="Доверитель" value={poa.grantorName}/>
                            <Field label="Выдана" value={formatDate(poa.issuedOn)}/>
                            <Field label="Действует" value={`${formatDate(poa.validFrom)} — ${formatDate(poa.validTo)}`}/>

                            <Field label="Кто представитель" value={HOLDER_KIND_TITLE[poa.holderKind]}/>
                            <Field label="Должность" value={poa.holderPosition}/>
                            <Field label="Подразделение" value={poa.holderUnit}/>

                            {poa.holderIdentityDocument && (
                                <Field label="Документ" value={poa.holderIdentityDocument} wide/>
                            )}

                            {poa.amountLimit !== null && (
                                <Field
                                    label="Предельная сумма"
                                    value={`${poa.amountLimit.toLocaleString("ru-RU")} ${poa.amountCurrency ?? ""}`}
                                />
                            )}
                            <Field label="Передоверие" value={poa.allowsDelegation ? "разрешено" : "не разрешено"}/>

                            {poa.parentRegNumber && (
                                <Field label="Выдана по доверенности" value={poa.parentRegNumber}/>
                            )}
                            {poa.childCount > 0 && (
                                <Field label="Передоверий выдано" value={String(poa.childCount)}/>
                            )}

                            {poa.originalLocation && (
                                <Field label="Оригинал" value={poa.originalLocation} wide/>
                            )}
                            {poa.signedAt && (
                                <Field label="Подписана" value={formatDateTime(poa.signedAt)}/>
                            )}
                        </dl>

                        <div className="mb-5">
                            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">
                                Полномочия
                            </div>
                            <p className="whitespace-pre-wrap rounded-[10px] bg-[#f7f9fc] p-3.5 text-[14px] leading-[1.6] text-[#101a2c]">
                                {poa.powers}
                            </p>
                        </div>

                        {poa.status === "Revoked" && (
                            <div className="mb-5 rounded-[10px] bg-[#fbeae7] p-3.5">
                                <div className="text-[13px] font-semibold text-[#c0392b]">
                                    Отозвана {formatDate(poa.revokedOn)}
                                    {poa.revokedBy && ` · ${poa.revokedBy}`}
                                </div>
                                {poa.revokeReason && (
                                    <p className="mt-1 text-[13.5px] text-[#4d5a72]">{poa.revokeReason}</p>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="mb-3 text-[13px] text-[#c0392b]">{error}</p>
                        )}

                        {canManage && (poa.status === "Draft" || poa.status === "Active") && (
                            <div className="border-t border-[#eef2f7] pt-4">
                                {poa.status === "Draft" && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => act(() => poaService.issue(poa.id))}
                                        className="rounded-[10px] bg-[#1c7a4d] px-4 py-2 text-[14px] font-medium
                                                   text-white transition hover:bg-[#166139] disabled:opacity-60"
                                    >
                                        Выдать и присвоить номер
                                    </button>
                                )}

                                {poa.status === "Active" && !revoking && (
                                    <button
                                        type="button"
                                        onClick={() => setRevoking(true)}
                                        className="rounded-[10px] border border-[#e1e7ef] px-4 py-2 text-[14px]
                                                   text-[#c0392b] transition hover:border-[#c0392b]"
                                    >
                                        Отозвать
                                    </button>
                                )}

                                {revoking && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-[#4d5a72]">
                                            Причина отзыва
                                            {poa.childCount > 0 && (
                                                <span className="ml-2 font-normal text-[#b3730a]">
                                                    вместе с ней будут отозваны {poa.childCount} передоверий
                                                </span>
                                            )}
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                            rows={3}
                                            autoFocus
                                            className="w-full resize-y rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                                       text-[14px] outline-none transition focus:border-[#2f68f5]"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busy || reason.trim().length < 3}
                                                onClick={() => act(() => poaService.revoke(poa.id, reason.trim()))}
                                                className="rounded-[10px] bg-[#c0392b] px-4 py-2 text-[14px] font-medium
                                                           text-white transition hover:bg-[#9c2f23] disabled:opacity-50"
                                            >
                                                Отозвать
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRevoking(false);
                                                    setReason("");
                                                }}
                                                className="rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72]
                                                           transition hover:bg-[#eef2f7]"
                                            >
                                                Отмена
                                            </button>
                                        </div>
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

function Field({label, value, wide}: {label: string; value?: string | null; wide?: boolean}) {
    return (
        <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#8593a8]">{label}</dt>
            <dd className="mt-0.5 text-[13.5px] text-[#101a2c]">{value || "—"}</dd>
        </div>
    );
}
