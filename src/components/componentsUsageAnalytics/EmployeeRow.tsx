/* Строка из таблицы Сотрудники, на странице посещений портала */
import {useTranslation} from "react-i18next";
import type {UsageEmployee} from "@/service/usageService/usageService.ts";
import {Cell, formatDateTime, Row} from "@/components/componentsGeneral/DataTable.tsx";

export function EmployeeRow({employee}: {employee: UsageEmployee}) {
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
                            {employee.fullName}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#8593a8]">
                            {employee.position ?? "—"}
                        </span>
                    </span>
                </div>
            </Cell>

            <Cell>{employee.orgUnit ?? "—"}</Cell>

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

/**
 * Кружок с инициалами. Настоящих фотографий в системе нет, а пустое место в
 * первой колонке делает список трудным для просматривания глазами.
 */
function Avatar({name, muted}: {name: string; muted?: boolean}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    // Цвет из имени: одинаковый у одного человека между заходами, разный у соседей.
    const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;

    return (
        <span
            aria-hidden="true"
            className="grid h-8 w-8 flex-none place-items-center rounded-full
                       text-[11.5px] font-bold text-white"
            style={{
                background: muted ? "#c3cede" : `hsl(${hue} 45% 52%)`,
            }}
        >
            {initials}
        </span>
    );
}