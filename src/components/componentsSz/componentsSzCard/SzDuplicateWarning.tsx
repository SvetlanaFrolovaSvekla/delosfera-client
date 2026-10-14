/**
 * Предупреждение о возможном дубликате записки (СК-5). Пока автор заполняет тему и
 * вид новой записки, ищет похожие свои недавние записки. Предупреждение, не запрет:
 * решает автор — иногда похожая запись нужна намеренно.
 */
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {szService, type SzDuplicate} from "@/service/szService/szService.ts";
import {AlertTriangle} from "lucide-react";

interface Props {
    kindId: number;
    title: string;
    /** Текущий черновик — исключаем из поиска, чтобы не сравнивать с самим собой. */
    excludeId?: number;
}

export function SzDuplicateWarning({kindId, title, excludeId}: Props) {
    const {t} = useTranslation();
    const [dups, setDups] = useState<SzDuplicate[]>([]);

    useEffect(() => {
        const trimmed = title.trim();
        if (!kindId || trimmed.length < 5) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDups([]);
            return;
        }
        let alive = true;
        // Дребезг: не дёргаем поиск на каждое нажатие, ждём паузу в наборе.
        const timer = setTimeout(() => {
            szService.duplicates(kindId, trimmed, excludeId)
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
                {/* Возможный дубликат: у вас уже есть похожая записка */}
                {t("szCard.duplicate.title")}
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
                {dups.map((d) => (
                    <Link
                        key={d.id}
                        to={`/sz/${d.id}`}
                        className="flex flex-wrap items-baseline gap-x-2 rounded-[8px] bg-white/60 px-2.5 py-1.5 text-[12.5px] text-[#7a5410] no-underline hover:bg-white"
                    >
                        <span className="font-mono">{d.regNumber ?? t("szCard.duplicate.draft")}</span>
                        <span className="font-medium">{d.title}</span>
                        <span className="text-[11.5px] text-[#a3861f]">
                            · {d.statusTitle} · {t("szCard.duplicate.similarity", {percent: d.similarityPercent})}
                        </span>
                    </Link>
                ))}
            </div>
            <div className="mt-2 text-[11.5px] text-[#a3861f]">
                {/* Если это другая записка — продолжайте, предупреждение ничего не блокирует. */}
                {t("szCard.duplicate.hint")}
            </div>
        </div>
    );
}
