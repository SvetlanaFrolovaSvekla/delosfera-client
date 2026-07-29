import type {VndScope} from "@/service/mockData/BaseVndData.tsx";

interface ScopeTab {
    id: VndScope;
    label: string;
    n: number;
}

interface VndScopeTabsProps {
    tabs: ScopeTab[];
    scope: VndScope;
    onChange: (scope: VndScope) => void;
}

export function VndScopeTabs({tabs, scope, onChange}: VndScopeTabsProps) {
    return (
        <div className="flex items-center gap-[22px] border-b border-[#e9edf3] mb-4">
            {tabs.map((tab) => {
                const active = tab.id === scope;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className="relative inline-flex items-center gap-2 py-[9px] px-1 border-none bg-transparent text-[14px] cursor-pointer whitespace-nowrap"
                    >
                        <span className={active ? "text-[#4e57d6] font-bold" : "text-[#8b97ab] font-medium"}>
                            {tab.label}
                        </span>
                        <span
                            className={`font-mono text-[11px] font-bold py-[1px] px-[7px] rounded-full ${
                                active
                                    ? "bg-[#ececfc] text-[#4e57d6]"
                                    : "bg-[#f2f5f9] text-[#a3adbd]"
                            }`}
                        >
                            {tab.n}
                        </span>
                        {active && (
                            <span className="absolute left-0 right-0 -bottom-px h-[1px] rounded-full bg-[#4e57d6]"/>
                        )}
                    </button>
                );
            })}
        </div>
    );
}