/**
 * «Печатные формы приказа/договора МО» заявки на замещение — как «Скачать / печать» у СЗ (SzPrintPage):
 *   /substitutions/:id/print/order      — приказ о временном возложении обязанностей;
 *   /substitutions/:id/print/liability  — договор о полной материальной ответственности.
 * Сверху табы документов, ниже — «С подписями ЭЦП» (?mode=signed) / «Для подписи от руки» (?mode=paper),
 * PDF, DOCX и печать. &autoprint=1 — сразу открыть диалог печати. Сам просмотр — SubstitutionDocumentsViewer.
 */
import {useEffect, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {
    substitutionService,
    type SubstitutionPrintForm,
    type SubstitutionPrintMode,
} from "@/service/substitutionService/substitutionService.ts";
import {SubstitutionDocumentsViewer} from "@/components/componentsSubstitutions/SubstitutionDocumentsViewer.tsx";

export function SubstitutionPrintPage() {
    const navigate = useNavigate();
    const {id, form: formParam} = useParams<{ id: string; form: string }>();
    const form: SubstitutionPrintForm = formParam === "liability" ? "liability" : "order";
    const requestId = Number(id);
    const [searchParams, setSearchParams] = useSearchParams();
    const mode: SubstitutionPrintMode = searchParams.get("mode") === "paper" ? "paper" : "signed";
    const autoPrint = searchParams.get("autoprint") === "1";
    const [regNumber, setRegNumber] = useState<string | null>(null);
    const [subject, setSubject] = useState<string | null>(null);

    useEffect(() => {
        if (!requestId) return;
        substitutionService.get(requestId)
            .then((d) => {
                setRegNumber(d.regNumber);
                setSubject(d.subject);
            })
            .catch(() => {
            });
    }, [requestId]);

    if (!requestId) return null;

    return (
        <div className="min-h-screen bg-[#edecf5] py-6 print:bg-white print:py-0">
            <div className="mx-auto max-w-[240mm] px-4 print:max-w-none print:px-0">
                <div className="sub-print-hide mb-3">

                    <div className="mt-0.5 text-[16px] font-bold text-[#1c2740]">
                        {regNumber ?? `#${requestId}`}{subject ? ` · ${subject}` : ""}
                    </div>
                </div>
                <SubstitutionDocumentsViewer
                    requestId={requestId}
                    regNumber={regNumber}
                    form={form}
                    mode={mode}
                    onFormChange={(f) => navigate(`/substitutions/${requestId}/print/${f}?mode=${mode}`, {replace: true})}
                    onModeChange={(m) => setSearchParams({mode: m}, {replace: true})}
                    onPrint={() => window.print()}
                    autoPrint={autoPrint}
                />
            </div>
        </div>
    );
}
