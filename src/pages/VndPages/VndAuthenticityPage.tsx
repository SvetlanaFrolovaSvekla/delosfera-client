/**
 * "Проверка подлинности согласования ВНД": загружается файл редакции - в ответ редакции ВНД,
 * текстом которых он был, история согласования и кто, когда, с каким решением и комментарием
 * подписал ЭЦП именно этот текст. Поиск идёт по SHA-256 файла: он входит в отпечаток текста каждой
 * подписи (см. VndAuthenticityService на backend). Файл нигде не сохраняется.
 */
import {useCallback, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    vndAuthenticityService,
    type VndAuthenticityCheckResponse,
} from "@/service/vndService/vndAuthenticityService.ts";
import {toast} from "@/service/toastService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {HowItWorks} from "@/components/componentsVND/componentsAuthenticityPage/HowItWorks.tsx";
import {UploadCard} from "@/components/componentsVND/componentsAuthenticityPage/UploadCard.tsx";
import {CheckResult} from "@/components/componentsVND/componentsAuthenticityPage/CheckResult.tsx";
import {verdictOf} from "@/utils/vndProcess/authenticityUtils.ts";

export function VndAuthenticityPage() {
    const {t} = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<VndAuthenticityCheckResponse | null>(null);

    const pick = (picked: File | null | undefined) => {
        if (!picked) return;
        setFile(picked);
        setResult(null);
        setError(null);
    };

    const check = useCallback(async () => {
        if (!file) return;
        setChecking(true);
        setError(null);
        setResult(null);
        try {
            const response = await vndAuthenticityService.check(file);
            setResult(response);
            const {verdict} = verdictOf(response);
            if (verdict === "confirmed") toast.success(t("vndAuthenticity.verdict.confirmedTitle"));
            else if (verdict === "partial") toast.warning(t("vndAuthenticity.verdict.partialTitle"));
            else toast.info(t("vndAuthenticity.notFound"));
        } catch (e) {
            const response = (e as { response?: { status?: number; data?: { message?: string } } }).response;
            const message = response?.status === 429
                ? t("vndAuthenticity.tooMany")
                : response?.data?.message ?? t("vndAuthenticity.checkFailed");
            setError(message);
            toast.error(t("vndAuthenticity.checkFailed"), message);
        } finally {
            setChecking(false);
        }
    }, [file, t]);

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("vndAuthenticity.title")}
                description={t("vndAuthenticity.subtitle")}
                actions={<HelpTooltip side="left" content={t("vndAuthenticity.headerHelp")}/>}
            />

            <HowItWorks/>

            <UploadCard
                file={file}
                checking={checking}
                error={error}
                onPick={pick}
                onCheck={() => void check()}
            />

            {result && <CheckResult result={result}/>}
        </div>
    );
}
