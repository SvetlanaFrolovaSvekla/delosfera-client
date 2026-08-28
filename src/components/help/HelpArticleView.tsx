import {useNavigate} from "react-router-dom";
import {ArrowRight, BookOpen, Info, TriangleAlert} from "lucide-react";
import type {HelpBlock} from "@/service/helpService/helpService.ts";
import {HelpScreenshot} from "@/components/help/HelpScreenshot.tsx";

/**
 * Отрисовка тела статьи.
 *
 * Блоки нужны затем, что инструкция состоит из разных по смыслу вещей: объяснение
 * читают, шаги выполняют, предупреждение должно остановить. Сплошным текстом это
 * различие теряется, и человек пропускает ровно ту строку, ради которой всё писалось.
 *
 * Ссылка на раздел — не украшение: она отвечает на вопрос «где это в системе», не
 * заставляя читателя искать пункт меню по описанию.
 */

interface Props {
    body: HelpBlock[];
}

export const HelpArticleView = ({body}: Props) => {
    const navigate = useNavigate();

    if (body.length === 0) {
        return (
            <p className="text-[13px] text-[#8b97ab]">
                Статья пока не заполнена.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {body.map((block, i) => {
                switch (block.kind) {
                    case "image":
                        return (
                            <HelpScreenshot
                                key={i}
                                fileId={block.fileId}
                                caption={block.caption}
                                markers={block.markers}
                            />
                        );

                    case "text":
                        return (
                            <p key={i} className="m-0 max-w-[70ch] text-[14px] leading-[1.75] text-[#26324a]">
                                {block.text}
                            </p>
                        );

                    case "steps":
                        return (
                            <ol key={i} className="m-0 flex list-none flex-col gap-2.5 p-0">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[12px] font-bold text-[#2f68f5]">
                                            {j + 1}
                                        </span>
                                        <span className="max-w-[66ch] pt-0.5 text-[14px] leading-[1.65] text-[#26324a]">
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        );

                    case "note": {
                        const warning = block.tone === "warning";
                        const Icon = warning ? TriangleAlert : Info;

                        return (
                            <div key={i}
                                 className={`flex max-w-[70ch] items-start gap-2.5 rounded-[10px] border px-4 py-3 ${
                                     warning
                                         ? "border-[#f0dcae] bg-[#fdf3e0]"
                                         : "border-[#cbddff] bg-[#f5f8ff]"}`}>
                                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${
                                    warning ? "text-[#b3730a]" : "text-[#2f68f5]"}`} strokeWidth={2}/>
                                <span className={`text-[13.5px] leading-[1.65] ${
                                    warning ? "text-[#8a5a00]" : "text-[#26324a]"}`}>
                                    {block.text}
                                </span>
                            </div>
                        );
                    }

                    case "link":
                        return (
                            <button key={i} onClick={() => navigate(block.path)}
                                    className="flex w-fit items-center gap-2 rounded-[10px] border border-[#cbddff] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#2f68f5] hover:bg-[#f5f8ff]">
                                {block.label}
                                <ArrowRight className="h-4 w-4" strokeWidth={2}/>
                            </button>
                        );

                    case "vnd":
                        return (
                            <button key={i} onClick={() => navigate(`/base-vnd/${block.documentId}`)}
                                    className="flex w-fit items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#55617a] hover:border-[#cbddff]">
                                <BookOpen className="h-4 w-4 text-[#8b97ab]" strokeWidth={2}/>
                                {block.label}
                            </button>
                        );

                    default:
                        // Блок неизвестного вида мог прийти из более новой версии:
                        // молча пропускаем, чтобы не рушить всю статью.
                        return null;
                }
            })}
        </div>
    );
};
