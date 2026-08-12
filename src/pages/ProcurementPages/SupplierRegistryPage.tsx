import {useCallback, useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Реестр поставщиков и чёрный список недобросовестных (PRC-07/17).
 * Ограничение ставится сроком: по его истечении допуск восстанавливается сам,
 * поэтому в списке видно, действует запрет или уже истёк.
 */

interface Supplier {
    id: number;
    title: string;
    inn: string | null;
    directorName: string | null;
    isAffiliated: boolean;
    isReliable: boolean | null;
    reliabilityCheckedOn: string | null;
    hasTaxClearance: boolean;
    hasSocialFundClearance: boolean;
    isBlacklisted: boolean;
    blacklistReason: string | null;
    blacklistedUntil: string | null;
    blacklistExpired: boolean;
}

const BASE = "/api/procurement/suppliers";

export const SupplierRegistryPage = () => {
    const [items, setItems] = useState<Supplier[]>([]);
    const [query, setQuery] = useState("");
    const [onlyBlacklisted, setOnlyBlacklisted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const {data} = await apiClient.get<Supplier[]>(BASE, {
            params: {query: query.trim() || undefined, blacklistedOnly: onlyBlacklisted || undefined},
        });
        setItems(data);
    }, [query, onlyBlacklisted]);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<unknown>) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await load();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    const blacklist = (s: Supplier) => {
        const reason = window.prompt(`Обоснование включения «${s.title}» в чёрный список (приложение №4):`);
        if (!reason?.trim()) return;
        const until = window.prompt("Срок ограничения (ГГГГ-ММ-ДД), пусто — бессрочно:")?.trim();
        return run(() => apiClient.post(`${BASE}/${s.id}/blacklist`, {reason: reason.trim(), until: until || undefined}));
    };

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div>
                <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Поставщики</h1>
                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                    Благонадёжность (PRC-07) и чёрный список недобросовестных поставщиков (PRC-17)
                </div>
            </div>

            <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Поиск по наименованию или ИНН…"
                    style={{flex: 1, minWidth: 240, height: 36, padding: "0 12px", border: "1px solid #e5e9f0",
                        borderRadius: 9, background: "#f6f8fb", font: "inherit", fontSize: 12.5, outline: "none"}}
                />
                <label style={{display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#55617a"}}>
                    <input type="checkbox" checked={onlyBlacklisted}
                           onChange={e => setOnlyBlacklisted(e.target.checked)}
                           style={{accentColor: "#2f68f5"}}/>
                    только чёрный список
                </label>
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={th}>Поставщик</th>
                            <th style={th}>Благонадёжность</th>
                            <th style={th}>Чёрный список</th>
                            <th style={th}/>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(s => (
                            <tr key={s.id} style={{borderTop: "1px solid #eef2f7"}}>
                                <td style={td}>
                                    <div style={{fontWeight: 600}}>{s.title}</div>
                                    <div style={{fontSize: 11, color: "#8b97ab"}}>
                                        {s.inn ? `ИНН ${s.inn}` : "ИНН не указан"}
                                        {s.isAffiliated && " · аффилированное лицо"}
                                    </div>
                                </td>
                                <td style={td}>
                                    {s.isReliable === null
                                        ? <span style={{color: "#8b97ab"}}>не проверялась</span>
                                        : s.isReliable
                                            ? <span style={{color: "#1f8a4c", fontWeight: 600}}>благонадёжен</span>
                                            : <span style={{color: "#c0392b", fontWeight: 600}}>заключение отрицательное</span>}
                                    {s.reliabilityCheckedOn && (
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>
                                            проверено {s.reliabilityCheckedOn}
                                            {s.hasTaxClearance && " · налоговая справка"}
                                            {s.hasSocialFundClearance && " · Соцфонд"}
                                        </div>
                                    )}
                                </td>
                                <td style={td}>
                                    {!s.isBlacklisted
                                        ? <span style={{color: "#8b97ab"}}>—</span>
                                        : (
                                            <>
                                                <span style={{color: s.blacklistExpired ? "#8b97ab" : "#c0392b", fontWeight: 600}}>
                                                    {s.blacklistExpired ? "срок истёк" : "в чёрном списке"}
                                                </span>
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>
                                                    {s.blacklistReason}
                                                    {s.blacklistedUntil && ` · до ${s.blacklistedUntil}`}
                                                </div>
                                            </>
                                        )}
                                </td>
                                <td style={{...td, whiteSpace: "nowrap"}}>
                                    {s.isBlacklisted ? (
                                        <button onClick={() => run(() => apiClient.delete(`${BASE}/${s.id}/blacklist`))}
                                                disabled={busy} style={button}>Снять ограничение</button>
                                    ) : (
                                        <button onClick={() => blacklist(s)} disabled={busy} style={button}>
                                            В чёрный список
                                        </button>
                                    )}
                                    <button
                                        onClick={() => run(() => apiClient.post(`${BASE}/${s.id}/reliability`,
                                            {isReliable: true, hasTaxClearance: true, hasSocialFundClearance: true}))}
                                        disabled={busy}
                                        style={{...button, marginLeft: 6}}
                                    >
                                        Заключение ДБ
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {items.length === 0 && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Поставщиков нет — они заводятся при регистрации коммерческих предложений
                    </div>
                )}
            </section>
        </div>
    );
};

const th: React.CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "11px 14px", verticalAlign: "top", color: "#26324a"};

const button: React.CSSProperties = {
    height: 30, padding: "0 12px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
