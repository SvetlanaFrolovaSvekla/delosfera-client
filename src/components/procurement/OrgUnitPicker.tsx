import {useMemo, useRef, useState} from "react";
import {Check, ChevronDown, Search} from "lucide-react";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";

/**
 * Выбор подразделения поиском.
 *
 * В банке около двухсот подразделений: выпадающий список из двухсот строк
 * листают дольше, чем набирают три буквы названия.
 */

interface Props {
    units: OrganizationUnitResponse[];
    value: number | null;
    onChange: (unitId: number) => void;
    /** Подразделение из профиля — помечается как своё, чтобы подстановку было видно. */
    ownUnitId?: number | null;
    placeholder?: string;
}

export function OrgUnitPicker({units, value, onChange, ownUnitId, placeholder}: Props) {
    const [open, setOpen] = useState(false);
    const [запрос, setЗапрос] = useState("");

    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, open, () => setOpen(false));

    const выбранное = units.find((u) => u.id === value) ?? null;

    const найденные = useMemo(() => {
        const q = запрос.trim().toLowerCase();
        const подходят = q
            ? units.filter((u) => u.titleRu.toLowerCase().includes(q))
            : units;

        // Своё подразделение наверх: из него подаётся почти каждая заявка.
        return [...подходят].sort((a, b) =>
            Number(b.id === ownUnitId) - Number(a.id === ownUnitId));
    }, [units, запрос, ownUnitId]);

    return (
        <div ref={ref} style={{position: "relative"}}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    width: "100%", minHeight: 38, padding: "8px 12px", textAlign: "left",
                    border: "1px solid #e5e9f0", borderRadius: 10, background: "#fff",
                    font: "inherit", fontSize: 13, color: выбранное ? "#26324a" : "#8b97ab",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
            >
                <span style={{flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                    {выбранное?.titleRu ?? placeholder ?? "— выберите подразделение —"}
                </span>
                {выбранное && выбранное.id === ownUnitId && (
                    <span style={{flex: "none", fontSize: 11, color: "#2f68f5", background: "#eaf0ff", borderRadius: 5, padding: "2px 7px"}}>
                        ваше
                    </span>
                )}
                <ChevronDown size={15} style={{flex: "none", color: "#8b97ab"}}/>
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, right: 0,
                        background: "#fff", border: "1px solid #e5e9f0", borderRadius: 11,
                        boxShadow: "0 12px 32px -18px rgba(16,26,44,.35)", overflow: "hidden",
                    }}
                >
                    <div style={{display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #f2f5f9"}}>
                        <Search size={14} style={{color: "#8b97ab", flex: "none"}}/>
                        <input
                            autoFocus
                            value={запрос}
                            onChange={(e) => setЗапрос(e.target.value)}
                            placeholder="Название подразделения…"
                            style={{flex: 1, border: "none", outline: "none", font: "inherit", fontSize: 13}}
                        />
                    </div>

                    <div style={{maxHeight: 260, overflowY: "auto"}}>
                        {найденные.length === 0 && (
                            <div style={{padding: "12px 14px", fontSize: 12.5, color: "#8b97ab"}}>
                                Ничего не нашли
                            </div>
                        )}

                        {найденные.map((unit) => {
                            const выбран = unit.id === value;
                            return (
                                <button
                                    key={unit.id}
                                    type="button"
                                    onClick={() => { onChange(unit.id); setOpen(false); }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                                        padding: "9px 14px", border: "none",
                                        background: выбран ? "#f6f8fb" : "#fff",
                                        textAlign: "left", font: "inherit", fontSize: 13,
                                        color: "#26324a", cursor: "pointer",
                                    }}
                                >
                                    <span style={{flex: "none", width: 16, color: "#2f68f5"}}>
                                        {выбран && <Check size={14}/>}
                                    </span>
                                    <span style={{flex: 1, minWidth: 0}}>{unit.titleRu}</span>
                                    {unit.id === ownUnitId && (
                                        <span style={{flex: "none", fontSize: 11, color: "#8b97ab"}}>ваше</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
