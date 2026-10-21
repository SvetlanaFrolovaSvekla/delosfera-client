import {useEffect, useState} from "react";
import {Star} from "lucide-react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Оценки работы поставщика (ЗК-9): средний балл, история оценок и форма новой оценки.
 * Благонадёжность отвечает «можно ли работать», рейтинг — «как работал на деле».
 */
interface Rating {
    id: number;
    authorUserId: number;
    authorName: string | null;
    contractId: number | null;
    score: number;
    comment: string | null;
    createdAt: string;
}

interface RatingsResponse {
    average: number | null;
    count: number;
    items: Rating[];
}

interface Props {
    supplierId: number;
    supplierTitle: string;
    onClose: () => void;
    onChanged: () => void;
}

function Stars({value, size = 14}: {value: number; size?: number}) {
    return (
        <span style={{display: "inline-flex", gap: 1, verticalAlign: "middle"}}>
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
                    style={{width: size, height: size}}
                    fill={n <= value ? "#f5a623" : "none"}
                    color={n <= value ? "#f5a623" : "#cdd4df"}
                />
            ))}
        </span>
    );
}

export function SupplierRatingsModal({supplierId, supplierTitle, onClose, onChanged}: Props) {
    const [data, setData] = useState<RatingsResponse | null>(null);
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        const {data} = await apiClient.get<RatingsResponse>(`/procurement/suppliers/${supplierId}/ratings`);
        setData(data);
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierId]);

    async function submit() {
        if (score < 1) {
            setError("Поставьте оценку от 1 до 5");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await apiClient.post(`/procurement/suppliers/${supplierId}/ratings`, {
                score,
                comment: comment.trim() || undefined,
            });
            setScore(0);
            setComment("");
            await load();
            onChanged();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сохранить оценку");
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
                    <h2 style={{margin: 0, fontSize: 16, fontWeight: 700, color: "#0f1b2d"}}>Оценки поставщика</h2>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>{supplierTitle}</div>
                </div>

                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                    {data?.average != null ? (
                        <>
                            <Stars value={Math.round(data.average)} size={18}/>
                            <span style={{fontSize: 18, fontWeight: 700, color: "#0f1b2d"}}>{data.average.toFixed(1)}</span>
                            <span style={{fontSize: 12.5, color: "#8b97ab"}}>· {data.count} оцен.</span>
                        </>
                    ) : (
                        <span style={{fontSize: 13, color: "#8b97ab"}}>Оценок ещё нет</span>
                    )}
                </div>

                {/* Новая оценка */}
                <div style={{borderTop: "1px solid #eef2f7", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8}}>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                        <span style={{fontSize: 12.5, fontWeight: 600, color: "#55617a"}}>Ваша оценка:</span>
                        <span style={{display: "inline-flex", gap: 2}}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n} type="button" onClick={() => setScore(n)} title={`${n}`}
                                    style={{background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0}}
                                >
                                    <Star
                                        style={{width: 22, height: 22}}
                                        fill={n <= score ? "#f5a623" : "none"}
                                        color={n <= score ? "#f5a623" : "#cdd4df"}
                                    />
                                </button>
                            ))}
                        </span>
                    </div>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={2}
                        placeholder="Комментарий: сроки, качество, дисциплина поставки (необязательно)"
                        style={{
                            width: "100%", resize: "vertical", borderRadius: 9, border: "1px solid #e5e9f0",
                            padding: "8px 10px", fontSize: 13, font: "inherit", boxSizing: "border-box",
                        }}
                    />
                    {error && <div style={{fontSize: 12.5, color: "#c0392b"}}>{error}</div>}
                    <div style={{display: "flex", justifyContent: "flex-end"}}>
                        <button
                            type="button" onClick={submit} disabled={busy}
                            style={{
                                padding: "8px 14px", borderRadius: 9, border: "none", background: "#2f68f5",
                                color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer",
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            {busy ? "Сохраняю…" : "Оценить"}
                        </button>
                    </div>
                </div>

                {/* История */}
                <div style={{borderTop: "1px solid #eef2f7", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10}}>
                    {data && data.items.length === 0 && (
                        <div style={{fontSize: 12.5, color: "#8b97ab"}}>История пуста — станьте первым, кто оценит.</div>
                    )}
                    {data?.items.map(r => (
                        <div key={r.id} style={{display: "flex", flexDirection: "column", gap: 3}}>
                            <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                <Stars value={r.score}/>
                                <span style={{fontSize: 12, color: "#55617a"}}>{r.authorName ?? `#${r.authorUserId}`}</span>
                                <span style={{fontSize: 11, color: "#a3adbd"}}>
                                    {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                                </span>
                            </div>
                            {r.comment && <div style={{fontSize: 12.5, color: "#3a4560"}}>{r.comment}</div>}
                        </div>
                    ))}
                </div>

                <div style={{display: "flex", justifyContent: "flex-end"}}>
                    <button
                        type="button" onClick={onClose}
                        style={{
                            padding: "8px 14px", borderRadius: 9, border: "1px solid #e5e9f0", background: "#fff",
                            color: "#55617a", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
