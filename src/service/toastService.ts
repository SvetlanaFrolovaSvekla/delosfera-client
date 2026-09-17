// Всплывающее уведомление при успехе, загрузки, предупреждении и др.
export type ToastVariant = "success" | "error" | "info" | "warning" | "loading";

export interface ToastItem {
    id: number;
    variant: ToastVariant;
    title: string;
    description?: string;
    duration: number; // 0 = не скрывать автоматически (используется для "loading")
    onClick?: () => void; // если задан - тост кликабелен (например, переход к уведомлению)
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
    listeners.forEach((l) => l(toasts));
}

function remove(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function push(variant: ToastVariant, title: string, description?: string, duration = 4500, onClick?: () => void) {
    const id = nextId++;
    toasts = [...toasts, { id, variant, title, description, duration, onClick }];
    emit();
    return id;
}

function update(id: number, patch: Partial<Omit<ToastItem, "id">>) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
}

export const toast = {
    success: (title: string, description?: string, duration?: number, onClick?: () => void) =>
        push("success", title, description, duration, onClick),
    error: (title: string, description?: string, duration?: number, onClick?: () => void) =>
        push("error", title, description, duration, onClick),
    warning: (title: string, description?: string, duration?: number, onClick?: () => void) =>
        push("warning", title, description, duration, onClick),
    info: (title: string, description?: string, duration?: number, onClick?: () => void) =>
        push("info", title, description, duration, onClick),
    loading: (title: string, description?: string) => push("loading", title, description, 0), // не скрывается сам
    update,
    dismiss: remove,
    subscribe: (listener: Listener): (() => void) => {
        listeners.push(listener);
        listener(toasts);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    },
};
