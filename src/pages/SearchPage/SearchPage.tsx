import {useCallback, useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {
    scopeOptions,
    searchService,
    type SavedSearch,
    type SearchRequest,
    type SearchResult,
    type SearchScope,
} from "@/service/searchService/searchService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";

/**
 * Поиск по документам (GEN-02, GEN-04).
 *
 * Строка ищет по текстовым полям карточек, фильтры — по реквизитам. Содержимое
 * вложений пока не индексируется, и страница об этом честно предупреждает: искать
 * «внутри файлов» и не находить хуже, чем знать границы поиска.
 */
export const SearchPage = () => {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();

    const [form, setForm] = useState<SearchRequest>({
        query: params.get("q") ?? "",
        scopes: [],
        page: 1,
        pageSize: 20,
    });

    const [result, setResult] = useState<SearchResult | null>(null);
    const [saved, setSaved] = useState<SavedSearch[]>([]);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (request: SearchRequest) => {
        try {
            setBusy(true);
            setError(null);
            setResult(await searchService.search(request));
        } catch {
            setError("Поиск не выполнен");
        } finally {
            setBusy(false);
        }
    }, []);

    // Запрос из шапки приходит адресом — страница должна открываться уже с выдачей.
    useEffect(() => {
        const q = params.get("q") ?? "";
        setForm(prev => ({...prev, query: q, page: 1}));
        void run({...form, query: q, page: 1});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    useEffect(() => {
        searchService.saved().then(setSaved).catch(() => undefined);
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, []);

    const submit = (page = 1) => {
        const next = {...form, page};
        setForm(next);

        // Держим строку в адресе: выдачей делятся ссылкой.
        if ((next.query ?? "") !== (params.get("q") ?? "")) {
            setParams(next.query ? {q: next.query} : {});
        }

        void run(next);
    };

    const toggleScope = (scope: SearchScope) => {
        const current = form.scopes ?? [];
        const next = current.includes(scope)
            ? current.filter(s => s !== scope)
            : [...current, scope];

        const updated = {...form, scopes: next, page: 1};
        setForm(updated);
        void run(updated);
    };

    const saveFilter = async () => {
        const name = window.prompt("Название фильтра:");
        if (!name?.trim()) return;

        try {
            await searchService.save(name.trim(), form);
            setSaved(await searchService.saved());
        } catch {
            setError("Фильтр не сохранён");
        }
    };

    const applySaved = (item: SavedSearch) => {
        const criteria = {...item.criteria, page: 1};
        setForm(criteria);
        void run(criteria);
    };

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div>
                <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Поиск документов</h1>
                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                    По реквизитам карточек и их текстовым полям. Содержимое вложений пока не индексируется.
                </div>
            </div>

            <section style={card}>
                <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                    <input
                        value={form.query ?? ""}
                        onChange={e => setForm({...form, query: e.target.value})}
                        onKeyDown={e => e.key === "Enter" && submit()}
                        placeholder="Что ищем: тема, номер, текст решения…"
                        style={{...input, flex: 1, minWidth: 260}}
                    />
                    <button onClick={() => submit()} disabled={busy} style={primaryButton}>Найти</button>
                    <button onClick={saveFilter} disabled={busy} style={secondaryButton}>Сохранить фильтр</button>
                </div>

                <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10}}>
                    {scopeOptions.map(o => {
                        const active = (form.scopes ?? []).includes(o.value);
                        return (
                            <button key={o.value} onClick={() => toggleScope(o.value)}
                                    style={active ? {...chip, ...chipActive} : chip}>
                                {o.title}
                                {result?.countByScope?.[o.title] ? ` · ${result.countByScope[o.title]}` : ""}
                            </button>
                        );
                    })}
                </div>

                <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10}}>
                    <input type="date" value={form.from ?? ""}
                           onChange={e => setForm({...form, from: e.target.value || undefined})}
                           title="Создано с" style={{...input, width: 160}}/>
                    <input type="date" value={form.to ?? ""}
                           onChange={e => setForm({...form, to: e.target.value || undefined})}
                           title="Создано по" style={{...input, width: 160}}/>

                    <select value={form.orgUnitId ?? ""}
                            onChange={e => setForm({...form, orgUnitId: e.target.value ? Number(e.target.value) : undefined})}
                            style={{...input, width: 240}}>
                        <option value="">— подразделение —</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                    </select>

                    <input type="number" value={form.amountFrom ?? ""}
                           onChange={e => setForm({...form, amountFrom: e.target.value ? Number(e.target.value) : undefined})}
                           placeholder="Сумма от" style={{...input, width: 140}}/>
                    <input type="number" value={form.amountTo ?? ""}
                           onChange={e => setForm({...form, amountTo: e.target.value ? Number(e.target.value) : undefined})}
                           placeholder="Сумма до" style={{...input, width: 140}}/>
                </div>

                {saved.length > 0 && (
                    <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center"}}>
                        <span style={{fontSize: 11.5, color: "#8b97ab"}}>Сохранённые:</span>
                        {saved.map(s => (
                            <span key={s.id} style={chip}>
                                <button onClick={() => applySaved(s)} style={linkButton}>{s.name}</button>
                                <button
                                    onClick={async () => {
                                        await searchService.removeSaved(s.id);
                                        setSaved(await searchService.saved());
                                    }}
                                    style={{...linkButton, color: "#a3adbd", paddingLeft: 6}}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </section>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {result && (
                <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                    Найдено: {result.total}
                    {Object.entries(result.countByScope).map(([scope, count]) => ` · ${scope}: ${count}`)}
                </div>
            )}

            <section style={{display: "flex", flexDirection: "column", gap: 8}}>
                {(result?.items ?? []).map(hit => (
                    <div
                        key={`${hit.scope}-${hit.id}`}
                        onClick={() => navigate(hit.url)}
                        style={{...card, cursor: "pointer"}}
                    >
                        <div style={{display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap"}}>
                            <span style={{fontSize: 11, color: "#8b97ab", textTransform: "uppercase", letterSpacing: ".05em"}}>
                                {hit.scopeTitle}
                            </span>
                            {hit.regNumber && (
                                <span style={{fontSize: 12.5, fontWeight: 600, color: "#2f68f5"}}>{hit.regNumber}</span>
                            )}
                            <span style={{fontSize: 14, fontWeight: 600, color: "#0f1b2d"}}>{hit.title}</span>
                        </div>

                        {hit.snippet && (
                            <div style={{marginTop: 5, fontSize: 12.5, color: "#55617a", lineHeight: 1.6}}>
                                {hit.snippet}
                            </div>
                        )}

                        <div style={{marginTop: 6, fontSize: 11.5, color: "#8b97ab"}}>
                            {[
                                hit.statusTitle,
                                hit.authorName,
                                hit.orgUnitTitle,
                                hit.amount ? `${hit.amount.toLocaleString("ru-RU")} сом` : null,
                                new Date(hit.createdAt).toLocaleDateString("ru-RU"),
                            ].filter(Boolean).join(" · ")}
                        </div>
                    </div>
                ))}

                {result && result.items.length === 0 && (
                    <div style={{...card, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Ничего не нашлось. Попробуйте часть слова — поиск понимает начало: «серв» найдёт «серверное».
                    </div>
                )}
            </section>

            {result && result.total > result.pageSize && (
                <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                    <button onClick={() => submit(Math.max(1, (form.page ?? 1) - 1))}
                            disabled={busy || (form.page ?? 1) <= 1} style={secondaryButton}>
                        Назад
                    </button>
                    <span style={{fontSize: 12.5, color: "#8b97ab", alignSelf: "center"}}>
                        страница {result.page}
                    </span>
                    <button onClick={() => submit((form.page ?? 1) + 1)}
                            disabled={busy || result.page * result.pageSize >= result.total}
                            style={secondaryButton}>
                        Вперёд
                    </button>
                </div>
            )}
        </div>
    );
};

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const input: React.CSSProperties = {
    height: 36, padding: "0 11px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 36, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 36, padding: "0 14px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const chip: React.CSSProperties = {
    display: "inline-flex", alignItems: "center",
    padding: "6px 11px", borderRadius: 9, border: "1px solid #e5e9f0",
    background: "#fff", color: "#55617a", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const chipActive: React.CSSProperties = {
    borderColor: "#2f68f5", background: "#eef3ff", color: "#2f68f5",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "none", padding: 0, color: "inherit",
    font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};
