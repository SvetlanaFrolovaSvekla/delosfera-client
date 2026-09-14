import {useEffect, useState} from "react";
import {BookmarkPlus, Trash2} from "lucide-react";
import {szTemplateService, type SzTemplate, type SzTemplatePayload} from "@/service/szService/szTemplateService.ts";
import type {SzSaveRequest} from "@/service/szService/szService.ts";

/**
 * Шаблоны записки (СЗ-6): применить сохранённый пресет полей к новой записке или
 * сохранить текущую форму как шаблон. Показывается только при создании.
 */
interface Props {
    form: SzSaveRequest;
    onApply: (patch: Partial<SzSaveRequest>) => void;
    disabled?: boolean;
}

/** Пресет из шаблона → патч формы: переносим только заданные шаблоном поля. */
function payloadToPatch(p: SzTemplatePayload): Partial<SzSaveRequest> {
    const patch: Partial<SzSaveRequest> = {};
    if (p.kindId != null) patch.kindId = p.kindId;
    if (p.title != null) patch.title = p.title;
    if (p.body != null) patch.body = p.body;
    if (p.correspondentUnitId !== undefined) patch.correspondentUnitId = p.correspondentUnitId;
    if (p.addresseeUserId !== undefined) patch.addresseeUserId = p.addresseeUserId;
    if (p.signerUserId !== undefined) patch.signerUserId = p.signerUserId;
    if (p.approvalIsParallel != null) patch.approvalIsParallel = p.approvalIsParallel;
    if (p.isPaperCarrier !== undefined) patch.isPaperCarrier = p.isPaperCarrier;
    if (p.rubricIds) patch.rubricIds = p.rubricIds;
    if (p.approverUserIds) patch.approverUserIds = p.approverUserIds;
    return patch;
}

/** Текущая форма → пресет шаблона: сохраняем то, что имеет смысл переносить. */
function formToPayload(f: SzSaveRequest): SzTemplatePayload {
    return {
        kindId: f.kindId || null,
        title: f.title || null,
        body: f.body ?? null,
        correspondentUnitId: f.correspondentUnitId ?? null,
        addresseeUserId: f.addresseeUserId ?? null,
        signerUserId: f.signerUserId ?? null,
        approvalIsParallel: f.approvalIsParallel ?? null,
        isPaperCarrier: f.isPaperCarrier ?? null,
        rubricIds: f.rubricIds ?? [],
        approverUserIds: f.approverUserIds ?? [],
    };
}

export function SzTemplateBar({form, onApply, disabled}: Props) {
    const [templates, setTemplates] = useState<SzTemplate[]>([]);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        try {
            setTemplates(await szTemplateService.list());
        } catch {
            /* список шаблонов не критичен для создания — молча пропускаем */
        }
    }

    useEffect(() => {
        void reload();
    }, []);

    function apply(id: number) {
        const t = templates.find(x => x.id === id);
        if (t) onApply(payloadToPatch(t.payload));
    }

    async function save() {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Введите название шаблона");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await szTemplateService.create(trimmed, formToPayload(form));
            setName("");
            setNaming(false);
            await reload();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сохранить шаблон");
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        try {
            await szTemplateService.remove(id);
            await reload();
        } catch {
            /* удаление не удалось — оставляем список как есть */
        }
    }

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-[#f7f9fc] px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] font-semibold text-[#55617a]">Шаблоны записки</span>

            <select
                className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#0f1b2d] min-w-[200px]"
                value=""
                disabled={disabled || templates.length === 0}
                onChange={e => e.target.value && apply(Number(e.target.value))}
            >
                <option value="">
                    {templates.length === 0 ? "Нет сохранённых шаблонов" : "Применить шаблон…"}
                </option>
                {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>

            {!naming ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setNaming(true);
                        setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#2f68f5] cursor-pointer hover:bg-[#f0f4ff]"
                >
                    <BookmarkPlus className="w-4 h-4"/>
                    Сохранить как шаблон
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Название шаблона"
                        className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] min-w-[180px]"
                    />
                    <button
                        type="button" onClick={save} disabled={busy}
                        className="h-9 px-3 rounded-[9px] border-none bg-[#2f68f5] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
                    >
                        {busy ? "…" : "Сохранить"}
                    </button>
                    <button
                        type="button" onClick={() => {setNaming(false); setName(""); setError(null);}} disabled={busy}
                        className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#55617a] cursor-pointer"
                    >
                        Отмена
                    </button>
                </div>
            )}

            {templates.length > 0 && (
                <details className="ml-auto">
                    <summary className="text-[12px] text-[#8b97ab] cursor-pointer list-none">Управление</summary>
                    <div className="mt-2 flex flex-col gap-1">
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-[12.5px] text-[#3a4560]">
                                <span className="truncate max-w-[220px]">{t.name}</span>
                                <button
                                    type="button" title="Удалить шаблон" onClick={() => void remove(t.id)}
                                    className="text-[#c0392b] hover:opacity-70 cursor-pointer bg-transparent border-none p-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {error && <div className="w-full text-[12px] text-[#c0392b]">{error}</div>}
        </div>
    );
}
