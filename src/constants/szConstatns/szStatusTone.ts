import type {SzStatusCode} from "@/service/szService/szService.ts";
import {colors} from "@/design/tokens.ts";

/** Цвета статусов служебных записок - общие для реестра и доски записок. */
export const STATUS_TONE: Partial<Record<SzStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    PendingRegistration: colors.status.onact,
    OnSigning: colors.status.review,
    OnBoardReview: colors.status.review,
    Registered: colors.status.review,
    OnRevision: colors.status.onact,
    OnAddresseeDecision: colors.status.review,
    OnExecution: colors.status.consol,
    Executed: colors.status.active,
    Rejected: colors.status.arch,
    Withdrawn: colors.status.draft,
    Archived: colors.status.arch,
};
