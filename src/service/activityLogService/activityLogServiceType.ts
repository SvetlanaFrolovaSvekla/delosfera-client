export type ActivityIcon = "check" | "x" | "doc" | "clock" | "edit" | "info" | "trash";

export interface ActivityLogEntryResponse {
    id: number;
    module: string;
    entityId: number;
    entityCode: string;
    icon: ActivityIcon;
    text: string;
    url: string;
    createdAt: string; // ISO datetime

    // false — запись о чужом черновике ВНД, который текущему пользователю не открыть (см.
    // тот же критерий видимости, что и в реестре/на самой странице ВНД). true для всех
    // остальных записей, включая записки/закупки — там такого ограничения нет.
    canOpen: boolean;
}