// Просмотр .xlsx в браузере - рендерим через SheetJS в обычные HTML-таблицы (по одной на
// лист). В отличие от docx-preview (useDocxPreview.ts) это не воспроизводит оригинал точь-в-точь
// - объединённые ячейки, формулы, форматирование чисел и стили SheetJS в HTML почти не переносит,
// поэтому AttachmentDocxPreviewModal показывает рядом с таким превью предупреждение и кнопку
// "Скачать". Задача этого предпросмотра - дать быстро понять, что внутри файла, а не заменить
// открытие в Excel.
import React, {useEffect, useRef, useState} from "react";
import * as XLSX from "xlsx";
import {fetchFileBlob} from "@/utils/downloadFiles/downloadFile.ts";

interface UseSheetPreviewResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    loading: boolean;
    error: string | null;
}

interface UseSheetPreviewOptions {
    /** См. fetchFileBlob: путь на бэке, если файл выдаёт не общий /api/files/{id}. */
    endpoint?: string;
}

export function useSheetPreview(
    fileId: number | null,
    options: UseSheetPreviewOptions = {},
): UseSheetPreviewResult {
    const {endpoint} = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fileId === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(null);
            if (containerRef.current) containerRef.current.innerHTML = "";
            return;
        }

        let cancelled = false;
        // См. аналогичный комментарий в useDocxPreview.ts - без явного отзыва предыдущий fetch
        // может проиграть гонку за контейнер уже после того, как компонент показывает другой файл.
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const {blob} = await fetchFileBlob(fileId, undefined, controller.signal, endpoint);
                if (cancelled || !containerRef.current) return;

                const buffer = await blob.arrayBuffer();
                if (cancelled || !containerRef.current) return;

                // XLSX.read с type: "array" ждёт именно Uint8Array (индексируемый по байтам) -
                // "сырой" ArrayBuffer молча даёт пустую/битую книгу, т.к. у него нет числового
                // индекса.
                const workbook = XLSX.read(new Uint8Array(buffer), {type: "array"});
                if (cancelled || !containerRef.current) return;

                containerRef.current.innerHTML = "";

                if (workbook.SheetNames.length === 0) {
                    setError("В файле нет листов для отображения");
                    return;
                }

                workbook.SheetNames.forEach((sheetName, i) => {
                    const sheet = workbook.Sheets[sheetName];
                    if (!sheet || !containerRef.current) return;

                    const section = document.createElement("div");
                    section.className = i > 0 ? "mt-6" : "";

                    // Название листа показываем, только если их больше одного - для файла с
                    // единственным листом ("Лист1" и т.п.) это просто лишний шум над таблицей.
                    if (workbook.SheetNames.length > 1) {
                        const heading = document.createElement("div");
                        heading.className = "mb-2 text-[12.5px] font-semibold text-[#8b97ab]";
                        heading.textContent = sheetName;
                        section.appendChild(heading);
                    }

                    const wrap = document.createElement("div");
                    wrap.className = "overflow-x-auto rounded-[10px] border border-[#e9edf3]";
                    // sheet_to_html отдаёт ПОЛНЫЙ html-документ (<html><head><title>...), а не
                    // голый <table> - innerHTML прямо со всей этой строкой натащил бы в DOM
                    // посторонние <title>/<meta>. Вытаскиваем только сам <table> через DOMParser.
                    const parsedSheet = new DOMParser().parseFromString(XLSX.utils.sheet_to_html(sheet), "text/html");
                    const table = parsedSheet.querySelector("table");
                    if (table) wrap.appendChild(table);
                    section.appendChild(wrap);

                    containerRef.current.appendChild(section);
                });

                // sheet_to_html отдаёт голый <table> без единого класса - раскрашиваем под стиль
                // остального интерфейса тут же, вместо того чтобы тащить это в index.css ради
                // одной библиотеки.
                containerRef.current.querySelectorAll("table").forEach((table) => {
                    table.classList.add("w-full", "border-collapse", "text-[12.5px]", "text-[#3c4356]");
                });
                containerRef.current.querySelectorAll("td, th").forEach((cell) => {
                    cell.classList.add(
                        "border", "border-[#e9edf3]", "px-2", "py-1",
                        "align-top", "whitespace-pre-wrap", "break-words",
                    );
                });
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
                setError(err instanceof Error ? err.message : "Ошибка загрузки таблицы");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [fileId, endpoint]);

    return {containerRef, loading, error};
}
