import {useState} from "react";
import {ACTUALIZATION_COLUMNS, getToggleableActualizationColumns} from "@/constants/actualizationColumns.ts";

// Доп. колонки, включённые по умолчанию (обязательные и так всегда видны)
const DEFAULT_VISIBLE: string[] = ["type", "developer"];

export function useVndActualizationColumnVisibility() {
    const toggleable = getToggleableActualizationColumns();

    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
        Object.fromEntries(toggleable.map((c) => [c.key, DEFAULT_VISIBLE.includes(c.key)]))
    );

    const toggleColumn = (key: string) =>
        setVisibleCols((prev) => ({...prev, [key]: !(prev[key] === true)}));

    const selectAllColumns = () =>
        setVisibleCols(Object.fromEntries(toggleable.map((c) => [c.key, true])));

    const deselectAllColumns = () =>
        setVisibleCols(Object.fromEntries(toggleable.map((c) => [c.key, false])));

    const columns = ACTUALIZATION_COLUMNS.filter((c) => c.fixed || visibleCols[c.key] === true);
    const gridTemplate = columns.map((c) => c.width).join(" ");

    return {
        visibleCols, toggleColumn, selectAllColumns, deselectAllColumns,
        columns, gridTemplate, toggleableColumns: toggleable,
    };
}