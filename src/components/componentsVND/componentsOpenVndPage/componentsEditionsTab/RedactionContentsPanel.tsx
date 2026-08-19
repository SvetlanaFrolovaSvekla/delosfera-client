// Панель с оглавлением редакции (пока моковые данные), встраивается третьей колонкой рядом с сайдбаром
import {ListTree, X} from "lucide-react";

interface ContentsItem {
    id: string;
    level: 1 | 2 | 3;
    title: string;
    page?: number;
}

// Мок — позже заменить на реальные данные, приходящие с бэка по редакции
const MOCK_CONTENTS: ContentsItem[] = [
    {id: "1", level: 1, title: "1. Общие положения", page: 1},
    {id: "1.1", level: 2, title: "1.1. Область применения", page: 1},
    {id: "1.2", level: 2, title: "1.2. Нормативные ссылки", page: 2},
    {id: "2", level: 1, title: "2. Термины и определения", page: 3},
    {id: "3", level: 1, title: "3. Порядок проведения процедуры", page: 4},
    {id: "3.1", level: 2, title: "3.1. Инициирование", page: 4},
    {id: "3.1.1", level: 3, title: "3.1.1. Подготовка документов", page: 4},
    {id: "3.1.2", level: 3, title: "3.1.2. Согласование", page: 5},
    {id: "3.2", level: 2, title: "3.2. Исполнение", page: 6},
    {id: "4", level: 1, title: "4. Ответственность", page: 8},
    {id: "5", level: 1, title: "5. Заключительные положения", page: 9},
    {id: "3.1", level: 2, title: "3.1. Инициирование", page: 4},
    {id: "3.1.1", level: 3, title: "3.1.1. Подготовка документов", page: 4},
    {id: "3.1.2", level: 3, title: "3.1.2. Согласование", page: 5},
    {id: "3.2", level: 2, title: "3.2. Исполнение", page: 6},
    {id: "4", level: 1, title: "4. Ответственность", page: 8},
    {id: "5", level: 1, title: "5. Заключительные положения", page: 9},
    {id: "3.1", level: 2, title: "3.1. Инициирование", page: 4},
    {id: "3.1.1", level: 3, title: "3.1.1. Подготовка документов", page: 4},
    {id: "3.1.2", level: 3, title: "3.1.2. Согласование", page: 5},
    {id: "3.2", level: 2, title: "3.2. Исполнение", page: 6},
    {id: "4", level: 1, title: "4. Ответственность", page: 8},
    {id: "5", level: 1, title: "5. Заключительные положения", page: 9},
];

const LEVEL_PADDING: Record<ContentsItem["level"], string> = {
    1: "pl-0",
    2: "pl-[16px]",
    3: "pl-[32px]",
};

const LEVEL_TEXT: Record<ContentsItem["level"], string> = {
    1: "text-[13px] font-semibold text-[#1c2740]",
    2: "text-[12.5px] font-medium text-[#3a4560]",
    3: "text-[12px] text-[#5c6780]",
};

interface RedactionContentsPanelProps {
    redactionCode: string;
    onClose: () => void;
}

export function RedactionContentsPanel({onClose}: RedactionContentsPanelProps) {
    return (
        <div className="flex max-h-[750px] min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-[14px] py-[15px]">
                <div className="flex items-center gap-[8px]">
                    <ListTree size={16} className="flex-none text-[#4e57d6]"/>
                    <div className="min-w-0">
                        <div className="text-[12.5px] font-bold leading-tight text-[#1c2740]">Содержание</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="cursor-pointer flex h-6 w-6 flex-none items-center justify-center rounded-[6px] text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                >
                    <X size={14}/>
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-[26px] py-[10px]">
                <ul className="flex flex-col gap-[2px]">
                    {MOCK_CONTENTS.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                className={`cursor-pointer flex w-full items-center justify-between gap-2 rounded-[7px] py-[6px] pr-[6px] text-left hover:bg-[#f6f8fb] ${LEVEL_PADDING[item.level]}`}
                            >
                                <span className={`${LEVEL_TEXT[item.level]} line-clamp-2`}>{item.title}</span>
                                {item.page !== undefined && (
                                    <span className="flex-none text-[11px] text-[#a3adbd]">{item.page}</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}