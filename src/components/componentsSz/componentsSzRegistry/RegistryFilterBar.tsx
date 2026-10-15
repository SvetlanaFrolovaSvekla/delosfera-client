import {useTranslation} from "react-i18next";
import {Download} from "lucide-react";
import type {SzKind, SzStatusCode} from "@/service/szService/szService.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {FILTER_STATUSES} from "./registryModel.ts";

interface Props {
    /** Скрыть панель (остаётся смонтированной, чтобы не терять состояние полей). */
    hidden: boolean;
    /** Показывать фильтр по статусу (на вкладках со своим набором статусов он не нужен). */
    showStatusFilter: boolean;
    query: string;
    onQueryChange: (v: string) => void;
    kinds: SzKind[];
    kindTitle: (k: SzKind) => string;
    kindId: number | "";
    onKindChange: (v: number | "") => void;
    statusFilter: SzStatusCode | "";
    onStatusChange: (v: SzStatusCode | "") => void;
    overdueOnly: boolean;
    onOverdueChange: (v: boolean) => void;
    total: number;
    exporting: boolean;
    onExport: () => void;
}

export function RegistryFilterBar(p: Props) {
    const {t} = useTranslation();
    return (
        <div className={`mt-4 flex flex-wrap items-center gap-2.5 ${p.hidden ? "hidden" : ""}`}>
            <SearchBar
                variant="white"
                value={p.query}
                onChange={p.onQueryChange}
                placeholder={t("szRegistry.searchPlaceholder")}
                className="min-w-[280px] flex-1"
            />
            <SelectDropdown
                options={[
                    {value: "", label: t("szRegistry.allKinds")},
                    ...p.kinds.map((k) => ({value: String(k.id), label: p.kindTitle(k)})),
                ]}
                value={p.kindId === "" ? "" : String(p.kindId)}
                onChange={(v) => p.onKindChange(v ? Number(v) : "")}
                searchable
                searchPlaceholder={t("szRegistry.kindSearchPlaceholder")}
                minWidth="150px"
                accent="blue"
            />
            {p.showStatusFilter && (
                <SelectDropdown
                    options={[
                        {value: "", label: t("szRegistry.allStatuses")}, // Все статусы
                        ...FILTER_STATUSES.map((code) => ({value: code, label: t(`szRegistry.status.${code}`)})),
                    ]}
                    value={p.statusFilter}
                    onChange={(v) => p.onStatusChange(v as SzStatusCode | "")}
                    minWidth="180px"
                    accent="blue"
                />
            )}
            <CheckBoxOne checked={p.overdueOnly} onChange={p.onOverdueChange} tone="brand">
                {t("szRegistry.overdueOnly")}
            </CheckBoxOne>
            <div className="text-[12.5px] text-[#8b97ab]">
                {t("szRegistry.found")}: <b className="font-mono text-[#3a4560]">{p.total}</b>
            </div>
            <button
                onClick={p.onExport}
                disabled={p.exporting || p.total === 0}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Download className="w-4 h-4"/> {p.exporting ? t("szRegistry.exporting") : t("szRegistry.exportExcel")}
            </button>
        </div>
    );
}
