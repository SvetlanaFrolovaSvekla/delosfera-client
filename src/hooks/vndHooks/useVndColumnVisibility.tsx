import {useState} from "react";
import type {VndScope} from "@/constants/vndTabs.ts";
import {getColumnsForScope, getToggleableColumns} from "@/constants/columnsFilters/vndColumns.ts";

const DEFAULT_VISIBLE_ALL_ACTIVE: string[] = ["act", "status"];
const DEFAULT_VISIBLE_ARCH: string[] = ["status"];
const DEFAULT_VISIBLE_DRAFT: string[] = ["status"];

function buildDefaultVisibility(scope: VndScope): Record<string, boolean> {
    const toggleable = getToggleableColumns(scope);
    const defaultVisible =
        scope === "arch" ? DEFAULT_VISIBLE_ARCH :
            scope === "draft" ? DEFAULT_VISIBLE_DRAFT :
                DEFAULT_VISIBLE_ALL_ACTIVE;

    return Object.fromEntries(toggleable.map((c) => [c.key, defaultVisible.includes(c.key)]));
}

export function useVndColumnVisibility(scope: VndScope) {
    const [visibleColsByScope, setVisibleColsByScope] = useState<Record<VndScope, Record<string, boolean>>>({
        all: buildDefaultVisibility("all"),
        active: buildDefaultVisibility("active"),
        draft: buildDefaultVisibility("draft"),
        arch: buildDefaultVisibility("arch"),
    });

    const visibleCols = visibleColsByScope[scope];

    const toggleColumn = (key: string) =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: {...prev[scope], [key]: !(prev[scope][key] === true)},
        }));

    const selectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope).map((c) => [c.key, true])),
        }));

    const deselectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope).map((c) => [c.key, false])),
        }));

    const allColumns = getColumnsForScope(scope);
    const columns = allColumns.filter((c) => c.fixed || visibleCols[c.key] === true);
    const gridTemplate = columns.map((c) => c.width).join(" ");
    const toggleableColumns = getToggleableColumns(scope);

    return {visibleCols, toggleColumn, selectAllColumns, deselectAllColumns, columns, gridTemplate, toggleableColumns};
}