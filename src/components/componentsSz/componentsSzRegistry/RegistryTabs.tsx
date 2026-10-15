// Вкладки реестра СЗ
import {useTranslation} from "react-i18next";
import type {SzCounters} from "@/service/szService/szService.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SCOPES, type ScopeId} from "./registryModel.ts";

interface Props {
    scope: ScopeId;
    counters: SzCounters | null;
    onSelect: (id: ScopeId) => void;
}

function scopeCount(counters: SzCounters | null, id: ScopeId): number | undefined {
    if (!counters) return undefined;
    if (id === "all") return counters.all;
    if (id === "drafts") return counters.drafts;
    if (id === "pending") return counters.pendingRegistration;
    if (id === "archive") return counters.archived;
    if (id === "signing") return counters.byStatus["OnSigning"] ?? 0;
    if (id === "mine") return counters.mine;
    if (id === "approval") return counters.inbox;
    if (id === "assignments") return counters.assignments;
    if (id === "originals") return counters.originals ?? undefined;
    if (id === "favorites") return counters.favorites;
    return undefined;
}

export function RegistryTabs({scope, counters, onSelect}: Props) {
    const {t} = useTranslation();
    return (
        <Tabs
            accent="blue"
            className="mt-5"
            value={scope}
            onChange={onSelect}
            tabs={SCOPES.map((s) => ({
                id: s.id,
                label: t(`szRegistry.scopes.${s.id}`),
                n: scopeCount(counters, s.id),
            }))}
        />
    );
}
