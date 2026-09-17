// Настройка "показывать всплывающие уведомления (тосты)" при получении новых уведомлений.
// Хранится в localStorage конкретного браузера, а не на бэке: это про то, всплывает ли тост
// именно в ЭТОМ окне, а не про канал доставки самого уведомления (как email-дайджест в
// notificationSettingService.ts). По умолчанию включено.
const STORAGE_KEY = "delosfera.notifications.popupEnabled";

function read(): boolean {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw === null ? true : raw === "1";
    } catch {
        // приватный режим/недоступное хранилище - считаем, что включено
        return true;
    }
}

let enabled = read();
type Listener = (value: boolean) => void;
let listeners: Listener[] = [];

export const notificationPopupPreference = {
    isEnabled(): boolean {
        return enabled;
    },
    set(value: boolean) {
        enabled = value;
        try {
            localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
        } catch {
            // квота/приватный режим - переживём и без сохранения между сессиями
        }
        listeners.forEach((l) => l(enabled));
    },
    subscribe(listener: Listener): () => void {
        listeners.push(listener);
        listener(enabled);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    },
};
