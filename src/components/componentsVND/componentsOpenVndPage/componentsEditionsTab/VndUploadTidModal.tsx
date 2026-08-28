// Модалка "Сформировать или загрузить ТИД" — прикладывает файл ТИД (Таблица изменений и
// дополнений) к уже загруженному черновику последней редакции отдельным шагом (поле ТИД убрано
// из формы загрузки самой редакции — см. VndUploadRedactionModal). Помимо ручной загрузки файла,
// модалка показывает автоформированную табличку изменений (см. TidChangesTable) — построчное
// сравнение действующей и новой редакции с подсветкой различий, как в матрице разногласий, чтобы
// помочь заполнить сам ТИД; сам файл ТИД по-прежнему прикладывается вручную.
import {useState} from "react";
import {createPortal} from "react-dom";
import {FileUp, Loader2, Trash2, X} from "lucide-react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {useTidDiffRows} from "@/hooks/vndHooks/useTidDiffRows.ts";
import {TidChangesTable} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/TidChangesTable.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

interface VndUploadTidModalProps {
    vndId: number;
    redactionCode: string;
    /** Название ВНД на русском (vnd.titleRu) - подставляется в заголовок "к «…»" шаблона ТИД. */
    vndTitle: string;
    /** RU-файл действующей редакции (до этого черновика) — источник для автосравнения. null,
     * если действующей редакции нет (первая редакция ВНД ТИД не требует, сюда попасть не должна). */
    previousFileId: number | null;
    /** RU-файл черновика редакции, к которому прикладывается ТИД. */
    draftFileId: number | null;
    /** Ответственный за актуализацию этой ВНД - предзаполняет строку "Разработано:" под таблицей. */
    defaultResponsibleUserId: number | null;
    defaultResponsibleUserName: string | null;
    /** Право изменять поле "Разработчик" сформированного ТИД — доступно главному редактору и
     * администратору; остальные видят поле без выпадающего списка. */
    canSelectResponsible: boolean;
    /** Доступна ли этому пользователю публикация редакции без согласования — влияет только на
     * формулировку вводного текста модалки (см. ниже). */
    canUploadWithoutApproval: boolean;
    onClose: () => void;
    onUploaded: (redaction: VndRedactionResponse) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function VndUploadTidModal({
                                       vndId, redactionCode, vndTitle, previousFileId, draftFileId,
                                       defaultResponsibleUserId, defaultResponsibleUserName, canSelectResponsible,
                                       canUploadWithoutApproval,
                                       onClose, onUploaded,
                                   }: VndUploadTidModalProps) {
    const [tid, setTid] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Публикация без согласования доступна этому пользователю только если он одновременно может
    // и загружать редакции без согласования, и менять разработчика ТИД - иначе текст ниже говорит
    // только про отправку на согласование.
    const canPublishWithoutApproval = canUploadWithoutApproval && canSelectResponsible;

    const {rows, status} = useTidDiffRows(previousFileId, draftFileId);

    const handlePick = (picked: File | null) => {
        if (picked && picked.size > MAX_FILE_SIZE) {
            setError(`Файл «${picked.name}» превышает допустимый размер (${formatBytes(MAX_FILE_SIZE)})`);
            return;
        }
        setError(null);
        setTid(picked);
    };

    const handleSubmit = async () => {
        if (!tid) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.uploadTidForLastRedaction(vndId, tid);
            onUploaded(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось загрузить ТИД");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex h-full max-h-[90vh] w-[95vw] max-w-[1240px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">

                <div className="flex flex-none items-center justify-between border-b border-[#eef2f7] px-6 py-4">
                    <h2 className="text-[16px] font-bold text-[#1c2740]">
                        Загрузка ТИД — {redactionCode}
                    </h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <Clue className="mb-4">
                        ТИД (Таблица изменений и дополнений) — документ, необходимый для отправки этой
                        редакции на согласование{canPublishWithoutApproval ? " или публикации без согласования" : ""}.
                        Ниже — автоматически сформированная таблица изменений между действующей и новой редакцией:
                        используйте её как основу при подготовке и заполнении самого файла ТИД (пожалуйста, проверьте
                        корректность сформированного текста, добавьте обоснование изменений, отредактируйте необходимые
                        места).
                        {canPublishWithoutApproval && " Вы также обладаете правом изменения поля \"Разработчик\"."}
                        {" "}Далее Вы можете скачать сформированный ТИД, проверить корректность сформированного
                        по шаблону ТИД и загрузить его в систему.
                    </Clue>

                    <div className="mb-6 flex flex-col gap-3 rounded-[14px] border border-[#e5e9f0] bg-[#f9fafc] p-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                            <div className="mb-[6px] text-[12.5px] font-semibold text-[#26324a]">
                                Загрузите ТИД (Таблица изменений и дополнений) к данной редакции: <span className="text-[#c0392b]">*</span>
                            </div>
                            {!tid ? (
                                <label
                                    htmlFor="upload-tid-file"
                                    className="flex h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-white text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                    <FileUp size={18}/>
                                    <span className="text-[11.5px]">Выбрать файл (DOCX)</span>
                                    <input
                                        id="upload-tid-file"
                                        type="file"
                                        accept=".doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            handlePick(e.target.files?.[0] ?? null);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
                                    <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{tid.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setTid(null)}
                                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                    >
                                        <Trash2 size={15}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}

                    <TidChangesTable
                        autoRows={rows}
                        loading={status === "loading"}
                        unavailable={status === "unavailable" || status === "error"}
                        exportFileName={`ТИД_${redactionCode}.docx`}
                        defaultResponsibleUserId={defaultResponsibleUserId}
                        defaultResponsibleUserName={defaultResponsibleUserName}
                        canSelectResponsible={canSelectResponsible}
                        vndTitle={vndTitle}
                    />

                    <div className="mt-6 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        Автоформирование самого файла ТИД по этой таблице находится в разработке — пока
                        таблица служит вспомогательным материалом, а файл ТИД прикладывается вручную.
                    </div>
                </div>

                <div className="flex flex-none justify-end gap-2 border-t border-[#eef2f7] px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!tid || submitting}
                        className="cursor-pointer flex h-[38px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin"/>}
                        Загрузить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
