import {useCallback, useEffect, useState} from "react";
import {colors} from "@/design/tokens";
import {
    szArchiveService,
    type NomenclatureCase,
    type StorageTerm,
    type SzArchive,
} from "@/service/szService/szArchiveService.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return d && m && y ? `${d}.${m}.${y}` : "—";
}

interface Props {
    szId: number;
    statusCode: string;
    onChanged: () => Promise<void> | void;
}

/**
 * Архивное хранение (SZ-07): подшивка в дело номенклатуры, срок хранения,
 * год уничтожения. Показывается, когда работа по записке закончена.
 */
export function SzArchivePanel({szId, statusCode, onChanged}: Props) {
    const [archive, setArchive] = useState<SzArchive | null>(null);
    const [cases, setCases] = useState<NomenclatureCase[]>([]);
    const [terms, setTerms] = useState<StorageTerm[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [caseId, setCaseId] = useState(0);
    const [termId, setTermId] = useState<number | "">("");

    const load = useCallback(async () => {
        try {
            setArchive(await szArchiveService.get(szId));
        } catch {
            setError("Не удалось загрузить карточку хранения");
        }
    }, [szId]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        szArchiveService.cases().then(setCases).catch(() => setCases([]));
        szArchiveService.storageTerms().then(setTerms).catch(() => setTerms([]));
    }, []);

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            await onChanged();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const archived = archive?.isArchived ?? false;
    // Подшивают документ, работа по которому закончена.
    const canArchive = ["Executed", "Rejected", "Withdrawn"].includes(statusCode);

    if (!archived && !canArchive) return null;

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[15px] font-semibold">Архивное хранение</h2>
                <span className="text-[12.5px] font-semibold"
                      style={{color: archived ? colors.ryg.green.fg : colors.inkSubtle}}>
                    {archived ? `В деле с ${formatDate(archive?.archivedOn ?? null)}` : "Не подшита"}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {archived && archive ? (
                <>
                    <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                        <div className="text-[#1c2740]">
                            Дело {archive.caseIndex} · {archive.caseTitle}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                            Срок хранения: {archive.storageTerm ?? "—"}
                            {archive.caseClosedOn && ` · дело закрыто ${formatDate(archive.caseClosedOn)}`}
                        </div>
                        <div className="mt-0.5 text-[12.5px]"
                             style={{color: archive.destroyYearPending ? colors.ryg.amber.fg : colors.inkSubtle}}>
                            {archive.storageYears == null
                                ? "Хранение постоянное — уничтожению не подлежит"
                                : archive.destroyAfterYear != null
                                    ? `Уничтожить после ${archive.destroyAfterYear} года`
                                    : "Год уничтожения определится после закрытия дела"}
                        </div>
                    </div>
                    <button
                        onClick={() => run(() => szArchiveService.restore(szId), "Не удалось вернуть записку из архива")}
                        disabled={busy}
                        className="mt-3 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50"
                    >
                        Вернуть из архива
                    </button>
                </>
            ) : (
                <>
                    <div className="text-[13px] text-[#8b97ab]">
                        Работа по записке закончена — её можно подшить в дело номенклатуры.
                    </div>
                    <button
                        onClick={() => setFormOpen((v) => !v)}
                        className="mt-3 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        Подшить в дело
                    </button>

                    {formOpen && (
                        <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                            <div className="flex flex-wrap gap-2">
                                <select value={caseId} onChange={(e) => setCaseId(Number(e.target.value))}
                                        className={`${inputClass} flex-1 min-w-[280px]`}>
                                    <option value={0}>Дело номенклатуры…</option>
                                    {cases.map((c) => (
                                        <option key={c.id} value={c.id}>{c.index} · {c.titleRu} ({c.year})</option>
                                    ))}
                                </select>
                                <select value={termId} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
                                        className={`${inputClass} w-[240px]`}
                                        title="Если не выбрать, срок возьмётся из дела">
                                    <option value="">Срок хранения — как в деле</option>
                                    {terms.map((t) => <option key={t.id} value={t.id}>{t.titleRu}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    if (!caseId) { setError("Выберите дело номенклатуры"); return; }
                                    void run(async () => {
                                        await szArchiveService.archive(szId, caseId, termId === "" ? null : termId);
                                        setFormOpen(false);
                                        setCaseId(0);
                                        setTermId("");
                                    }, "Не удалось подшить записку в дело");
                                }}
                                disabled={busy}
                                className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                            >
                                Подшить и сдать в архив
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
