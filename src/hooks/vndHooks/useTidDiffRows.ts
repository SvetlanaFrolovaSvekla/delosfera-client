// Автоформирование строк таблицы ТИД (см. TidChangesTable / VndUploadTidModal): построчное
// (по абзацам) сравнение действующей и новой (черновой) редакции. Абзацы сравниваются
// diffArrays'ом (кто добавлен/удалён/не изменился), последовательные добавленные/удалённые
// абзацы схлопываются в одну строку-"ганк" (как в самой матрице разногласий — попадают только
// реальные расхождения), а внутри ганка ещё раз считается пословный diffWords — тот же
// алгоритм и те же диапазоны, что использует useDocxDiffHighlight.ts в "Просмотр и сравнение
// редакций", только результат рендерится не в DOM, а как обычные React-сегменты в ячейках таблицы.
import {useEffect, useState} from "react";
import {fetchFileBlob} from "@/utils/downloadFile.ts";
import {extractDocxParagraphs} from "@/utils/docxParagraphs.ts";
import {diffArrays} from "@/utils/arrayDiff.ts";
import {diffWords} from "@/utils/textDiff.ts";

export interface TidDiffSegment {
    text: string;
    hl: boolean;
}

export interface TidAutoRow {
    id: string;
    oldSegments: TidDiffSegment[];
    newSegments: TidDiffSegment[];
}

export type TidDiffStatus = "idle" | "loading" | "done" | "error" | "unavailable";

function buildSegments(oldText: string, newText: string): {oldSegments: TidDiffSegment[]; newSegments: TidDiffSegment[]} {
    const ops = diffWords(oldText, newText);
    if (ops === null) {
        // Слишком большие различия для пословной подсветки — показываем куски целиком
        return {
            oldSegments: oldText ? [{text: oldText, hl: true}] : [],
            newSegments: newText ? [{text: newText, hl: true}] : [],
        };
    }

    const oldSegments: TidDiffSegment[] = [];
    const newSegments: TidDiffSegment[] = [];
    for (const op of ops) {
        if (op.type === "equal") {
            oldSegments.push({text: oldText.slice(op.oldRange![0], op.oldRange![1]), hl: false});
            newSegments.push({text: newText.slice(op.newRange![0], op.newRange![1]), hl: false});
        } else if (op.type === "remove") {
            oldSegments.push({text: oldText.slice(op.oldRange![0], op.oldRange![1]), hl: true});
        } else {
            newSegments.push({text: newText.slice(op.newRange![0], op.newRange![1]), hl: true});
        }
    }
    return {oldSegments, newSegments};
}

/** Группирует построчный (по абзацам) diff в "ганки" изменений — последовательные add/remove-
 * абзацы схлопываются в одну строку таблицы; неизменные абзацы (type "equal") в таблицу не
 * попадают, как и в матрице разногласий показываются только расхождения. */
function buildRows(oldParagraphs: string[], newParagraphs: string[]): TidAutoRow[] | null {
    const ops = diffArrays(oldParagraphs, newParagraphs);
    if (ops === null) return null;

    const rows: TidAutoRow[] = [];
    let i = 0;
    let hunkIndex = 0;
    while (i < ops.length) {
        if (ops[i].type === "equal") {
            i++;
            continue;
        }
        const oldTexts: string[] = [];
        const newTexts: string[] = [];
        while (i < ops.length && ops[i].type !== "equal") {
            if (ops[i].type === "remove") oldTexts.push(oldParagraphs[ops[i].oldIndex!]);
            else newTexts.push(newParagraphs[ops[i].newIndex!]);
            i++;
        }
        const {oldSegments, newSegments} = buildSegments(oldTexts.join("\n"), newTexts.join("\n"));
        rows.push({id: `auto-${hunkIndex++}`, oldSegments, newSegments});
    }
    return rows;
}

/**
 * Скачивает docx действующей и новой (черновой) редакции, извлекает тексты абзацев и строит
 * diff — изменённые/добавленные/удалённые куски помечаются hl:true (подсветка — красным в
 * старой, зелёным в новой колонке, см. REMOVE_STYLE/ADD_STYLE в TidChangesTable, повторяющие
 * цвета useDocxDiffHighlight.ts). oldFileId/newFileId === null — сравнение недоступно (нет
 * действующей редакции, напр. это первая редакция ВНД).
 */
export function useTidDiffRows(oldFileId: number | null, newFileId: number | null): {
    rows: TidAutoRow[];
    status: TidDiffStatus;
} {
    const [rows, setRows] = useState<TidAutoRow[]>([]);
    const [status, setStatus] = useState<TidDiffStatus>("idle");

    useEffect(() => {
        if (oldFileId === null || newFileId === null) {
            setRows([]);
            setStatus("idle");
            return;
        }

        let cancelled = false;
        setStatus("loading");

        (async () => {
            try {
                const [oldBlob, newBlob] = await Promise.all([
                    fetchFileBlob(oldFileId).then((r) => r.blob),
                    fetchFileBlob(newFileId).then((r) => r.blob),
                ]);
                const [oldParagraphs, newParagraphs] = await Promise.all([
                    extractDocxParagraphs(oldBlob),
                    extractDocxParagraphs(newBlob),
                ]);
                if (cancelled) return;

                const built = buildRows(oldParagraphs, newParagraphs);
                if (built === null) {
                    setRows([]);
                    setStatus("unavailable");
                    return;
                }
                setRows(built);
                setStatus("done");
            } catch {
                if (!cancelled) {
                    setRows([]);
                    setStatus("error");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [oldFileId, newFileId]);

    return {rows, status};
}
