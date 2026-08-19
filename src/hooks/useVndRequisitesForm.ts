import {useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {UpdateVndRequisitesRequest, VndResponse} from "@/service/vndService/vndServiceType.ts";
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

function toDraft(vnd: VndResponse): VndRequisitesDraft {
    return {
        typeId: String(vnd.typeId),
        organId: String(vnd.organId),
        developerId: vnd.developerId ? String(vnd.developerId) : "",
        curatorDeveloperId: vnd.curatorDeveloperId ? String(vnd.curatorDeveloperId) : "",
        responsibleExecutorIds: vnd.responsibleExecutorIds.map(String),

        titleRu: vnd.titleRu,
        titleEn: vnd.titleEn ?? "",
        titleKg: vnd.titleKg ?? "",

        adoptionDate: vnd.adoptionDate ?? "",
        adoptionCode: vnd.adoptionCode ?? "",
        effectiveDate: vnd.effectiveDate ?? "",

        actualizationMode: "Custom",
        dueActualizationDate: vnd.dueActualizationDate ?? "",
        lastActualizationDate: vnd.lastActualizationDate ?? "",
        lastActualizationHadChanges: vnd.lastActualizationHadChanges,

        cancelDate: vnd.cancelDate ?? "",
        cancelCode: vnd.cancelCode ?? "",
        cancelReason: vnd.cancelReason ?? "",
        archivedDate: vnd.archivedDate ?? "",
        daysInArchive: vnd.archivedDate ? String(vnd.daysInArchive) : "",

        keywordIds: vnd.keywordIds.map(String),
        rubricIds: vnd.rubricIds.map(String),
        secrecyLevelId: String(vnd.secrecyLevelId),
        userGroupIds: vnd.userGroupIds.map(String),
    };
}

function toRequest(draft: VndRequisitesDraft): UpdateVndRequisitesRequest {
    return {
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

export function useVndRequisitesForm(vnd: VndResponse, onSaved?: (updated: VndResponse) => void) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<VndRequisitesDraft>(() => toDraft(vnd));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startEdit = () => {
        setDraft(toDraft(vnd));
        setError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setDraft(toDraft(vnd));
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
            const updated = await vndService.updateRequisites(vnd.id, toRequest(draft));
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