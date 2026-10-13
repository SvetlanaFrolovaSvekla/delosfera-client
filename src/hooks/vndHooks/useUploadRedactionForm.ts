// Состояние и отправка формы "Загрузка новой редакции" (VndUploadRedactionModal)
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndRedactionAttachmentResponse, VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import {fileTooLargeMessage, REDACTION_MAX_FILE_SIZE} from "@/utils/vndProcess/uploadRedactionFiles.ts";

interface UseUploadRedactionFormParams {
    vndId: number;
    isActualization: boolean;
    lockedRequiresApproval?: boolean;
    previousAttachments?: VndRedactionAttachmentResponse[];
    onUploaded: (redaction: VndRedactionResponse) => void;
}

export function useUploadRedactionForm({
                                           vndId, isActualization, lockedRequiresApproval, previousAttachments, onUploaded,
                                       }: UseUploadRedactionFormParams) {
    const {t} = useTranslation();
    const {user, hasPermission} = useAuth();

    // Право обойтись без согласования - не имеет значения в режиме актуализации, там решение
    // уже зафиксировано при старте цикла (lockedRequiresApproval), см. AddRedactionAsync на бэке,
    // которая тоже игнорирует request.RequiresApproval в рамках открытого цикла актуализации.
    const canSkipApproval = !isActualization && hasPermission(PermissionCode.CreateVndWithoutApproval);

    // Роли пользователя, которые конкретно дают это право - чтобы показать в подсказке
    const grantingRoleNames = useMemo(() => {
        if (!canSkipApproval || !user) return [];
        return user.roles
            .filter((role) => role.permissionCodes.includes(PermissionCode.CreateVndWithoutApproval))
            .map((role) => role.name);
    }, [canSkipApproval, user]);

    const [docRu, setDocRu] = useState<File | null>(null);
    const [docKg, setDocKg] = useState<File | null>(null);
    const [docEn, setDocEn] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const [requiresApproval, setRequiresApproval] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Вложения ---
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentCountLimitHit, setAttachmentCountLimitHit] = useState(false);
    // Вложения предыдущей редакции, перенесённые в новую "как есть" - по умолчанию перенесены
    // все, можно убрать ненужные (тогда id уходит в removedExistingAttachmentIds).
    const [removedExistingAttachmentIds, setRemovedExistingAttachmentIds] = useState<Set<number>>(new Set());
    const keptExistingAttachments = (previousAttachments ?? [])
        .filter((a) => !removedExistingAttachmentIds.has(a.fileId));

    const toggleRemoveExistingAttachment = (fileId: number) => {
        setRemovedExistingAttachmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return next;
        });
    };

    const totalAttachmentCount = keptExistingAttachments.length + attachments.length;
    const attachmentSlotsLeft = VND_REDACTION_MAX_ATTACHMENTS - totalAttachmentCount;

    const addAttachments = (files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);

        const oversized = incoming.find((f) => f.size > REDACTION_MAX_FILE_SIZE);
        if (oversized) {
            setError(fileTooLargeMessage(oversized.name, t));
            return;
        }

        setError(null);
        const accepted = incoming.slice(0, Math.max(0, attachmentSlotsLeft));
        setAttachmentCountLimitHit(accepted.length < incoming.length);
        setAttachments((prev) => [...prev, ...accepted]);
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
        setAttachmentCountLimitHit(false);
    };

    const submit = async () => {
        if (!docRu) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await vndService.addRedaction(vndId, {
                docRu,
                docKg,
                docEn,
                description: description.trim() || undefined,
                // В режиме актуализации - решение, зафиксированное на старте цикла. Иначе, если
                // права на согласование без него нет - всегда true, независимо от чекбокса.
                // (Бэк всё равно перепроверяет это сам - см. VndService.AddRedactionAsync - это лишь для UX.)
                requiresApproval: isActualization
                    ? !!lockedRequiresApproval
                    : (canSkipApproval ? requiresApproval : true),
                attachments,
                existingAttachmentFileIds: keptExistingAttachments.map((a) => a.fileId),
            });
            onUploaded(result);
        } catch (e) {
            // Не удалось загрузить редакцию
            setError(e instanceof Error ? e.message : t("vndUploadRedactionModal.uploadError"));
        } finally {
            setSubmitting(false);
        }
    };

    return {
        docRu, setDocRu, docKg, setDocKg, docEn, setDocEn,
        description, setDescription,
        canSkipApproval, grantingRoleNames, requiresApproval, setRequiresApproval,
        attachments, addAttachments, removeAttachment, attachmentCountLimitHit,
        removedExistingAttachmentIds, toggleRemoveExistingAttachment,
        totalAttachmentCount, attachmentLimitReached: attachmentSlotsLeft <= 0,
        submitting, error, setError,
        canSubmit: docRu !== null && !submitting,
        submit,
    };
}
