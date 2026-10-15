import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {SzAssignment} from "@/service/szService/szExecutionService.ts";
import {colors} from "@/design/tokens.ts";
import {DueCell} from "./DueCell.tsx";
import {RegistryStateRow, RegistryTable, type RegistryColumn} from "./RegistryTable.tsx";

interface Props {
    assignments: SzAssignment[];
    loading: boolean;
}

/** «Мои поручения»: не записки, а поручения по ним. */
export function AssignmentsTable({assignments, loading}: Props) {
    const {t} = useTranslation();
    const columns: RegistryColumn[] = [
        {className: "px-4 py-2.5 text-left w-[140px]", content: t("szRegistry.cols.memo")},
        {className: "px-4 py-2.5 text-left", content: t("szRegistry.cols.assignment")},
        {className: "px-4 py-2.5 text-left w-[150px]", content: t("szRegistry.cols.due")},
        {className: "px-4 py-2.5 text-left w-[150px]", content: t("szRegistry.cols.state")},
    ];

    return (
        <RegistryTable columns={columns}>
            {loading ? (
                <RegistryStateRow colSpan={4}>{t("general.loading")}</RegistryStateRow>
            ) : assignments.length === 0 ? (
                <RegistryStateRow colSpan={4}>{t("szRegistry.assignmentsEmpty")}</RegistryStateRow>
            ) : assignments.map((a) => (
                <tr key={a.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                    <td className="px-4 py-2.5">
                        <Link to={`/sz/${a.szDocumentId}`}
                              className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                            {a.szRegNumber ?? t("szRegistry.noNumber")}
                        </Link>
                    </td>
                    <td className="px-4 py-2.5">
                        <Link to={`/sz/${a.szDocumentId}`}
                              className="text-[#1c2740] no-underline hover:underline">
                            {a.text}
                        </Link>
                        <div className="text-[12px] text-[#8b97ab]">{a.szTitle}</div>
                        {a.returnReason && (
                            <div className="text-[12px] text-[#b3730a]">
                                {t("szRegistry.returned", {reason: a.returnReason})}
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-2.5">
                        <DueCell dueDate={a.dueDate} isOverdue={a.isOverdue} daysLeft={a.daysLeft}/>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[12.5px]"
                        style={{color: a.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                        {a.isOverdue ? t("szRegistry.overdue") : t(`szRegistry.assignmentState.${a.state}`)}
                    </td>
                </tr>
            ))}
        </RegistryTable>
    );
}
