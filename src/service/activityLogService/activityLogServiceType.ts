export type ActivityIcon = "check" | "x" | "doc" | "clock" | "edit" | "info";

export interface ActivityLogEntryResponse {
    id: number;
    module: string;
    entityId: number;
    entityCode: string;
    icon: ActivityIcon;
    text: string;
    url: string;
    createdAt: string; // ISO datetime
}