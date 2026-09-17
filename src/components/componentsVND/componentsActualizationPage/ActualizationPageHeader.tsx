import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ChartLine, Download, Settings} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

interface ActualizationPageHeaderProps {
    onExportClick?: () => void;
}

export function ActualizationPageHeader({onExportClick}: ActualizationPageHeaderProps) {
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const {t} = useTranslation();

    return (
        <div className="flex items-end justify-between gap-5 flex-wrap mb-[18px]">
            <div>
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">
                    {/* Планирование актуализации */}
                    {t("actualizationPage.header.title")}
                </h1>
                <p className="mt-[7px] mb-0 text-[#8b97ab] text-[13px]">
                    {/* Контроль сроков актуализации ВНД и планирование предстоящих пересмотров */}
                    {t("actualizationPage.header.subtitle")}
                </p>
            </div>
            <div className="flex gap-2.5">
                {hasPermission(PermissionCode.ManageVndActualizationMailing) && (
                    <button
                        onClick={() => navigate("/management/mailing-settings")}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Settings className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {/* Настройки рассылок плана */}
                        {t("actualizationPage.header.mailingSettingsButton")}
                    </button>
                )}

                <button
                    onClick={onExportClick}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <Download className="w-[18px] h-[18px]" strokeWidth={2}/>
                    {/* Экспорт плана в Excel */}
                    {t("actualizationPage.header.exportButton")}
                </button>

                <button
                    onClick={() => navigate("/analytics?tab=vnd&sub=actualization")}
                    className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                >
                    <ChartLine className="w-[18px] h-[18px]" strokeWidth={2}/>
                    {/* Аналитика по актуализации */}
                    {t("actualizationPage.header.analyticsButton")}
                </button>
            </div>
        </div>
    )
}
