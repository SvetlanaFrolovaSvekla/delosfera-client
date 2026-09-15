import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AlertTriangle} from "lucide-react";
import {szService, type SzDuplicate} from "@/service/szService/szService.ts";

/**
 * Предупреждение о возможном дубликате записки (СК-5). Пока автор заполняет тему и
 * вид новой записки, ищет похожие свои недавние записки. Предупреждение, не запрет:
 * решает автор — иногда похожая запись нужна намеренно.
 */
interface Props {
    kindId: number;
    title: string;
    /** Текущий черновик — исключаем из поиска, чтобы не сравнивать с самим собой. */
    excludeId?: number;
}

export function SzDuplicateWarning({kindId, title, excludeId}: Props) {
    const [dups, setDups] = useState<SzDuplicate[]>([]);

    useEffect(() => {
        const t = title.trim();
        if (!kindId || t.length < 5) {
            setDups([]);
            return;
        }
        let alive = true;
        // Дребезг: не дёргаем поиск на каждое нажатие, ждём паузу в наборе.
        const timer = setTimeout(() => {
            szService.duplicates(kindId, t, excludeId)
                .then((d) => alive && setDups(d))
                .catch(() => alive && setDups([]));
        }, 600);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [kindId, title, excludeId]);

    if (dups.length === 0) return null;

    return (
        <div className="mt-4 rounded-[12px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#b3730a]">
                <AlertTriangle className="w-4 h-4"/>
                Возможный дубликат: у вас уже есть похожая записка
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
                {dups.map((d) => (
                    <Link
                        key={d.id}
                        to={`/sz/${d.id}`}
                        className="flex items-baseline gap-2 text-[12.5px] text-[#7a5410] no-underline hover:underline"
                    >
                        <span className="font-mono">{d.regNumber ?? "черновик"}</span>
                        <span className="font-medium">{d.title}</span>
                        <span className="text-[11.5px] text-[#a3861f]">
                            · {d.statusTitle} · совпадение {d.similarityPercent}%
                        </span>
                    </Link>
                ))}
            </div>
            <div className="mt-2 text-[11.5px] text-[#a3861f]">
                Если это другая записка — продолжайте, предупреждение ничего не блокирует.
            </div>
        </div>
    );
}
