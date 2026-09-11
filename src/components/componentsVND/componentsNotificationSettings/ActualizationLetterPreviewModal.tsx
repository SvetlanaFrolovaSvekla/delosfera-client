// Демонстрация письма ежемесячной сводки для одного СП — кнопка "Демонстрация письма" в
// ActualizationMonthlyDigestSection. Показывает тему, текст, имя вложения и получателей так,
// как они уйдут адресатам — письмо не отправляется, это только предпросмотр.
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Loader2, Paperclip, X} from "lucide-react";

import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    actualizationNotificationsService,
    type ActualizationNotificationPreview,
} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";

interface ActualizationLetterPreviewModalProps {
    onClose: () => void;
}

const BUCKET_META: {key: keyof Pick<ActualizationNotificationPreview,
    "normalCount" | "approachingCount" | "criticalCount" | "overdueCount">; label: string; color: string}[] = [
    {key: "normalCount", label: "В норме", color: "#1c7a4d"},
    {key: "approachingCount", label: "Приближается срок", color: "#2957c3"},
    {key: "criticalCount", label: "Критичный срок", color: "#b3730a"},
    {key: "overdueCount", label: "Просрочено", color: "#c0392b"},
];

export function ActualizationLetterPreviewModal({onClose}: ActualizationLetterPreviewModalProps) {
    const {orgUnitOptions} = useDictionaries();

    const [orgUnitId, setOrgUnitId] = useState(orgUnitOptions[0]?.key ?? "");
    const [preview, setPreview] = useState<ActualizationNotificationPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orgUnitId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        actualizationNotificationsService.preview(Number(orgUnitId))
            .then((data) => {
                if (!cancelled) setPreview(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось сформировать предпросмотр");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [orgUnitId]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex max-h-[90vh] w-full max-w-[620px] flex-col rounded-[16px] bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-[#eef2f7] px-6 py-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">Демонстрация письма</h2>
                        <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                            Так письмо увидят ответственные сотрудники выбранного СП — без отправки
                        </p>
                    </div>
                    <button onClick={onClose} className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <select
                        value={orgUnitId}
                        onChange={(e) => setOrgUnitId(e.target.value)}
                        className="mb-4 h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#1c2740]"
                    >
                        {orgUnitOptions.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                    </select>

                    {loading && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#4e57d6]"/></div>}

                    {error && (
                        <div className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}

                    {!loading && !error && preview && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                {BUCKET_META.map((b) => (
                                    <span key={b.key}
                                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e9f0] px-2.5 py-1 text-[12px] font-semibold"
                                          style={{color: b.color}}>
                                        {b.label}: {preview[b.key]}
                                    </span>
                                ))}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f8fb] px-2.5 py-1 text-[12px] font-semibold text-[#3a4560]">
                                    Всего: {preview.totalCount}
                                </span>
                            </div>

                            <div className="rounded-[12px] border border-[#eef2f7] p-4">
                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                                    Тема
                                </div>
                                <div className="mb-3 text-[13.5px] font-semibold text-[#1c2740]">
                                    {preview.subject}
                                </div>

                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                                    Текст
                                </div>
                                <div className="whitespace-pre-line text-[13px] leading-[1.6] text-[#3a4560]">
                                    {preview.body}
                                </div>

                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#f6f8fb] px-2.5 py-1.5 text-[12px] text-[#3a4560]">
                                    <Paperclip size={13}/>
                                    {preview.attachmentFileName}
                                </div>
                            </div>

                            <div>
                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[.06em] text-[#a3adbd]">
                                    Получатели
                                </div>
                                {preview.recipientNames.length > 0 ? (
                                    <div className="text-[13px] text-[#3a4560]">
                                        {preview.recipientNames.join(", ")}
                                    </div>
                                ) : (
                                    <div className="text-[13px] text-[#c0392b]">
                                        Для этого СП пока не назначены ответственные сотрудники — письмо
                                        отправлять некому
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[#eef2f7] px-6 py-4">
                    <button onClick={onClose}
                            className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
