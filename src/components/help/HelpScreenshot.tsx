import {useEffect, useState} from "react";
import {ImageOff} from "lucide-react";
import {helpService} from "@/service/helpService/helpService.ts";

/**
 * Снимок экрана с нумерованными выносками.
 *
 * Выноски — номера на кружках, а не нарисованные стрелки: стрелку пришлось бы
 * рисовать в графическом редакторе и перерисовывать при каждой правке
 * интерфейса. Номер ставится мышью прямо в системе и живёт вместе со статьёй.
 *
 * Положение метки хранится в процентах от размера снимка — картинка
 * показывается в разной ширине, и метка в пикселях уехала бы с нужной кнопки.
 */

export interface Marker {
    x: number;
    y: number;
    text?: string;
}

interface Props {
    fileId: number;
    caption?: string;
    markers?: Marker[];
    /** Обработчик клика по снимку — только в редакторе, для постановки меток. */
    onPick?: (x: number, y: number) => void;
    /** Убрать метку по номеру — только в редакторе. */
    onRemoveMarker?: (index: number) => void;
}

export function HelpScreenshot({fileId, caption, markers = [], onPick, onRemoveMarker}: Props) {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        helpService.fetchImage(fileId)
            .then((next) => {
                if (cancelled) {
                    // Пришло после ухода со страницы — освобождаем сразу, иначе
                    // ссылка на данные останется висеть до перезагрузки вкладки.
                    URL.revokeObjectURL(next);
                    return;
                }
                objectUrl = next;
                setUrl(next);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileId]);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!onPick) return;

        const box = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * 100;
        const y = ((event.clientY - box.top) / box.height) * 100;

        onPick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    };

    if (failed) {
        return (
            <div className="flex items-center gap-2 rounded-[10px] border border-dashed
                            border-[#e5e9f0] px-4 py-6 text-[13px] text-[#a8b3c4]">
                <ImageOff size={16}/>
                Снимок недоступен
            </div>
        );
    }

    return (
        <figure className="m-0">
            <div
                onClick={handleClick}
                className={`relative overflow-hidden rounded-[10px] border border-[#e5e9f0]
                            ${onPick ? "cursor-crosshair" : ""}`}
            >
                {url ? (
                    <img src={url} alt={caption ?? "Снимок экрана"} className="block w-full"/>
                ) : (
                    <div className="h-[220px] animate-pulse bg-[#f2f5f9]"/>
                )}

                {markers.map((marker, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemoveMarker?.(index);
                        }}
                        title={onRemoveMarker ? "Убрать выноску" : marker.text}
                        style={{left: `${marker.x}%`, top: `${marker.y}%`}}
                        className={`absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2
                                    place-items-center rounded-full border-2 border-white
                                    bg-[#c0392b] text-[12px] font-bold text-white
                                    shadow-[0_2px_6px_rgba(0,0,0,0.35)]
                                    ${onRemoveMarker ? "cursor-pointer hover:bg-[#9c2f23]" : "cursor-default"}`}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            {/* Подписи к выноскам под снимком: на самом снимке текст мешает
                разглядеть интерфейс, ради которого его и показывают. */}
            {markers.some((m) => m.text) && (
                <ol className="mt-2 flex list-none flex-col gap-1 p-0">
                    {markers.map((marker, index) => marker.text && (
                        <li key={index} className="flex items-start gap-2 text-[13px] text-[#55617a]">
                            <span className="mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center
                                             rounded-full bg-[#c0392b] text-[11px] font-bold text-white">
                                {index + 1}
                            </span>
                            {marker.text}
                        </li>
                    ))}
                </ol>
            )}

            {caption && (
                <figcaption className="mt-2 text-[12.5px] text-[#8b97ab]">{caption}</figcaption>
            )}
        </figure>
    );
}
