/**
 * Кеш справочников на время работы вкладки.
 *
 * Справочники подставляются почти в каждую форму: подразделения, должности,
 * сотрудники, виды документов. Загружались они при каждом открытии раздела
 * заново — переход между разделами ждал сеть ради данных, которые не менялись
 * с прошлой минуты. Меняет их администратор, и заметно реже, чем по ним ходят.
 *
 * Хранится в памяти вкладки: перезагрузка страницы начинает с чистого листа.
 * Этого достаточно — лечится повторная загрузка при переходах, а не первая.
 */

/** Сколько считаем значение свежим. */
const DefaultTtlMs = 5 * 60 * 1000;

interface Entry {
    /** Значение, если загрузка уже завершилась. */
    value?: unknown;
    /** Когда значение перестанет считаться свежим. */
    expiresAt: number;
    /**
     * Летящий запрос. Второй вызов во время загрузки должен получить тот же
     * промис: иначе три поля на форме, открытой разом, дают три одинаковых
     * запроса вместо одного.
     */
    inFlight?: Promise<unknown>;
}

const entries = new Map<string, Entry>();

/**
 * Вернуть значение из кеша или загрузить его.
 *
 * @param key    Ключ. Если у запроса есть параметры, они должны входить в ключ:
 *               иначе отфильтрованный список подменит собой полный.
 * @param loader Как загрузить, если в кеше нет.
 * @param ttlMs  Сколько считать свежим.
 */
export async function cached<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number = DefaultTtlMs,
): Promise<T> {
    const now = Date.now();
    const entry = entries.get(key);

    if (entry?.inFlight) return entry.inFlight as Promise<T>;
    if (entry && entry.expiresAt > now && "value" in entry) return entry.value as T;

    const inFlight = loader()
        .then((value) => {
            entries.set(key, {value, expiresAt: Date.now() + ttlMs});
            return value;
        })
        .catch((error) => {
            // Неудачную загрузку не запоминаем: иначе разрыв связи на секунду
            // оставил бы форму без справочника на все пять минут.
            entries.delete(key);
            throw error;
        });

    entries.set(key, {expiresAt: now + ttlMs, inFlight});
    return inFlight as Promise<T>;
}

/**
 * Забыть загруженное.
 *
 * Без аргумента — всё: так делают при смене пользователя, потому что часть
 * справочников зависит от прав вошедшего. С префиксом — только его: после
 * правки должности незачем перезагружать оргструктуру.
 */
export function invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
        entries.clear();
        return;
    }

    for (const key of entries.keys()) {
        if (key.startsWith(keyPrefix)) entries.delete(key);
    }
}
