// Панели, которые появляются на разных стадиях жизни записки: бюджет обучения, исполнение,
// вынесение на орган, оригинал, закупка, архив.
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import type {SzDetails, SzFormKey} from "@/service/szService/szService.ts";
import {BoardReviewCard} from "@/components/componentsGeneral/BoardReviewCard.tsx";
import {SzTrainingBudgetPanel} from "@/components/sz/SzTrainingBudgetPanel.tsx";
import {SzExecutionPanel} from "@/components/sz/SzExecutionPanel.tsx";
import {SzSubmitToBodyPanel} from "@/components/sz/SzSubmitToBodyPanel.tsx";
import {SzOriginalPanel} from "@/components/sz/SzOriginalPanel.tsx";
import {SzProcurementPanel} from "@/components/sz/SzProcurementPanel.tsx";
import {SzArchivePanel} from "@/components/sz/SzArchivePanel.tsx";
import {SzProcurementLink} from "@/components/componentsSzCard/SzProcurementLink.tsx";
import {BODY_SUBMISSION_STATUSES} from "@/components/componentsSzCard/szCardUtils.ts";

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

            {/* Бумажный контур: оригинал существует только у зарегистрированной записки. */}
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
            {sz.statusCode !== "Draft" && <SzProcurementPanel szId={sz.id} formKey={formKey}/>}

            <SzArchivePanel szId={sz.id} statusCode={sz.statusCode} onChanged={onChanged}/>
        </>
    );
}
