// Пословный diff двух текстов (алгоритм Майерса).=
// Используется для подсветки различий между редакциями ВНД в модалке сравнения
import {myersDiff} from "./myersDiff";

export type DiffOpType = "equal" | "remove" | "add";

export interface DiffOp {
    type: DiffOpType;
    oldRange?: [number, number];
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

export function diffWords(oldText: string, newText: string, maxEditDistance = 2000): DiffOp[] | null {
    const oldTokens = tokenize(oldText);
    const newTokens = tokenize(newText);

    const raw = myersDiff(
        oldTokens.map((t) => t.value),
        newTokens.map((t) => t.value),
        (x, y) => x === y,
        maxEditDistance,
    );
    if (raw === null) return null;

    const ops: DiffOp[] = [];
    for (const r of raw) {
        const last = ops[ops.length - 1];
        if (r.type === "equal") {
            const oldTok = oldTokens[r.aIdx!];
            const newTok = newTokens[r.bIdx!];
            if (last && last.type === "equal" && last.oldRange![1] === oldTok.start && last.newRange![1] === newTok.start) {
                last.oldRange![1] = oldTok.end;
                last.newRange![1] = newTok.end;
            } else {
                ops.push({type: "equal", oldRange: [oldTok.start, oldTok.end], newRange: [newTok.start, newTok.end]});
            }
        } else if (r.type === "remove") {
            const oldTok = oldTokens[r.aIdx!];
            if (last && last.type === "remove" && last.oldRange![1] === oldTok.start) {
                last.oldRange![1] = oldTok.end;
            } else {
                ops.push({type: "remove", oldRange: [oldTok.start, oldTok.end]});
            }
        } else {
            const newTok = newTokens[r.bIdx!];
            if (last && last.type === "add" && last.newRange![1] === newTok.start) {
                last.newRange![1] = newTok.end;
            } else {
                ops.push({type: "add", newRange: [newTok.start, newTok.end]});
            }
        }
    }

    return ops;
}