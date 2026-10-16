// Компонента переключатель табов
import {type ReactNode} from "react";

interface TabItem<T extends string> {
    id: T; // T - идентификатор вкладки
    label: string;
    /** Счётчик рядом с названием. Не задан — не рисуется: на вкладках, где
     *  считать нечего, ноль в кружке читается как "пусто". */
    n?: number;
    alignRight?: boolean;
    icon?: ReactNode;
}

/** Акцентный цвет активной вкладки. По умолчанию фиолетовый; */
type TabsAccent = "indigo" | "blue";

const ACCENTS: Record<TabsAccent, { text: string; line: string; chip: string }> = {
    indigo: {text: "text-[#4e57d6]", line: "bg-[#4e57d6]", chip: "bg-[#ececfc] text-[#4e57d6]"},
    blue: {text: "text-[#2f68f5]", line: "bg-[#2f68f5]", chip: "bg-[#e9f0ff] text-[#2f68f5]"},
};

interface TabsProps<T extends string> {
    tabs: TabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
    accent?: TabsAccent;
}

export function Tabs<T extends string>({tabs, value, onChange, className = "mb-4", accent = "indigo"}: TabsProps<T>) {
    const c = ACCENTS[accent];
    return (
        // Панель прокручивается по горизонтали, если табы не влазят
        <div className={`overflow-x-auto overflow-y-hidden pb-1 ${className}`}>
            <div className="flex items-center gap-[22px] w-max min-w-full border-b border-[#e9edf3]">
                {tabs.map((tab) => {
                    const active = tab.id === value;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`relative inline-flex items-center gap-2 py-[9px] px-1 border-none bg-transparent text-[14px] cursor-pointer whitespace-nowrap shrink-0 ${
                                tab.alignRight ? "ml-auto" : ""
                            }`}
                        >
                            {tab.icon && (
                                <span className={`inline-flex items-center ${active ? c.text : "text-[#8b97ab]"}`}>
                                {tab.icon}
                            </span>
                            )}
                            <span className={active ? `${c.text} font-bold` : "text-[#8b97ab] font-medium"}>
                            {tab.label}
                        </span>
                            {tab.n !== undefined && (
                                <span
                                    className={`font-mono text-[11px] font-bold py-[1px] px-[7px] rounded-full ${
                                        active ? c.chip : "bg-[#f2f5f9] text-[#a3adbd]"
                                    }`}
                                >
                                {tab.n}
                            </span>
                            )}
                            {active && (
                                <span className={`absolute left-0 right-0 bottom-0 h-[2px] rounded-full ${c.line}`}/>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}