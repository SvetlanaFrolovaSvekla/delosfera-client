import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {InboxTaskCard} from "@/components/componentsTasks/InboxTaskCard.tsx";

interface SzTaskCardProps {
    task: InboxTask;
    /** Явно убрать верхний бордер (первая строка в списке) — см. тот же проп у VndTaskCard,
     * задаётся родителем по индексу строки, а не через CSS :first-child. */
    noTopBorder?: boolean;
}

// Карточка задачи сводного реестра (записки, закупки, ознакомление) в виджете "Мои задачи" на
// главной. Та же карточка, что и на странице "Мои задачи" (InboxTaskCard) — те же значки
// контуров и подписи, — только плотная: без скруглений, с тонким разделителем сверху
// (см. VndTaskCard.square рядом, тот же приём).
export function SzTaskCard({task, noTopBorder = false}: SzTaskCardProps) {
    return <InboxTaskCard task={task} square noTopBorder={noTopBorder}/>;
}
