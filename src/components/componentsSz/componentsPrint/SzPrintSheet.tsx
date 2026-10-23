/**
 * Лист служебной записки (бланк + лист согласования) — общий для экранной печатной формы
 * (SzPrintPage), печати и выгрузки в PDF (szPrintExport): на бумаге, в PDF и на экране
 * записка выглядит одинаково.
 */
import {
    PRINT_RESOLUTION_LABEL,
    type SzPrintApproval,
    type SzPrintForm,
    type SzPrintMode,
    type SzPrintSignature,
} from "@/service/szService/szPaperService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {
    chunkHex as chunk,
    formatCertDate,
    formatPrintDate as formatDate,
    formatPrintTime as formatTime,
    shortenHex as shorten,
} from "@/utils/szProcess/szPrintFormat.ts";
import keremetLogo from "@/assets/keremet-logo.png?url";

/** Ссылка на логотип бланка — нужна и выгрузке в Word. */
// eslint-disable-next-line react-refresh/only-export-components
export const SZ_PRINT_LOGO_URL = keremetLogo;

const STAMP_COLOR = "#1F3A93";

/** Согласующие, поставившие ЭЦП на «Согласовано с замечаниями»: подпись стоит на версии до правок. */
function isRemarksOnEarlierVersion(a: SzPrintApproval): boolean {
    return a.resolution === "ApprovedWithRemarks"
        && !!a.signature?.isEcp && !a.signature.revoked
        && a.signature.matchesCurrentContent === false;
}

/** Пояснение под листом: подпись на прежней версии текста — это нормально, замечания учтены. */
// eslint-disable-next-line react-refresh/only-export-components
export function remarksSignatureNote(approvals: SzPrintApproval[]): string | null {
    const n = approvals.filter(isRemarksOnEarlierVersion).length;
    if (n === 0) return null;
    return n === 1
        ? "Один согласующий поставил резолюцию «Согласовано с замечаниями»: подпись стоит на прежней версии текста, впоследствии замечания были устранены."
        : `Согласующих, поставивших резолюцию «Согласовано с замечаниями», — ${n}: их подписи стоят на прежней версии текста, впоследствии замечания были устранены.`;
}

/** Штамп ЭЦП ГП «Инфоком» — "оттиск печати" в колонке "Подпись". */
function EcpStamp({s}: { s: SzPrintSignature }) {
    return (
        <div className="sz-stamp rounded-[3px] px-[6px] py-[4px] leading-[1.35]"
             style={{border: `3px double ${STAMP_COLOR}`, background: "#F2F5FD", color: STAMP_COLOR}}>
            {s.isTest && (
                <div className="mb-[2px] rounded-[2px] bg-[#c0392b] text-center text-[8.5px] font-bold text-white">
                    ТЕСТОВАЯ ИМИТАЦИЯ ЭЦП — НЕ ЯВЛЯЕТСЯ ПОДПИСЬЮ
                </div>
            )}
            <div className="text-center text-[9.5px] font-bold tracking-[.03em]">ПОДПИСАНО С ПОМОЩЬЮ ЭЦП</div>
            <div className="text-center text-[8px] text-[#7A869A]">
                {s.isTest ? "тестовый режим · у ГП «Инфоком» не проверялась" : "облачная ЭЦП ГП «Инфоком» · подпись проверена"}
            </div>
            <div className="mt-[2px] text-[8.5px]">
                {s.fullName && <div><b>Владелец: {s.fullName}</b></div>}
                {s.organizationName && <div>Организация: {s.organizationName}</div>}
                {formatCertDate(s.certValidNotAfter) && <div>Сертификат действителен до: {formatCertDate(s.certValidNotAfter)}</div>}
                {s.issuerName && <div>Издатель: {s.issuerName}</div>}
                <div>Подписано: {formatDateTime(s.at)}</div>
                {s.documentHash && (
                    <>
                        <div className="text-[7.5px] text-[#7A869A]">Хэш документа (SHA-256):</div>
                        {chunk(s.documentHash, 32).map((part) => (
                            <div key={part} className="font-mono text-[7.5px]">{part}</div>
                        ))}
                    </>
                )}
                {s.signatureSha256 && (
                    <div className="font-mono text-[7.5px] text-[#7A869A]">Отпечаток подписи: {shorten(s.signatureSha256)}</div>
                )}
            </div>
        </div>
    );
}

/** Подпись не ЭЦП (простая, ТУМАР, облачная ЭП) — прежний компактный штамп. */
function OtherStamp({s}: { s: SzPrintSignature }) {
    return (
        <div className="leading-[1.45] text-[10px]">
            <div className="font-semibold">{s.levelTitle}</div>
            {s.fullName && <div>{s.fullName}</div>}
            <div>{formatDateTime(s.at)}</div>
            {s.fingerprint && <div className="text-[#55617a]">отпечаток {s.fingerprint}</div>}
        </div>
    );
}

function SignatureCell({a}: { a: SzPrintApproval }) {
    const s = a.signature;
    if (s?.revoked) {
        return <div className="text-[10px] italic text-[#c0392b]">Подпись аннулирована: {s.revokedReason}</div>;
    }
    if (s?.isEcp) return <EcpStamp s={s}/>;
    if (s) {
        return (
            <div>
                <div className="mb-1 text-[9.5px] italic text-[#7A869A]">Без ЭЦП</div>
                <OtherStamp s={s}/>
            </div>
        );
    }
    return <div className="text-[10px] italic text-[#7A869A]">{a.resolution ? "Без ЭЦП" : "—"}</div>;
}


/** Стили листа: экранные и печатные. Подключаются один раз рядом с листом. */
// eslint-disable-next-line react-refresh/only-export-components
export const SZ_PRINT_STYLES = `
@page { size: A4; margin: 18mm 16mm; }
@media print {
    .sz-print-hide { display: none !important; }
    .sz-print-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; }

    /* Таблицу расчёта нельзя рвать между листами по строке:
       продолжение без шапки читателю ни о чём не говорит. */
    .sz-print-body tr, .sz-print-body blockquote { break-inside: avoid; }

    /* Строку листа согласования и штамп ЭЦП тоже не рвём. */
    .sz-approval-sheet tr, .sz-stamp { break-inside: avoid; }
    .sz-stamp { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}

/* Текст записки набирают в редакторе — на бумаге он должен
   выглядеть так же, как на экране. */
.sz-print-body p { margin: 0 0 5px; }
.sz-print-body h1 { font-size: 15px; font-weight: 700; margin: 8px 0 5px; }
.sz-print-body h2 { font-size: 13.5px; font-weight: 700; margin: 8px 0 4px; }
.sz-print-body h3 { font-size: 12.5px; font-weight: 700; margin: 7px 0 4px; }
.sz-print-body ul, .sz-print-body ol { margin: 0 0 5px; padding-left: 20px; }
.sz-print-body blockquote {
    margin: 5px 0; padding-left: 9px; border-left: 2px solid #999;
}
.sz-print-body table {
    border-collapse: collapse; width: 100%; margin: 6px 0; table-layout: fixed;
}
.sz-print-body th, .sz-print-body td {
    border: 1px solid #000; padding: 3px 5px; vertical-align: top;
}
.sz-print-body th { font-weight: 600; text-align: left; }

.sz-approval-sheet { border-collapse: collapse; width: 100%; table-layout: fixed; }
.sz-approval-sheet th, .sz-approval-sheet td {
    border: 1px solid #0f1b2d; padding: 4px 5px; vertical-align: top;
}
.sz-approval-sheet th { font-weight: 600; text-align: left; background: #f6f8fb; }
`;

interface SzPrintSheetProps {
    form: SzPrintForm;
    mode: SzPrintMode;
    /**
     * screen — лист A4 с полями и тенью (экранная форма и печать);
     * capture — только содержимое без полей и тени, шириной области печати A4
     * (178 мм): из него собирается PDF, поля ставит сам PDF.
     */
    variant?: "screen" | "capture";
}

export function SzPrintSheet({form, mode, variant = "screen"}: SzPrintSheetProps) {
    const signed = mode === "signed";
    const remarksNote = remarksSignatureNote(form.approvals);

    const sheetClass = variant === "capture"
        ? "sz-print-sheet sz-print-capture w-[178mm] bg-white text-[#0f1b2d]"
        : "sz-print-sheet mx-auto w-[210mm] bg-white px-[16mm] py-[14mm] shadow-[0_2px_12px_rgba(15,27,45,.08)] text-[#0f1b2d]";

    return (
        <div className={sheetClass}>
            {/* Фирменный бланк: логотип Банка сверху, под ним — линейка. */}
            <div className="mb-5 flex items-center justify-between border-b border-[#0f1b2d] pb-3">
                <img src={keremetLogo} alt="Керемет Банк" className="h-[26px] w-auto" />
                <span className="text-[10px] uppercase tracking-[.06em] text-[#55617a]">
                    ОАО «Керемет Банк»
                </span>
            </div>

            {/* Реквизиты бланка: № и дата — справа сверху, как на письме. */}
            <div className="mb-4 text-right text-[11.5px] text-[#55617a]">
                {form.regNumber ? `№ ${form.regNumber}` : "без номера"}
                {form.registeredOn && ` от ${formatDate(form.registeredOn)}`}
            </div>

            {/* Шапка как в бланке записки Банка: Кому / От / Дата / Тема. */}
            <div className="grid grid-cols-[24mm_1fr] gap-y-[3px] text-[12.5px] leading-[1.5]">
                <div className="font-semibold">Кому:</div>
                <div>
                    {form.addresseeName ?? form.correspondentUnit ?? "—"}
                    {form.addresseeName && form.correspondentUnit && `, ${form.correspondentUnit}`}
                </div>

                <div className="font-semibold">От:</div>
                <div>{form.authorName ?? "—"}{form.authorUnit && `, ${form.authorUnit}`}</div>

                <div className="font-semibold">Дата:</div>
                <div>{form.registeredOn ? formatDate(form.registeredOn) : "—"}</div>

                <div className="font-semibold">Тема:</div>
                <div className="font-semibold">{form.title}</div>
            </div>

            {/* Внутренние реквизиты СЭД (вид, срок, доп. поля формы) — мелким под шапкой. */}
            <div className="mt-3 grid grid-cols-[38mm_1fr] gap-y-1 text-[11px] text-[#55617a]">
                <div>Вид записки</div>
                <div>{form.kind ?? "—"}{form.hrKind && ` · ${form.hrKind}`}</div>

                {form.dueDate && (
                    <>
                        <div>Срок исполнения</div>
                        <div>{formatDate(form.dueDate)}</div>
                    </>
                )}

                {form.fields.map((f) => (
                    <div key={f.label} className="contents">
                        <div>{f.label}</div>
                        <div>{f.value}</div>
                    </div>
                ))}
            </div>
            {form.body && (
                /* Разметку выводим как разметку: в тексте бывают таблицы расчётов
                   и выделенные условия, и на бумаге они должны остаться собой.
                   Сервер чистит её по белому списку при сохранении — здесь она
                   уже безопасна. */
                <div
                    className="sz-print-body mt-2 text-[12.5px] leading-[1.55]"
                    dangerouslySetInnerHTML={{__html: form.body}}
                />
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
                <div className="text-center text-[12.5px] font-bold uppercase tracking-[.05em]">
                    Лист согласования
                </div>
                <div className="mb-2 text-center text-[11px] italic text-[#55617a]">
                    {signed && "с подписями ЭЦП"}
                    {form.regNumber && `${signed ? " · " : ""}к служебной записке № ${form.regNumber}`}
                </div>
                <table className="sz-approval-sheet text-[11px]">
                    <colgroup>
                        <col style={{width: "8mm"}}/>
                        <col/>
                        <col style={{width: signed ? "28mm" : "34mm"}}/>
                        <col style={{width: signed ? "25mm" : "30mm"}}/>
                        <col style={{width: signed ? "21mm" : "22mm"}}/>
                        <col style={{width: signed ? "60mm" : "38mm"}}/>
                    </colgroup>
                    <thead>
                    <tr>
                        <th>№</th>
                        <th>Должность, подразделение</th>
                        <th>ФИО</th>
                        <th>Решение</th>
                        <th>Дата</th>
                        <th>Подпись</th>
                    </tr>
                    </thead>
                    <tbody>
                    {form.approvals.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-3 text-center text-[#8b97ab]">
                                Маршрут согласования не запускался
                            </td>
                        </tr>
                    ) : form.approvals.map((a, i) => (
                        <tr key={i}>
                            <td>
                                {i + 1}
                            </td>
                            <td>
                                {a.position ?? "—"}
                                {a.unit && <div className="text-[#55617a]">{a.unit}</div>}
                            </td>
                            <td>
                                {a.userName ?? "—"}
                                {/* Этап подписания: этот участник подписывает записку, а не согласует. */}
                                {a.stepKind === "Signing" && (
                                    <div className="text-[9.5px] text-[#55617a]">подписант</div>
                                )}
                            </td>
                            <td>
                                {a.resolution
                                    ? <b>{PRINT_RESOLUTION_LABEL[a.resolution] ?? a.resolution}</b>
                                    : <span className="text-[#7A869A]">Ожидает решения</span>}
                                {/* Комментарий к резолюции — под решением, обычным шрифтом. */}
                                {a.resolution && a.comment && (
                                    <div className="mt-[2px] whitespace-pre-line break-words text-[9.5px] font-normal leading-[1.35] text-[#3d4a63]">
                                        {a.comment}
                                    </div>
                                )}
                            </td>
                            <td>
                                {a.resolvedAt ? (
                                    <span className="whitespace-nowrap">
                                        {formatDate(a.resolvedAt)}
                                        <span className="block text-[9.5px] text-[#7A869A]">{formatTime(a.resolvedAt)}</span>
                                    </span>
                                ) : <span className="text-[#7A869A]">—</span>}
                            </td>
                            <td className={signed ? "" : "h-[14mm]"}>
                                {/* Версия для подписи от руки: колонка пустая — место под подпись. */}
                                {signed && <SignatureCell a={a}/>}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {signed ? (
                    <div className="mt-3 text-[9.5px] italic leading-[1.5] text-[#7A869A]">
                        <div>
                            Подписи ЭЦП поставлены согласующими через облачную ЭЦП ГП «Инфоком» и проверены системой
                            «Делосфера» у провайдера при сохранении резолюций. Хэш документа — SHA-256 подписанного
                            содержимого: решения, текста резолюции и отпечатка записки (текст, реквизиты, вложения).
                        </div>
                        {form.contentDigest && (
                            <div className="font-mono not-italic">
                                Отпечаток текущего текста записки (SHA-256): {form.contentDigest}
                            </div>
                        )}
                        {remarksNote && <div className="mt-1">{remarksNote}</div>}
                    </div>
                ) : null}
            </div>

            {form.isPaperCarrier && (
                <div className="mt-8 text-[11px] text-[#55617a]">
                    Записка ведётся на бумажном носителе. Оригинал подлежит возврату в дело.
                </div>
            )}
        </div>
    );
}
