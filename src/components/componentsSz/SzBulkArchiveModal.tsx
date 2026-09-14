import {useEffect, useState} from "react";
import {
    szArchiveService,
    type NomenclatureCase,
    type StorageTerm,
    type SzBulkResult,
} from "@/service/szService/szArchiveService.ts";

/**
 * Массовая сдача записок в архив (СЗ-7): вся отобранная пачка подшивается в одно
 * дело номенклатуры. Часть записок может не пройти проверку (не исполнена, оригинал
 * на руках) — итог показывает, сколько прошло и что не прошло, поимённо.
 */
interface Props {
    ids: number[];
    onClose: () => void;
    onDone: (result: SzBulkResult) => void;
}

export function SzBulkArchiveModal({ids, onClose, onDone}: Props) {
    const [cases, setCases] = useState<NomenclatureCase[]>([]);
    const [terms, setTerms] = useState<StorageTerm[]>([]);
    const [caseId, setCaseId] = useState<number | "">("");
    const [termId, setTermId] = useState<number | "">("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SzBulkResult | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const [c, t] = await Promise.all([szArchiveService.cases(), szArchiveService.storageTerms()]);
                setCases(c.filter(x => x.isActive));
                setTerms(t);
            } catch {
                setError("Не удалось загрузить дела номенклатуры");
            }
        })();
    }, []);

    async function submit() {
        if (caseId === "") {
            setError("Выберите дело, в которое подшить записки");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await szArchiveService.bulkArchive(ids, Number(caseId), termId === "" ? null : Number(termId));
            setResult(res);
            onDone(res);
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сдать записки в архив");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(15,27,45,0.4)", zIndex: 60,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: 14, width: "min(520px, 100%)", maxHeight: "85vh",
                    overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14,
                    boxShadow: "0 20px 60px -20px rgba(15,27,45,0.5)",
                }}
            >
                <div>
                    <h2 style={{margin: 0, fontSize: 16, fontWeight: 700, color: "#0f1b2d"}}>Сдать в архив</h2>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>Отобрано записок: {ids.length}</div>
                </div>

                {!result ? (
                    <>
                        <div>
                            <label style={{display: "block", fontSize: 12.5, fontWeight: 600, color: "#55617a", marginBottom: 6}}>
                                Дело номенклатуры
                            </label>
                            <select
                                value={caseId}
                                onChange={e => setCaseId(e.target.value === "" ? "" : Number(e.target.value))}
                                style={selectStyle}
                            >
                                <option value="">Выберите дело…</option>
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>{c.index ? `${c.index} — ${c.titleRu}` : c.titleRu}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{display: "block", fontSize: 12.5, fontWeight: 600, color: "#55617a", marginBottom: 6}}>
                                Срок хранения <span style={{color: "#a3adbd", fontWeight: 400}}>(необязательно — из дела)</span>
                            </label>
                            <select
                                value={termId}
                                onChange={e => setTermId(e.target.value === "" ? "" : Number(e.target.value))}
                                style={selectStyle}
                            >
                                <option value="">Взять из дела</option>
                                {terms.map(t => (
                                    <option key={t.id} value={t.id}>{t.code} — {t.titleRu}</option>
                                ))}
                            </select>
                        </div>

                        {error && <div style={{fontSize: 12.5, color: "#c0392b"}}>{error}</div>}

                        <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
                            <button type="button" onClick={onClose} disabled={busy} style={ghostBtn}>Отмена</button>
                            <button type="button" onClick={submit} disabled={busy} style={primaryBtn}>
                                {busy ? "Подшиваю…" : `Подшить ${ids.length}`}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{fontSize: 13, color: "#0f1b2d"}}>
                            Подшито в дело: <b style={{color: "#1f8a4c"}}>{result.succeeded}</b> из {result.requested}
                        </div>
                        {result.failed.length > 0 && (
                            <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                                <div style={{fontSize: 12.5, fontWeight: 600, color: "#c0392b"}}>
                                    Не прошли ({result.failed.length}):
                                </div>
                                {result.failed.map(f => (
                                    <div key={f.szId} style={{fontSize: 12, color: "#55617a"}}>
                                        <span style={{fontFamily: "monospace"}}>{f.regNumber ?? `#${f.szId}`}</span> — {f.message}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{display: "flex", justifyContent: "flex-end"}}>
                            <button type="button" onClick={onClose} style={primaryBtn}>Готово</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const selectStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 9, border: "1px solid #e5e9f0",
    padding: "0 10px", fontSize: 13, background: "#fff", boxSizing: "border-box",
};

const ghostBtn: React.CSSProperties = {
    padding: "8px 14px", borderRadius: 9, border: "1px solid #e5e9f0", background: "#fff",
    color: "#55617a", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
    padding: "8px 14px", borderRadius: 9, border: "none", background: "#2f68f5",
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
