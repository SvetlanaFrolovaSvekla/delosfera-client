import {ChartColumn} from "lucide-react";
import {VndTasksPanel} from "@/components/componentsTasks/VndTasksPanel.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";

/**
 * Задачи нормотворчества отдельной страницей.
 *
 * Тот же перечень доступен вкладкой «ВНД» в сводных задачах — там его смотрят
 * вместе с записками и закупками. Эта страница осталась для прямых ссылок и
 * закладок: они разосланы по подразделениям, и ломать их незачем.
 */
export function TasksVndPage() {
    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title="Мои задачи"
                description="Перечень задач по нормотворчеству: согласование редакций ВНД, консолидация редакций, актуализация ВНД."
                actions={
                    // TODO: страницы статистики по задачам ещё нет — кнопка пока заглушка
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <ChartColumn className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Статистика по моим задачам
                    </button>
                }
            />

            <VndTasksPanel/>
        </div>
    );
}
