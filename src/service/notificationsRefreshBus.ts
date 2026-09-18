// Шина "пришло новое уведомление" - без деталей самого уведомления, просто сигнал
// "стоит перепроверить данные". Слушатели - хуки виджетов, которым имеет смысл
// обновиться при новом уведомлении (Последняя активность, Последние уведомления,
// Мои задачи и т.п. - см. useRecentActivity.ts, useRecentNotifications.ts,
// useVndTasks.ts, useTaskInbox.ts). Публикует NotificationsDropdown.tsx, когда его
// периодический опрос находит что-то новое.
type Listener = () => void;
let listeners: Listener[] = [];

export const notificationsRefreshBus = {
    notify() {
        listeners.forEach((l) => l());
    },
    subscribe(listener: Listener): () => void {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    },
};
