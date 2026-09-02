import {useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {UpdateVndRequisitesRequest, VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {toast} from "@/service/toastService.ts";

export type ActualizationModeKey = "Quarterly" | "HalfYear" | "Annual" | "Biennial" | "Triennial" | "Custom";

export const ACTUALIZATION_MODE_OPTIONS: { key: ActualizationModeKey; label: string }[] = [
    {key: "Quarterly", label: "Квартал (3 мес.)"},
    {key: "HalfYear", label: "Полгода (6 мес.)"},
    {key: "Annual", label: "Год (12 мес.)"},
    {key: "Biennial", label: "2 года (24 мес.)"},
    {key: "Triennial", label: "3 года (36 мес.)"},
    {key: "Custom", label: "Указать дату вручную"},
];

const MONTHS_BY_MODE: Record<Exclude<ActualizationModeKey, "Custom">, number> = {
    Quarterly: 3,
    HalfYear: 6,
    Annual: 12,
    Biennial: 24,
    Triennial: 36,
};

function addMonthsIso(iso: string, months: number): string {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return "";
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function computeDueDateForMode(
    mode: ActualizationModeKey,
    fromIso: string,
    currentDue: string
): string {
    if (mode === "Custom") return currentDue;
    if (!fromIso) return currentDue;
    return addMonthsIso(fromIso, MONTHS_BY_MODE[mode]);
}

export interface VndRequisitesDraft {
    typeId: string;
    organId: string;
    developerId: string;
    curatorDeveloperId: string;
    responsibleExecutorIds: string[];

    titleRu: string;
    titleEn: string;
    titleKg: string;

    adoptionDate: string;
    adoptionCode: string;
    effectiveDate: string;

    // Режим периода чисто клиентское поле, на бэк не отправляется
    // При смене режима (кроме Custom) dueActualizationDate пересчитывается автоматически
    actualizationMode: ActualizationModeKey;
    dueActualizationDate: string;
    lastActualizationDate: string;
    lastActualizationHadChanges: boolean;

    cancelDate: string;
    cancelCode: string;
    cancelReason: string;
    archivedDate: string;
    daysInArchive: string;

    keywordIds: string[];
    rubricIds: string[];
    secrecyLevelId: string;
    userGroupIds: string[];
}

/**
 * ВСЕ реквизиты, кроме служебных дат цикла актуализации/отмены-архивации/групп доступа,
 * принадлежат КОНКРЕТНОЙ редакции (redaction) — включая заголовок и вид документа (см. миграцию
 * "реквизиты по редакции"). Если redaction не передан (например, у черновика ВНД ещё нет ни
 * одной загруженной редакции), эта часть временно берётся из vnd (как было раньше) — ровно тот
 * же fallback, что и на бэке (см. UpdateRequisitesAsync).
 */
function toDraft(vnd: VndResponse, redaction: VndRedactionResponse | null): VndRequisitesDraft {
    const typeId = redaction ? redaction.typeId : vnd.typeId;
    const titleRu = redaction ? redaction.titleRu : vnd.titleRu;
    const titleEn = redaction ? redaction.titleEn : vnd.titleEn;
    const titleKg = redaction ? redaction.titleKg : vnd.titleKg;
    const organId = redaction ? redaction.organId : vnd.organId;
    const developerId = redaction ? redaction.developerId : vnd.developerId;
    const curatorDeveloperId = redaction ? redaction.curatorDeveloperId : vnd.curatorDeveloperId;
    const responsibleExecutorIds = redaction ? redaction.responsibleExecutorIds : vnd.responsibleExecutorIds;
    const adoptionDate = redaction ? redaction.adoptionDate : vnd.adoptionDate;
    const adoptionCode = redaction ? redaction.adoptionCode : vnd.adoptionCode;
    const effectiveDate = redaction ? redaction.effectiveDate : vnd.effectiveDate;
    const keywordIds = redaction ? redaction.keywordIds : vnd.keywordIds;
    const rubricIds = redaction ? redaction.rubricIds : vnd.rubricIds;
    const secrecyLevelId = redaction ? redaction.secrecyLevelId : vnd.secrecyLevelId;

    return {
        typeId: String(typeId),
        organId: String(organId),
        developerId: developerId ? String(developerId) : "",
        curatorDeveloperId: curatorDeveloperId ? String(curatorDeveloperId) : "",
        responsibleExecutorIds: responsibleExecutorIds.map(String),

        titleRu: titleRu,
        titleEn: titleEn ?? "",
        titleKg: titleKg ?? "",

        adoptionDate: adoptionDate ?? "",
        adoptionCode: adoptionCode ?? "",
        effectiveDate: effectiveDate ?? "",

        actualizationMode: "Custom",
        dueActualizationDate: vnd.dueActualizationDate ?? "",
        lastActualizationDate: vnd.lastActualizationDate ?? "",
        lastActualizationHadChanges: vnd.lastActualizationHadChanges,

        cancelDate: vnd.cancelDate ?? "",
        cancelCode: vnd.cancelCode ?? "",
        cancelReason: vnd.cancelReason ?? "",
        archivedDate: vnd.archivedDate ?? "",
        daysInArchive: vnd.archivedDate ? String(vnd.daysInArchive) : "",

        keywordIds: keywordIds.map(String),
        rubricIds: rubricIds.map(String),
        secrecyLevelId: String(secrecyLevelId),
        userGroupIds: vnd.userGroupIds.map(String),
    };
}

function toRequest(draft: VndRequisitesDraft, redactionId: number | null): UpdateVndRequisitesRequest {
    return {
        redactionId,
        typeId: Number(draft.typeId),
        organId: Number(draft.organId),
        developerId: draft.developerId ? Number(draft.developerId) : null,
        curatorDeveloperId: draft.curatorDeveloperId ? Number(draft.curatorDeveloperId) : null,
        responsibleExecutorIds: draft.responsibleExecutorIds.map(Number),

        titleRu: draft.titleRu,
        titleEn: draft.titleEn || null,
        titleKg: draft.titleKg || null,

        adoptionDate: draft.adoptionDate || null,
        adoptionCode: draft.adoptionCode || null,
        effectiveDate: draft.effectiveDate || null,

        // actualizationMode на бэк не идёт — только уже посчитанная дата
        dueActualizationDate: draft.dueActualizationDate || null,
        lastActualizationDate: draft.lastActualizationDate || null,
        lastActualizationHadChanges: draft.lastActualizationHadChanges,

        cancelDate: draft.cancelDate || null,
        cancelCode: draft.cancelCode || null,
        cancelReason: draft.cancelReason || null,
        archivedDate: draft.archivedDate || null,
        daysInArchive: draft.daysInArchive ? Number(draft.daysInArchive) : null,

        keywordIds: draft.keywordIds.map(Number),
        rubricIds: draft.rubricIds.map(Number),
        secrecyLevelId: draft.secrecyLevelId ? Number(draft.secrecyLevelId) : null,
        userGroupIds: draft.userGroupIds.map(Number),
    };
}

/**
 * @param vnd документ — источник общих реквизитов (заголовки, вид документа)
 * @param redaction редакция, чьи реквизиты сейчас показаны/редактируются (активная вкладка
 *   Р1/Р2/.../Рn на вкладке "Реквизиты") — null, пока у ВНД ещё нет ни одной редакции
 * @param onSaved вызывается с обновлённым vnd после сохранения; вызывающая сторона также должна
 *   перезапросить список редакций (vndService.getRedactions), т.к. реквизиты редакции в VndResponse не входят
 */
export function useVndRequisitesForm(
    vnd: VndResponse,
    redaction: VndRedactionResponse | null,
    onSaved?: (updated: VndResponse) => void,
) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<VndRequisitesDraft>(() => toDraft(vnd, redaction));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startEdit = () => {
        setDraft(toDraft(vnd, redaction));
        setError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setDraft(toDraft(vnd, redaction));
        setError(null);
        setIsEditing(false);
    };

    function update<K extends keyof VndRequisitesDraft>(key: K, value: VndRequisitesDraft[K]) {
        setDraft((prev) => ({...prev, [key]: value}));
    }

    function periodFrom(current: VndRequisitesDraft): string {
        return current.lastActualizationDate || current.effectiveDate || current.adoptionDate || "";
    }

    function setActualizationMode(mode: ActualizationModeKey) {
        setDraft((prev) => ({
            ...prev,
            actualizationMode: mode,
            dueActualizationDate: computeDueDateForMode(mode, periodFrom(prev), prev.dueActualizationDate),
        }));
    }

    function updateDueDateManually(value: string) {
        setDraft((prev) => ({...prev, dueActualizationDate: value, actualizationMode: "Custom"}));
    }

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const updated = await vndService.updateRequisites(vnd.id, toRequest(draft, redaction?.id ?? null));
            onSaved?.(updated);
            setIsEditing(false);
            toast.success("Реквизиты обновлены", `Изменения по документу «${updated.code}» сохранены`);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Не удалось сохранить реквизиты";
            setError(message);
            toast.error("Ошибка сохранения", message);
        } finally {
            setSaving(false);
        }
    };

    return {
        isEditing, draft, saving, error,
        startEdit, cancelEdit, update, save,
        setActualizationMode, updateDueDateManually,
    };
}