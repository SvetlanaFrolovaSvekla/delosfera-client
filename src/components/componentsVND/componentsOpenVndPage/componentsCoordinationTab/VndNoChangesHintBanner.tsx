// Плашка "актуализация без изменений" - показывается и согласующему, и инициатору (текст
// разный, разметка одна и та же) над остальным содержимым таба "Ход согласования".
import {FileCheck2} from "lucide-react";

interface VndNoChangesHintBannerProps {
    message: string;
}

export function VndNoChangesHintBanner({message}: VndNoChangesHintBannerProps) {
    return (
        <div className="mb-3 inline-flex items-start gap-2.5 rounded-[12px] border border-[#dde0fa] bg-[#f4f5fd] px-3.5 py-3 max-w-full">
            <FileCheck2 size={16} strokeWidth={2} className="mt-[1px] flex-none text-[#4e57d6]"/>
            <p className="text-[12.5px] leading-[1.55] text-[#3a4560]">
                {message}
            </p>
        </div>
    );
}
