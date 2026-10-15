import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {SzOriginal} from "@/service/szService/szPaperService.ts";
import {DueCell} from "./DueCell.tsx";
import {RegistryStateRow, RegistryTable, type RegistryColumn} from "./RegistryTable.tsx";

interface Props {
    originals: SzOriginal[];
    loading: boolean;
}

/** «Оригиналы на руках»: кто держит бумагу и с какого числа. */
export function OriginalsTable({originals, loading}: Props) {
    const {t} = useTranslation();
    const columns: RegistryColumn[] = [
        {className: "px-4 py-2.5 text-left w-[140px]", content: t("szRegistry.cols.memo")},
        {className: "px-4 py-2.5 text-left", content: t("szRegistry.cols.subject")},
        {className: "px-4 py-2.5 text-left w-[190px]", content: t("szRegistry.cols.holder")},
        {className: "px-4 py-2.5 text-left w-[170px]", content: t("szRegistry.cols.location")},
        {className: "px-4 py-2.5 text-left w-[160px]", content: t("szRegistry.cols.returnBy")},
    ];

    return (
        <RegistryTable columns={columns}>
            {loading ? (
                <RegistryStateRow colSpan={5}>{t("general.loading")}</RegistryStateRow>
            ) : originals.length === 0 ? (
                <RegistryStateRow colSpan={5}>{t("szRegistry.originalsEmpty")}</RegistryStateRow>
            ) : originals.map((o) => (
                <tr key={o.szId} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                    <td className="px-4 py-2.5">
                        <Link to={`/sz/${o.szId}`}
                              className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                            {o.regNumber ?? t("szRegistry.noNumber")}
                        </Link>
                    </td>
                    <td className="px-4 py-2.5">
                        <Link to={`/sz/${o.szId}`} className="text-[#1c2740] no-underline hover:underline">
                            {o.title ?? "—"}
                        </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[#55617a]">{o.holderName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-[#55617a]">{o.location ?? "—"}</td>
                    <td className="px-4 py-2.5">
                        <DueCell dueDate={o.dueBackOn} isOverdue={o.isOverdue} daysLeft={o.daysLeft}
                                 fallback={t("szRegistry.noDueDate")}/>
                    </td>
                </tr>
            ))}
        </RegistryTable>
    );
}
