// Блок "Установленный маршрут согласования" - заголовок + опциональная цветная шапка-статус
// (см. getRouteHeaderConfig в ./coordinationRoleState.ts) + сама схема маршрута
// (VndApprovalRouteView). Общий для видов согласующего и инициатора в VndCoordinationTab.
import {useTranslation} from "react-i18next";
import {
    VndApprovalRouteView
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalRouteView.tsx";
import type {
    FormattedCommentQuoteRef
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {RouteHeaderConfig} from "./coordinationRoleState.ts";

interface VndCoordinationRouteSectionProps {
    process: ApprovalProcessResponse;
    routeHeaderConfig: RouteHeaderConfig | null;
    /** Подсветить карточку "моего" этапа - передаётся только в виде согласующего, в виде
     * инициатора не передаётся вовсе (см. VndCoordinationTab). */
    highlightStageId?: number;
    onShowQuoteInText: (quote: FormattedCommentQuoteRef) => void;
    canEditRoute: boolean;
    onAddApprover: () => void;
    onRemoveApprover: (stageId: number) => void;
}

export function VndCoordinationRouteSection({
    process, routeHeaderConfig, highlightStageId, onShowQuoteInText, canEditRoute, onAddApprover, onRemoveApprover,
}: VndCoordinationRouteSectionProps) {
    const {t} = useTranslation();

    return (
        <>
            <div className="mb-2 text-[13.5px] font-bold text-[#1c2740]">
                {t("openVndPage.coordinationTab.establishedRouteLabel")}
            </div>
            <div
                className={`rounded-[16px] border overflow-hidden ${routeHeaderConfig ? routeHeaderConfig.border : "border-[#e5e9f0]"}`}>
                {routeHeaderConfig && (
                    <div
                        className={`flex items-start gap-3 border-b px-5 py-3 ${routeHeaderConfig.border} ${routeHeaderConfig.bg}`}>
                        <routeHeaderConfig.icon size={18}
                                                className={`mt-[1px] flex-none ${routeHeaderConfig.iconColor}`}/>
                        <div>
                            <div className={`text-[13px] font-semibold ${routeHeaderConfig.titleColor}`}>
                                {routeHeaderConfig.title}
                            </div>
                            <div className={`mt-0.5 text-[12.5px] leading-[1.5] ${routeHeaderConfig.textColor}`}>
                                {routeHeaderConfig.description}
                            </div>
                        </div>
                    </div>
                )}
                <VndApprovalRouteView
                    process={process}
                    highlightStageId={highlightStageId}
                    frameless={!!routeHeaderConfig}
                    onShowQuoteInText={onShowQuoteInText}
                    canEditRoute={canEditRoute}
                    onAddApprover={onAddApprover}
                    onRemoveApprover={onRemoveApprover}
                />
            </div>
        </>
    );
}
