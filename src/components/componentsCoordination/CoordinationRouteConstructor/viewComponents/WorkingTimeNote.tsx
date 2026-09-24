// Пояснение "сроки согласования идут только в рабочее время" - под нормативами в модалке
// запуска согласования и в справочнике нормативов. Ссылка на производственный календарь -
// только тем, кто может его править (остальным она ни к чему).
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CalendarDays, Clock} from "lucide-react";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {formatWorkDayHours, formatWorkHours, useWorkCalendar} from "@/utils/workCalendar.ts";

interface WorkingTimeNoteProps {
    className?: string;
}

export function WorkingTimeNote({className = ""}: WorkingTimeNoteProps) {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canManageCalendar = hasPermission(PermissionCode.ManageVndDictionaries);
    useWorkCalendar(); // рабочие часы банка - из справочника

    return (
        <div
            className={`flex items-start gap-2.5 rounded-xl border border-[#e3e7fb] bg-[#f7f8ff] px-3.5 py-2.5 text-[11.5px] leading-[1.5] text-[#55617a] ${className}`}
        >
            <Clock className="mt-[1px] h-[15px] w-[15px] flex-none text-[#4e57d6]" strokeWidth={1.9}/>
            <div className="min-w-0">
                <span className="font-semibold text-[#26324a]">{t("coordination.workingTime.title")}</span>{" "}
                {t("coordination.workingTime.hint", {hours: formatWorkHours(), dayHours: formatWorkDayHours()})}
                {canManageCalendar && (
                    <Link
                        to="/management/refs/work-calendar"
                        className="ml-1 inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#4e57d6] no-underline hover:underline"
                    >
                        <CalendarDays className="h-[13px] w-[13px]" strokeWidth={2}/>
                        {t("coordination.workingTime.calendarLink")}
                    </Link>
                )}
            </div>
        </div>
    );
}
