// Пословный diff двух текстов (алгоритм Майерса, O((N+M)·D), без внешних зависимостей).
// Используется для подсветки различий между редакциями ВНД в модалке сравнения.

export type DiffOpType = "equal" | "remove" | "add";

export interface DiffOp {
    type: DiffOpType;
    /** [start, end) в старом тексте — задан для "equal" и "remove" */
    oldRange?: [number, number];
    /** [start, end) в новом тексте — задан для "equal" и "add" */
    newRange?: [number, number];
}

interface Token {
    value: string;
    start: number;
    end: number;
}

function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        tokens.push({value: m[0], start: m.index, end: m.index + m[0].length});
    }
    return tokens;
}

/**
 * Пословные различия между старым и новым текстом.
 * Возвращает null, если документы слишком велики/различны — считать дальше слишком
 * долго (см. maxEditDistance), в этом случае подсветку лучше не показывать вовсе,
 * чем подвесить вкладку на десятки секунд.
 */
export function diffWords(oldText: string, newText: string, maxEditDistance = 2000): DiffOp[] | null {
    const oldTokens = tokenize(oldText);
    const newTokens = tokenize(newText);

    const a = oldTokens.map((t) => t.value);
    const b = newTokens.map((t) => t.value);
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
            while (x < n && y < m && a[x] === b[y]) {
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

    type RawOp = {type: DiffOpType; aIdx?: number; bIdx?: number};
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

    // Схлопываем соседние токены одного типа в непрерывные диапазоны символов
    const ops: DiffOp[] = [];
    for (const raw of rawOps) {
        const last = ops[ops.length - 1];
        if (raw.type === "equal") {
            const oldTok = oldTokens[raw.aIdx!];
            const newTok = newTokens[raw.bIdx!];
            if (last && last.type === "equal" && last.oldRange![1] === oldTok.start && last.newRange![1] === newTok.start) {
                last.oldRange![1] = oldTok.end;
                last.newRange![1] = newTok.end;
            } else {
                ops.push({type: "equal", oldRange: [oldTok.start, oldTok.end], newRange: [newTok.start, newTok.end]});
            }
        } else if (raw.type === "remove") {
            const oldTok = oldTokens[raw.aIdx!];
            if (last && last.type === "remove" && last.oldRange![1] === oldTok.start) {
                last.oldRange![1] = oldTok.end;
            } else {
                ops.push({type: "remove", oldRange: [oldTok.start, oldTok.end]});
            }
        } else {
            const newTok = newTokens[raw.bIdx!];
            if (last && last.type === "add" && last.newRange![1] === newTok.start) {
                last.newRange![1] = newTok.end;
            } else {
                ops.push({type: "add", newRange: [newTok.start, newTok.end]});
            }
        }
    }

    return ops;
}
