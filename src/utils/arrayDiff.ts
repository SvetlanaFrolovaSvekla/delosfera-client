// Общий diff двух массивов (алгоритм Майерса, O((N+M)·D)) — используется для построчного (по
// абзацам) сравнения действующей и новой редакции ВНД при автоформировании строк таблицы ТИД
// (см. useTidDiffRows.ts). В отличие от textDiff.ts, который сравнивает слова внутри текста,
// здесь сравниваются произвольные элементы массива (тексты целых абзацев) — сам алгоритм тот же.

export type ArrayDiffOpType = "equal" | "remove" | "add";

export interface ArrayDiffOp {
    type: ArrayDiffOpType;
    /** индекс элемента в старом массиве — задан для "equal" и "remove" */
    oldIndex?: number;
    /** индекс элемента в новом массиве — задан для "equal" и "add" */
    newIndex?: number;
}

/**
 * Различия между старым и новым массивом на уровне отдельных элементов.
 * Возвращает null, если массивы слишком велики/различны (см. maxEditDistance) — считать
 * дальше слишком долго, лучше показать таблицу без автоформирования, чем подвесить модалку.
 */
export function diffArrays<T>(
    a: T[],
    b: T[],
    equal: (x: T, y: T) => boolean = (x, y) => x === y,
    maxEditDistance = 4000,
): ArrayDiffOp[] | null {
    const n = a.length;
    const m = b.length;
    if (n === 0 && m === 0) return [];

    const max = Math.min(n + m, maxEditDistance);
    let v: Record<number, number> = {1: 0};
    const trace: Record<number, number>[] = [];
    let found = false;

    findPath:
    for (let d = 0; d <= max; d++) {
        trace.push({...v});
        for (let k = -d; k <= d; k += 2) {
            let x: number;
            if (k === -d || (k !== d && (v[k - 1] ?? -Infinity) < (v[k + 1] ?? -Infinity))) {
                x = v[k + 1] ?? 0;
            } else {
                x = (v[k - 1] ?? 0) + 1;
            }
            let y = x - k;
            while (x < n && y < m && equal(a[x], b[y])) {
                x++;
                y++;
            }
            v[k] = x;
            if (x >= n && y >= m) {
                found = true;
                break findPath;
            }
        }
    }

    if (!found) return null; // упёрлись в лимит различий — документы слишком разные

    type RawOp = {type: ArrayDiffOpType; aIdx?: number; bIdx?: number};
    const rawOps: RawOp[] = [];
    let x = n;
    let y = m;

    for (let d = trace.length - 1; d >= 0; d--) {
        let prevX: number;
        let prevY: number;
        if (d === 0) {
            prevX = 0;
            prevY = 0;
        } else {
            const vAtD = trace[d];
            const k = x - y;
            const prevK = (k === -d || (k !== d && (vAtD[k - 1] ?? -Infinity) < (vAtD[k + 1] ?? -Infinity)))
                ? k + 1
                : k - 1;
            prevX = vAtD[prevK] ?? 0;
            prevY = prevX - prevK;
        }

        while (x > prevX && y > prevY) {
            rawOps.push({type: "equal", aIdx: x - 1, bIdx: y - 1});
            x--;
            y--;
        }

        if (d > 0) {
            if (x === prevX) {
                rawOps.push({type: "add", bIdx: y - 1});
            } else {
                rawOps.push({type: "remove", aIdx: x - 1});
            }
        }

        x = prevX;
        y = prevY;
    }
    rawOps.reverse();

    return rawOps.map((raw): ArrayDiffOp => ({type: raw.type, oldIndex: raw.aIdx, newIndex: raw.bIdx}));
}
