import {useTranslation} from "react-i18next";
import {
    INBOX_ALL_TAB_ICON,
    INBOX_CONTOUR_META,
    INBOX_FILTER_IDS,
    INBOX_FILTER_LABEL_KEYS,
    type InboxFilterId,
} from "@/constants/taskInboxConst.ts";

interface TaskInboxFilterTabsProps {
    value: InboxFilterId;
    onChange: (id: InboxFilterId) => void;
}

/** Ряд вкладок-карточек над реестром задач: "Все контуры" + один пункт на контур. */
export function TaskInboxFilterTabs({value, onChange}: TaskInboxFilterTabsProps) {
    const {t} = useTranslation();

    return (
        <div className="flex flex-wrap gap-2.5">
            {INBOX_FILTER_IDS.map((id) => {
                const active = value === id;
                const label = t(INBOX_FILTER_LABEL_KEYS[id]);

                if (id === "all") {
                    const AllIcon = INBOX_ALL_TAB_ICON;
                    return (
                        <button
                            key={id}
                            onClick={() => onChange(id)}
                            className={
                                "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
                                (active
                                    ? "border-[#4e57d6] bg-[#ececfc] shadow-[0_4px_14px_-6px_rgba(78,87,214,0.35)]"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                            }
                        >
                            <span
                                className={
                                    "flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors " +
                                    (active ? "bg-[#4e57d6] text-white" : "bg-slate-100 text-slate-500")
                                }
                            >
                                <AllIcon className="h-4.5 w-4.5"/>
                            </span>
                            <span className={"truncate text-[13px] font-semibold " + (active ? "text-[#4e57d6]" : "text-slate-700")}>
                                {label}
                            </span>
                        </button>
                    );
                }

                const meta = INBOX_CONTOUR_META[id];
                const Icon = meta.icon;

                return (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={
                            "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
                            (active
                                ? "border-transparent shadow-[0_4px_14px_-6px_rgba(15,27,45,0.28)]"
                                : "border-slate-200 bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]")
                        }
                        style={active ? {backgroundColor: meta.bg, boxShadow: `inset 0 0 0 1.5px ${meta.ring}`} : undefined}
                    >
                        <span
                            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                            style={{backgroundColor: active ? "#fff" : meta.bg, color: meta.color}}
                        >
                            <Icon className="h-4.5 w-4.5"/>
                        </span>
                        <span className="truncate text-[13px] font-semibold text-slate-800">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
