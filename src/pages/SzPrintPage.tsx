import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {
    PRINT_RESOLUTION_LABEL,
    szPaperService,
    type SzPrintForm,
} from "@/service/szService/szPaperService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

function formatDate(iso: string | null): string {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return d && m && y ? `${d}.${m}.${y}` : "";
}

/**
 * Печатная форма записки с листом согласования (SZ-PAP-02).
 * Верстается под A4: экранная обвязка скрыта при печати, лист согласования
 * оставляет место для подписи там, где виза ещё не поставлена.
 */
export function SzPrintPage() {
    const {id} = useParams<{ id: string }>();
    const [form, setForm] = useState<SzPrintForm | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        szPaperService.printForm(Number(id))
            .then(setForm)
            .catch(() => setError("Не удалось сформировать печатную форму"));
    }, [id]);

    if (error) {
        return <div className="p-8 text-[13px] text-[#c0392b]">{error}</div>;
    }
    if (!form) {
        return <div className="p-8 text-[13px] text-[#8b97ab]">Готовим печатную форму…</div>;
    }

    return (
        <div className="bg-[#edecf5] min-h-screen py-6 print:bg-white print:py-0">
            <style>{`
                @page { size: A4; margin: 18mm 16mm; }
                @media print {
                    .sz-print-hide { display: none !important; }
                    .sz-print-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; }
                }
            `}</style>

            <div className="sz-print-hide mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
                <span className="text-[13px] text-[#55617a]">
                    Печатная форма · {form.regNumber ?? "без номера"}
                </span>
                <button
                    onClick={() => window.print()}
                    className="h-10 px-4 rounded-[10px] border-none bg-[#2f68f5] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06]"
                >
                    Печать
                </button>
            </div>

            <div className="sz-print-sheet mx-auto w-[210mm] bg-white px-[16mm] py-[14mm] shadow-[0_2px_12px_rgba(15,27,45,.08)] text-[#0f1b2d]">
                <div className="text-center">
                    <div className="text-[15px] font-bold uppercase tracking-[.06em]">Служебная записка</div>
                    <div className="mt-1 text-[12px] text-[#55617a]">
                        {form.regNumber ? `№ ${form.regNumber}` : "без номера"}
                        {form.registeredOn && ` от ${formatDate(form.registeredOn)}`}
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-[38mm_1fr] gap-y-1.5 text-[12px]">
                    <div className="text-[#55617a]">Вид записки</div>
                    <div>{form.kind ?? "—"}{form.hrKind && ` · ${form.hrKind}`}</div>

                    <div className="text-[#55617a]">Автор</div>
                    <div>{form.authorName ?? "—"}{form.authorUnit && `, ${form.authorUnit}`}</div>

                    <div className="text-[#55617a]">Адресат</div>
                    <div>{form.correspondentUnit ?? "—"}</div>

                    {form.dueDate && (
                        <>
                            <div className="text-[#55617a]">Срок исполнения</div>
                            <div>{formatDate(form.dueDate)}</div>
                        </>
                    )}

                    {form.fields.map((f) => (
                        <div key={f.label} className="contents">
                            <div className="text-[#55617a]">{f.label}</div>
                            <div>{f.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 text-[13px] font-semibold">{form.title}</div>
                {form.body && (
                    <div className="mt-2 whitespace-pre-wrap text-[12.5px] leading-[1.55]">{form.body}</div>
                )}

                {form.addresseeDecision && (
                    <div className="mt-6">
                        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#55617a]">
                            Решение адресата
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-[12.5px]">{form.addresseeDecision}</div>
                        <div className="mt-1 text-[11px] text-[#55617a]">
                            {form.addresseeName ?? "—"}
                            {form.addresseeDecisionAt && `, ${formatDate(form.addresseeDecisionAt)}`}
                        </div>
                    </div>
                )}

                {form.executionResolution && (
                    <div className="mt-6">
                        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#55617a]">Резолюция</div>
                        <div className="mt-1 text-[12.5px]">{form.executionResolution}</div>
                        {form.assignments.length > 0 && (
                            <ul className="mt-2 pl-5 text-[12.5px]">
                                {form.assignments.map((a, i) => (
                                    <li key={i} className="mb-0.5">
                                        {a.assigneeName ?? "—"} — {a.text}
                                        {a.dueDate && ` (до ${formatDate(a.dueDate)})`}
                                        {a.isPrimary && " · ответственный"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div className="mt-8">
                    <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#55617a]">
                        Лист согласования
                    </div>
                    <table className="mt-2 w-full border-collapse text-[11.5px]">
                        <thead>
                        <tr className="border-b border-[#0f1b2d]">
                            <th className="py-1.5 text-left w-[10mm]">№</th>
                            <th className="py-1.5 text-left">Должность, подразделение</th>
                            <th className="py-1.5 text-left w-[42mm]">ФИО</th>
                            <th className="py-1.5 text-left w-[34mm]">Решение</th>
                            <th className="py-1.5 text-left w-[30mm]">Дата, подпись</th>
                        </tr>
                        </thead>
                        <tbody>
                        {form.approvals.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-3 text-center text-[#8b97ab]">
                                    Маршрут согласования не запускался
                                </td>
                            </tr>
                        ) : form.approvals.map((a, i) => (
                            <tr key={i} className="border-b border-[#e5e9f0] align-top">
                                <td className="py-2">{a.stepOrder}</td>
                                <td className="py-2">
                                    {a.position ?? "—"}
                                    {a.unit && <div className="text-[#55617a]">{a.unit}</div>}
                                </td>
                                <td className="py-2">{a.userName ?? "—"}</td>
                                <td className="py-2">
                                    {a.resolution
                                        ? PRINT_RESOLUTION_LABEL[a.resolution] ?? a.resolution
                                        : ""}
                                    {a.comment && <div className="text-[#55617a]">{a.comment}</div>}
                                </td>
                                <td className="py-2">
                                    {a.signature ? (
                                        <div className="leading-[1.45]">
                                            <div className="font-semibold">{a.signature.levelTitle}</div>
                                            {a.signature.fullName && <div>{a.signature.fullName}</div>}
                                            {a.signature.position && <div>{a.signature.position}</div>}
                                            <div>{formatDateTime(a.signature.at)}</div>
                                            {a.signature.fingerprint && (
                                                <div>отпечаток {a.signature.fingerprint}</div>
                                            )}
                                            {a.signature.revoked && (
                                                <div>подпись аннулирована: {a.signature.revokedReason}</div>
                                            )}
                                        </div>
                                    ) : a.resolvedAt ? (
                                        formatDate(a.resolvedAt)
                                    ) : (
                                        /* Визы нет — оставляем линейку под подпись от руки. */
                                        "____________"
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {form.isPaperCarrier && (
                    <div className="mt-8 text-[11px] text-[#55617a]">
                        Записка ведётся на бумажном носителе. Оригинал подлежит возврату в дело.
                    </div>
                )}
            </div>
        </div>
    );
}
