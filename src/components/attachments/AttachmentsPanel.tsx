import {useCallback, useEffect, useRef, useState} from "react";
import {Paperclip, Trash2, Download} from "lucide-react";
import {
    attachmentService,
    formatFileSize,
    type Attachment,
} from "@/service/documentService/attachmentService.ts";

interface Props {
    /** Карточка, к которой цепляются файлы. null — карточка ещё не создана. */
    documentId: number | null;
    /** Файлы правит только тот, кто правит саму карточку. */
    editable: boolean;
    title?: string;
    /** Подпись, если вложение необязательно. */
    hint?: string;

    /**
     * Отложенный режим для мастера создания: карточки ещё нет, файлы копятся в
     * состоянии формы и уходят на сервер сразу после её создания.
     */
    pending?: File[];
    onPendingChange?: (files: File[]) => void;
}

/**
 * Вложения карточки: перетаскивание, вставка снимка экрана из буфера и обычный выбор файла.
 *
 * Снимок экрана — самый частый вид вложения в служебной записке и заявке: скриншот
 * ошибки, счёта, переписки. Через диалог выбора файла его сначала пришлось бы
 * сохранить на диск, поэтому вставка из буфера здесь не украшение, а основной путь.
 */
export function AttachmentsPanel({
    documentId, editable, title = "Вложения", hint, pending, onPendingChange,
}: Props) {
    const deferred = !documentId && !!onPendingChange;
    const [items, setItems] = useState<Attachment[]>([]);
    const [busy, setBusy] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const zone = useRef<HTMLDivElement>(null);

    const reload = useCallback(() => {
        if (!documentId) return;
        attachmentService.list(documentId).then(setItems).catch(() => setError("Не удалось загрузить вложения"));
    }, [documentId]);

    useEffect(reload, [reload]);

    const upload = useCallback(async (files: File[]) => {
        if (!files.length) return;

        if (!documentId) {
            // Карточки ещё нет — файлы ждут её создания в состоянии формы.
            if (onPendingChange) onPendingChange([...(pending ?? []), ...files]);
            return;
        }
        setBusy(true);
        setError(null);
        try {
            // Последовательно: сервер считает хеш каждого файла, и пачка параллельных
            // запросов ничего не ускоряет, зато мешает показать, какой файл не прошёл.
            for (const file of files) await attachmentService.upload(documentId, file);
            reload();
        } catch (e) {
            // Сервер отказывает по существу — формат, размер, несоответствие
            // содержимого расширению. Общее «не удалось» скрыло бы причину, и
            // пользователь просто повторял бы то же самое.
            const message = (e as { response?: { data?: { message?: string } } })
                .response?.data?.message;
            setError(message ?? "Не удалось приложить файл");
            reload();
        } finally {
            setBusy(false);
        }
    }, [documentId, reload, onPendingChange, pending]);

    // Вставка из буфера ловится, пока курсор в пределах блока вложений: иначе Ctrl+V
    // в тексте записки цеплял бы скриншот вместо вставки текста.
    useEffect(() => {
        if (!editable || (!documentId && !deferred)) return;

        const onPaste = (e: ClipboardEvent) => {
            if (!zone.current?.contains(document.activeElement) && !zone.current?.matches(":hover")) return;

            const files = Array.from(e.clipboardData?.files ?? []);
            if (!files.length) return;

            e.preventDefault();
            // У снимка экрана из буфера имени нет — без него список вложений
            // превратился бы в набор безымянных строк.
            void upload(files.map((f, i) => f.name
                ? f
                : new File([f], `Снимок экрана ${new Date().toLocaleString("ru-RU")}${i ? ` (${i + 1})` : ""}.png`,
                    {type: f.type})));
        };

        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
    }, [editable, documentId, deferred, upload]);

    const remove = async (attachment: Attachment) => {
        // Удаление подписанного файла аннулирует подписи под ним. Это решение
        // юридического веса, и терять его на случайном клике нельзя.
        if (attachment.signatureCount > 0 && !window.confirm(
            `Под файлом «${attachment.fileName}» есть подписи (${attachment.signatureCount}). `
            + "Удаление аннулирует их. Продолжить?")) {
            return;
        }

        setBusy(true);
        try {
            await attachmentService.remove(attachment.id);
            reload();
        } catch {
            setError("Не удалось удалить вложение");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-baseline justify-between mb-[5px]">
                <span className="block text-[11.5px] text-[#8b97ab]">{title}</span>
                {hint && <span className="text-[11.5px] text-[#a6b0c2]">{hint}</span>}
            </div>

            {editable && (
                <div
                    ref={zone}
                    tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        void upload(Array.from(e.dataTransfer.files));
                    }}
                    className={`rounded-[9px] border border-dashed px-4 py-5 text-center text-[13px] outline-none transition-colors ${
                        dragOver
                            ? "border-[#2f68f5] bg-[#f2f6ff] text-[#2f68f5]"
                            : "border-[#d6dded] bg-[#fafbfd] text-[#8b97ab] focus:border-[#2f68f5]"}`}
                >
                    {documentId || deferred ? (
                        <>
                            Перетащите файлы, вставьте снимки экрана или{" "}
                            <button
                                type="button"
                                onClick={() => fileInput.current?.click()}
                                disabled={busy}
                                className="border-none bg-transparent p-0 text-[13px] font-semibold text-[#2f68f5] underline cursor-pointer disabled:opacity-50"
                            >
                                обзор
                            </button>
                        </>
                    ) : (
                        "Сохраните черновик, чтобы приложить файлы"
                    )}
                    <div className="mt-1.5 text-[11.5px] text-[#a6b0c2]">
                        PDF, Word, Excel, PowerPoint, PNG, JPG · до 50 МБ
                    </div>
                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => {
                            void upload(Array.from(e.target.files ?? []));
                            e.target.value = "";
                        }}
                    />
                </div>
            )}

            {error && <div className="mt-2 text-[12.5px] text-[#c0392b]">{error}</div>}

            {deferred && (pending?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                    {pending!.map((f, i) => (
                        <div key={`${f.name}-${i}`}
                             className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px]">
                            <Paperclip size={14} className="text-[#8b97ab] shrink-0"/>
                            <span className="flex-1 truncate text-[#1c2740]">{f.name}</span>
                            <span className="text-[11.5px] text-[#8b97ab]">{formatFileSize(f.size)}</span>
                            <button type="button" title="Убрать"
                                    onClick={() => onPendingChange!(pending!.filter((_, x) => x !== i))}
                                    className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#c0392b]">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {items.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                    {items.map((a) => (
                        <div key={a.id}
                             className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px]">
                            <Paperclip size={14} className="text-[#8b97ab] shrink-0"/>
                            <span className="flex-1 truncate text-[#1c2740]">{a.fileName}</span>
                            <span className="text-[11.5px] text-[#8b97ab]">{formatFileSize(a.size)}</span>

                            {a.signatureCount > 0 && (
                                <span className="text-[11.5px] font-semibold text-[#1f8a4c]">
                                    подписей: {a.signatureCount}
                                </span>
                            )}
                            {a.hasRevokedSignatures && (
                                <span className="text-[11.5px] font-semibold text-[#b3730a]"
                                      title="Файл заменялся — прежние подписи аннулированы">
                                    подписи аннулированы
                                </span>
                            )}

                            <button type="button" onClick={() => void attachmentService.download(a)}
                                    title="Скачать"
                                    className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#2f68f5]">
                                <Download size={14}/>
                            </button>
                            {editable && (
                                <button type="button" onClick={() => void remove(a)} disabled={busy}
                                        title="Удалить"
                                        className="border-none bg-transparent p-1 text-[#55617a] cursor-pointer hover:text-[#c0392b] disabled:opacity-50">
                                    <Trash2 size={14}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
