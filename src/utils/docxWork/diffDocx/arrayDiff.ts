// Общий diff двух массивов (алгоритм Майерса)
import {myersDiff} from "./myersDiff";

export type ArrayDiffOpType = "equal" | "remove" | "add";

export interface ArrayDiffOp {
    type: ArrayDiffOpType;
    oldIndex?: number;
    newIndex?: number;
}

export function diffArrays<T>(
    a: T[],
    b: T[],
    equal: (x: T, y: T) => boolean = (x, y) => x === y,
    maxEditDistance = 4000,
): ArrayDiffOp[] | null {
    const raw = myersDiff(a, b, equal, maxEditDistance);
    if (raw === null) return null;
    return raw.map((r): ArrayDiffOp => ({type: r.type, oldIndex: r.aIdx, newIndex: r.bIdx}));
}