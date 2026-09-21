import {useEffect, useMemo, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";
import type {TreeSelectOption} from "@/components/componentsGeneral/selects/MultiSelects/TreeMultiSelectModal.tsx";

export interface OrgUnitOption {
    id: number;
    name: string;
    parentId: number | null;
}

interface RawOrgUnitResponse {
    id: number;
    name: string;
    parentId: number | null;
}

async function fetchOrgUnits(): Promise<OrgUnitOption[]> {
    const {data} = await axiosInstance.get<RawOrgUnitResponse[]>("/dictionaries/organization-unit");
    return data.map((o) => ({id: o.id, name: o.name, parentId: o.parentId}));
}

/** Общий хук иерархического фильтра по СП — используется во всех пикерах пользователей
 * (VndSelectApproverModal, SelectActualizationResponsibleModal и т.д.), чтобы не дублировать
 * загрузку справочника и вычисление TreeSelectOption/Set<id>. */
export function useOrgUnitFilter() {
    const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        fetchOrgUnits()
            .then((data) => { if (!cancelled) setOrgUnits(data); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const treeOptions: TreeSelectOption[] = useMemo(
        () => orgUnits.map((ou) => ({
            key: String(ou.id),
            label: ou.name,
            parentId: ou.parentId !== null ? String(ou.parentId) : undefined,
        })),
        [orgUnits],
    );

    const selectedIds = useMemo(() => new Set(selectedKeys.map(Number)), [selectedKeys]);

    return {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading, error};
}