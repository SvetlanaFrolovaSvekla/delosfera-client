// Панели, которые появляются на разных стадиях жизни записки: бюджет обучения, исполнение,
// вынесение на орган, оригинал, закупка, архив.
import {useAuth} from "@/context/AuthContext.ts";
import type {SzDetails, SzFormKey} from "@/service/szService/szService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {SzProcurementLink} from "@/components/componentsSz/componentsSzCard/statuses/SzProcurementLink.tsx";
import {BODY_SUBMISSION_STATUSES} from "@/utils/szProcess/szCardUtils.ts";
import {SzTrainingBudgetPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzTrainingBudgetPanel.tsx";
import {SzExecutionPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzExecutionPanel.tsx";
import {SzSubmitToBodyPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzSubmitToBodyPanel.tsx";
import {SzOriginalPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzOriginalPanel.tsx";
import {SzProcurementPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzProcurementPanel.tsx";
import {SzArchivePanel} from "@/components/componentsSz/componentsSzCard/statuses/SzArchivePanel.tsx";
import {BoardReviewCard} from "@/components/componentsGeneral/BoardReviewCard.tsx";

interface SzStatusPanelsProps {
    sz: SzDetails;
    formKey: SzFormKey;
    onChanged: () => Promise<void>;
}

export function SzStatusPanels({sz, formKey, onChanged}: SzStatusPanelsProps) {
    const {hasPermission} = useAuth();

    return (
        <>
            {/* Бюджет и позиция плана по СЗ на обучение (КСЗ-08): проставляет УЧР. */}
            {formKey === "Training" && (
                <SzTrainingBudgetPanel sz={sz} canEdit={hasPermission(PermissionCode.ViewAllSz)} onChanged={onChanged}/>
            )}

            {/* Исполнение начинается после согласования — панель ведёт поручения и сроки. */}
            {(sz.statusCode === "OnExecution" || sz.statusCode === "Executed") && (
                <SzExecutionPanel sz={sz} onChanged={onChanged}/>
            )}

            {/* Вынесение на коллегиальный орган. Вопрос выносит адресат по записке,
                переданной на исполнение (после подписания), а также видит статус, пока
                она «на рассмотрении органа». До исполнения выносить нечего. */}
            {BODY_SUBMISSION_STATUSES.includes(sz.statusCode) && (
                <SzSubmitToBodyPanel
                    szId={sz.id}
                    body={sz.submitToBody}
                    question={sz.submitToBodyQuestion}
                    inAgenda={sz.inAgenda}
                    canEdit={hasPermission(PermissionCode.SubmitSzToBody)}
                    onChanged={onChanged}
                />
            )}

            {/* Бумажный оригинал: оригинал существует только у зарегистрированной записки. */}
            {sz.statusCode !== "Draft" && (
                <SzOriginalPanel szId={sz.id} isPaperCarrier={sz.isPaperCarrier}/>
            )}

            {/* Куда записка ушла на коллегиальный орган. Автор просил вынести
                вопрос и до сих пор не видел, дошёл ли тот до заседания. */}
            {sz.boardReview && (
                <div className="mt-4">
                    <BoardReviewCard review={sz.boardReview}/>
                </div>
            )}

            {/* Заявка, выросшая из записки: до сих пор по карточке было не видно,
                чем записка обернулась и на какой стадии закупка. */}
            <SzProcurementLink sz={sz}/>

            {/* Закупка запускается по согласованной записке — панель ведёт передачу реквизитов. */}
            {sz.statusCode !== "Draft" && <SzProcurementPanel szId={sz.id} formKey={formKey} onChanged={onChanged}/>}

            <SzArchivePanel szId={sz.id} statusCode={sz.statusCode} onChanged={onChanged}/>
        </>
    );
}
