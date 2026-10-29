// Всплывающее уведомление при успехе, загрузки, предупреждении и др.
export type ToastVariant = "success" | "error" | "info" | "warning" | "loading";
/** "large" — шире и с большим лимитом строк: для длинных сообщений (номер, срок, тип подписи и т.п.). */
export type ToastSize = "default" | "large";

/** Параметры тоста объектом — вместо позиционных description/duration/onClick. */
export interface ToastOptions {
    description?: string;
    duration?: number;
    onClick?: () => void;
    size?: ToastSize;
}

export interface ToastItem {
    id: number;
    variant: ToastVariant;
    title: string;
    description?: string;
    duration: number; // 0 = не скрывать автоматически (используется для "loading")
    onClick?: () => void; // если задан - тост кликабелен (например, переход к уведомлению)
    size?: ToastSize;
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

function push(variant: ToastVariant, title: string, opts: ToastOptions = {}) {
    const id = nextId++;
    const { description, duration = 4500, onClick, size = "default" } = opts;
    toasts = [...toasts, { id, variant, title, description, duration, onClick, size }];
    emit();
    return id;
}

/** Второй аргумент — либо описание (старый позиционный вызов), либо объект параметров. */
function normalize(
    descriptionOrOptions?: string | ToastOptions,
    duration?: number,
    onClick?: () => void,
): ToastOptions {
    if (typeof descriptionOrOptions === "object" && descriptionOrOptions !== null) return descriptionOrOptions;
    return { description: descriptionOrOptions, duration, onClick };
}

type ShowFn = (
    title: string,
    descriptionOrOptions?: string | ToastOptions,
    duration?: number,
    onClick?: () => void,
) => number;

const make = (variant: Exclude<ToastVariant, "loading">): ShowFn =>
    (title, descriptionOrOptions, duration, onClick) =>
        push(variant, title, normalize(descriptionOrOptions, duration, onClick));

function update(id: number, patch: Partial<Omit<ToastItem, "id">>) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
}

export const toast = {
    success: make("success"),
    error: make("error"),
    warning: make("warning"),
    info: make("info"),
    loading: (title: string, description?: string) => push("loading", title, { description, duration: 0 }), // не скрывается сам
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
