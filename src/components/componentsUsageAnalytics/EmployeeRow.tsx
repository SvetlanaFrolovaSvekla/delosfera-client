/* Строка из таблицы Сотрудники, на странице посещений портала */
import {useTranslation} from "react-i18next";
import type {UsageEmployee} from "@/service/usageService/usageService.ts";
import {Cell, formatDateTime, Row} from "@/components/componentsGeneral/DataTable.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {HighlightSubstrings} from "@/utils/highlightText.tsx";

interface EmployeeRowProps {
    employee: UsageEmployee;
    /** Слова поиска — подсвечиваются в ФИО, должности и подразделении. */
    terms?: string[];
}

export function EmployeeRow({employee, terms = []}: EmployeeRowProps) {
    const {t} = useTranslation();
    const never = employee.opens === 0;

    return (
        <Row>
            <Cell>
                <div className="flex items-center gap-2.5">
                    <Avatar name={employee.fullName} muted={never}/>
                    <span className="min-w-0">
                        <span className={`block truncate text-[13.5px] font-semibold
                                          ${never ? "text-[#8593a8]" : "text-[#101a2c]"}`}>
                            <HighlightSubstrings text={employee.fullName} terms={terms}/>
                        </span>
                        <span className="block truncate text-[11.5px] text-[#8593a8]">
                            {employee.position
                                ? <HighlightSubstrings text={employee.position} terms={terms}/>
                                : "—"}
                        </span>
                    </span>
                </div>
            </Cell>

            <Cell>
                {employee.orgUnit
                    ? <HighlightSubstrings text={employee.orgUnit} terms={terms}/>
                    : "—"}
            </Cell>

            <Cell mono align="right">{employee.days || "—"}</Cell>
            <Cell mono align="right">{employee.opens || "—"}</Cell>

            <Cell mono align="right">
                {employee.lastVisit ? formatDateTime(employee.lastVisit) : (
                    <span className="text-[#c0392b]">
                        {t("usageAnalytics.neverLoggedIn") /* не заходил */}
                    </span>
                )}
            </Cell>
        </Row>
    );
}
