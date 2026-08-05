// Компонента переключатель табов
import {type ReactNode} from "react";

interface TabItem<T extends string> {
    id: T;
    label: string;
    n: number;
    alignRight?: boolean;
    icon?: ReactNode;
}

interface TabsProps<T extends string> {
    tabs: TabItem<T>[];
    value: T;
    onChange: (value: T) => void;
}

export function Tabs<T extends string>({tabs, value, onChange}: TabsProps<T>) {
    return (
        <div className="flex items-center gap-[22px] border-b border-[#e9edf3] mb-4">
            {tabs.map((tab) => {
                const active = tab.id === value;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative inline-flex items-center gap-2 py-[9px] px-1 border-none bg-transparent text-[14px] cursor-pointer whitespace-nowrap ${
                            tab.alignRight ? "ml-auto" : ""
                        }`}
                    >
                        {tab.icon && (
                            <span className={`inline-flex items-center ${active ? "text-[#4e57d6]" : "text-[#8b97ab]"}`}>
                                {tab.icon}
                            </span>
                        )}
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