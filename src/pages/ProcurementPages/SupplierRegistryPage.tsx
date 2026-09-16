import {useCallback, useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";
import {SupplierRatingsModal} from "@/components/procurement/SupplierRatingsModal.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

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
    averageRating: number | null;
    ratingCount: number;
}

const BASE = "/procurement/suppliers";

// Заведение/изменение поставщика, чёрный список и заключение ДБ требуют право
// ManageSuppliers (см. [RequirePermission] на бэке в SupplierController) - без него запрос
// падает 403 с сырым "Операция не выполнена". Чтобы до этого не доходило, кнопки блокируются
// на фронте с тултипом-пояснением. Сам просмотр реестра и оценки поставщика (ЗК-9) прав не
// требуют - там ничего не блокируем.
const NO_MANAGE_SUPPLIERS_TOOLTIP = "У Вас нет прав на управление поставщиками!";

export const SupplierRegistryPage = () => {
    const {hasPermission} = useAuth();
    const canManageSuppliers = hasPermission(PermissionCode.ManageSuppliers);
    const [items, setItems] = useState<Supplier[]>([]);
    const [query, setQuery] = useState("");
    const [onlyBlacklisted, setOnlyBlacklisted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Новый поставщик — чтобы завести его и внести в чёрный список, не дожидаясь заявки. */
    const [draft, setDraft] = useState({title: "", inn: ""});
    /** Открыта карточка оценок этого поставщика (ЗК-9). */
    const [ratingSupplier, setRatingSupplier] = useState<Supplier | null>(null);

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

    const addSupplier = () => {
        if (!draft.title.trim()) return;
        return run(async () => {
            await apiClient.post(BASE, {title: draft.title.trim(), inn: draft.inn.trim() || undefined});
            setDraft({title: "", inn: ""});
        });
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
                    Благонадёжность и чёрный список недобросовестных поставщиков
                </div>
            </div>

            <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
                <SearchBar
                    value={query}
                    onChange={setQuery}
                    placeholder="Поиск по наименованию или ИНН…"
                    className="min-w-[240px]"
                />
                <CheckBoxOne checked={onlyBlacklisted} onChange={setOnlyBlacklisted}>
                    только чёрный список
                </CheckBoxOne>
            </div>

            {/* Завести поставщика вручную: без этого в реестр попадали только те, кто
                подал КП, и внести в чёрный список нового поставщика было нельзя. */}
            <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
                <input
                    value={draft.title}
                    onChange={e => setDraft({...draft, title: e.target.value})}
                    placeholder="Наименование нового поставщика"
                    style={{minWidth: 260, height: 36, padding: "0 12px", border: "1px solid #e5e9f0",
                        borderRadius: 9, background: "#fff", font: "inherit", fontSize: 12.5, outline: "none"}}
                />
                <input
                    value={draft.inn}
                    onChange={e => setDraft({...draft, inn: e.target.value})}
                    placeholder="ИНН"
                    style={{width: 160, height: 36, padding: "0 12px", border: "1px solid #e5e9f0",
                        borderRadius: 9, background: "#fff", font: "inherit", fontSize: 12.5, outline: "none"}}
                />
                <Tooltip content={NO_MANAGE_SUPPLIERS_TOOLTIP} disabled={canManageSuppliers} side="top">
                    <button
                        onClick={addSupplier}
                        disabled={busy || !draft.title.trim() || !canManageSuppliers}
                        className="cursor-pointer inline-flex h-[36px] items-center gap-2 rounded-[9px] border-none bg-[#2f68f5] px-[12px] text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-default disabled:hover:brightness-100">
                        Добавить поставщика
                    </button>
                </Tooltip>
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={th}>Поставщик</th>
                            <th style={th}>Благонадёжность</th>
                            <th style={th}>Чёрный список</th>
                            <th style={th}>Рейтинг</th>
                            <th style={th}/>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(s => (
                            <tr key={s.id} style={{borderTop: "1px solid #eef2f7"}}>
                                <td style={td}>
                                    <div style={{fontWeight: 600}}>
                                        <HighlightText text={s.title} query={query}/>
                                    </div>
                                    <div style={{fontSize: 11, color: "#8b97ab"}}>
                                        {s.inn
                                            ? <>ИНН <HighlightText text={s.inn} query={query}/></>
                                            : "ИНН не указан"}
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
                                <td style={td}>
                                    {s.averageRating != null ? (
                                        <span style={{whiteSpace: "nowrap"}}>
                                            <span style={{color: "#f5a623"}}>★</span>{" "}
                                            <span style={{fontWeight: 700, color: "#0f1b2d"}}>{s.averageRating.toFixed(1)}</span>{" "}
                                            <span style={{color: "#8b97ab", fontSize: 11}}>· {s.ratingCount}</span>
                                        </span>
                                    ) : (
                                        <span style={{color: "#8b97ab"}}>—</span>
                                    )}
                                </td>
                                <td style={{...td, whiteSpace: "nowrap"}}>
                                    <button onClick={() => setRatingSupplier(s)} disabled={busy} style={{...button, marginRight: 6}}>
                                        Оценки
                                    </button>
                                    <Tooltip content={NO_MANAGE_SUPPLIERS_TOOLTIP} disabled={canManageSuppliers} side="top">
                                        {s.isBlacklisted ? (
                                            <button onClick={() => run(() => apiClient.delete(`${BASE}/${s.id}/blacklist`))}
                                                    disabled={busy || !canManageSuppliers}
                                                    style={canManageSuppliers ? button : disabledButton}>Снять ограничение</button>
                                        ) : (
                                            <button onClick={() => blacklist(s)} disabled={busy || !canManageSuppliers}
                                                    style={canManageSuppliers ? button : disabledButton}>
                                                В чёрный список
                                            </button>
                                        )}
                                    </Tooltip>
                                    <Tooltip content={NO_MANAGE_SUPPLIERS_TOOLTIP} disabled={canManageSuppliers} side="top">
                                        <button
                                            onClick={() => run(() => apiClient.post(`${BASE}/${s.id}/reliability`,
                                                {isReliable: true, hasTaxClearance: true, hasSocialFundClearance: true}))}
                                            disabled={busy || !canManageSuppliers}
                                            style={{...(canManageSuppliers ? button : disabledButton), marginLeft: 6}}
                                        >
                                            Заключение ДБ
                                        </button>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {items.length === 0 && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Поставщиков нет — заведите вручную выше или они появятся при регистрации коммерческих предложений
                    </div>
                )}
            </section>

            {ratingSupplier && (
                <SupplierRatingsModal
                    supplierId={ratingSupplier.id}
                    supplierTitle={ratingSupplier.title}
                    onClose={() => setRatingSupplier(null)}
                    onChanged={() => void load()}
                />
            )}
        </div>
    );
};

const th: React.CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "11px 14px", verticalAlign: "top", color: "#26324a"};

const button: React.CSSProperties = {
    height: 30, padding: "0 12px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const disabledButton: React.CSSProperties = {
    ...button, color: "#a3adbd", cursor: "not-allowed", opacity: 0.6,
};
