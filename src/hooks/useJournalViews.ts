import {useCallback, useEffect, useState} from "react";
import {
    journalViewService,
    type JournalView,
    type JournalViewSaveRequest,
} from "@/service/journalViewService/journalViewService.ts";

/**
 * Представления журнала: загрузка, применение, сохранение.
 *
 * Держится рядом с видимостью колонок, а не заменяет её: колонки по-прежнему
 * переключаются галочками, а представление лишь запоминает получившийся набор
 * под именем и возвращает его при следующем заходе.
 *
 * Выбранное представление живёт в памяти вкладки. Записывать его на сервер при
 * каждом переключении незачем: человек листает наборы, сравнивая, и только
 * «по умолчанию» говорит о настоящем предпочтении.
 */
export function useJournalViews(
    journal: string,
    /** Что сейчас показано — ключи видимых колонок по порядку. */
    currentColumns: string[],
    /** Применить набор к таблице. */
    applyColumns: (columns: string[]) => void,
) {
    const [views, setViews] = useState<JournalView[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const list = await journalViewService.list(journal);
            setViews(list);
            return list;
        } catch {
            // Представления — удобство, а не работа. Не сумели загрузить —
            // журнал открывается со своими колонками по умолчанию.
            setError("Представления не загрузились");
            return [];
        }
    }, [journal]);

    // При первом открытии применяем представление по умолчанию, если оно есть.
    // Своё перевешивает общее: человек настроил под себя, и общее не должно
    // возвращать его к чужому набору каждое утро.
    useEffect(() => {
        let cancelled = false;

        load()
            .then((list) => {
                if (cancelled) return;

                const own = list.find((v) => v.isDefault && !v.isShared);
                const sharedDefault = list.find((v) => v.isDefault && v.isShared);
                const chosen = own ?? sharedDefault;

                if (chosen) {
                    setActiveId(chosen.id);
                    applyColumns(chosen.columns);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [journal]);

    const apply = (view: JournalView) => {
        setActiveId(view.id);
        applyColumns(view.columns);
    };

    /** Сбросить к колонкам журнала по умолчанию — представление больше не выбрано. */
    const reset = (defaults: string[]) => {
        setActiveId(null);
        applyColumns(defaults);
    };

    const save = async (request: JournalViewSaveRequest) => {
        setError(null);
        try {
            const created = await journalViewService.create(journal, {
                ...request,
                columns: currentColumns,
            });
            await load();
            setActiveId(created.id);
            return created;
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            setError(r.response?.data?.message ?? "Не удалось сохранить представление");
            return null;
        }
    };

    /** Перезаписать существующее тем, что показано сейчас. */
    const update = async (view: JournalView) => {
        setError(null);
        try {
            await journalViewService.update(view.id, {
                name: view.name,
                columns: currentColumns,
                isShared: view.isShared,
                orgUnitId: view.orgUnitId,
                isDefault: view.isDefault,
            });
            await load();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            setError(r.response?.data?.message ?? "Не удалось изменить представление");
        }
    };

    const remove = async (view: JournalView) => {
        setError(null);
        try {
            await journalViewService.remove(view.id);
            if (activeId === view.id) setActiveId(null);
            await load();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            setError(r.response?.data?.message ?? "Не удалось удалить представление");
        }
    };

    const active = views.find((v) => v.id === activeId) ?? null;

    /**
     * Показанный набор разошёлся с выбранным представлением — человек
     * переключил колонки после того, как применил его. Кнопка «сохранить»
     * должна появляться именно тогда, а не висеть всегда.
     */
    const isDirty =
        active !== null &&
        (active.columns.length !== currentColumns.length ||
            active.columns.some((c, i) => c !== currentColumns[i]));

    return {views, active, activeId, isDirty, loading, error, apply, reset, save, update, remove};
}
