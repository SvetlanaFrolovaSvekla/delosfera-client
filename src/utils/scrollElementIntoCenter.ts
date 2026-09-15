// ⚠ 14.09.2026: вынесено в отдельный файл при повторном разборе бага "подсветилось, но не
// проскроллило" (см. useDocxTextSearch.ts) - предыдущая попытка чинить это двойным
// requestAnimationFrame перед вызовом target.scrollIntoView(...) не сработала (подтверждено
// пользователем). Новая гипотеза, которую эта функция и адресует: раскладка документа
// docx-preview продолжает "ехать" ПОСЛЕ первого кадра отрисовки по двум независимым причинам -
//   1) у документа могут быть свои встроенные шрифты (@font-face из самого .docx) - они
//      догружаются АСИНХРОННО, и когда браузер подставляет реальные метрики шрифта вместо
//      временного фолбэка, высота абзацев/строк меняется, а вместе с ней - и позиция уже
//      подсвеченной цитаты;
//   2) персистентная подсветка маркеров согласующих (useDocxQuoteMarks) пересобирает разметку
//      документа СВОИМ отдельным debounce-таймером (150мс) - если он ещё не отработал к моменту
//      первого скролла, итоговая структура DOM (а с ней и раскладка) может ещё чуть измениться.
// Из-за этого попытка вычислить нужный scrollTop и проскроллить один-единственный раз (даже
// дождавшись кадра отрисовки через rAF) может промахнуться: расчёт делается по ЕЩЁ не
// окончательной геометрии. Вместо одной попытки - несколько, с нарастающей паузой, каждая
// заново измеряет геометрию с нуля.
//
// Дополнительно (в отличие от голого target.scrollIntoView({block:"center"})) сами ищем
// ближайшего скроллящегося родителя вручную и двигаем именно его scrollTop - так надёжнее и
// проще проверить/отладить, чем полагаться на встроенный алгоритм браузера внутри глубоко
// вложенной flex/overflow структуры модалки просмотра редакции.

function findScrollableAncestor(el: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node) {
        const style = window.getComputedStyle(node);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

function attemptScrollToCenter(target: HTMLElement) {
    if (!target.isConnected) return;

    const scrollParent = findScrollableAncestor(target);
    if (!scrollParent) {
        // Не нашли скроллящегося предка вручную (например, разметка вокруг когда-нибудь
        // изменится) - штатное поведение браузера как фолбэк.
        target.scrollIntoView({block: "center", behavior: "smooth"});
        return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const desiredScrollTop =
        scrollParent.scrollTop + (targetRect.top - parentRect.top) - scrollParent.clientHeight / 2 + targetRect.height / 2;

    scrollParent.scrollTo({top: Math.max(0, desiredScrollTop), behavior: "smooth"});
}

/** Скроллит так, чтобы target оказался по центру видимой области ближайшего скроллящегося
 * предка - с несколькими повторными попытками (см. пояснение в шапке файла), а не одним вызовом
 * сразу после отрисовки кадра. Повторные попытки безвредны, если позиция уже верна - пересчёт
 * даст тот же самый scrollTop и smooth-скролл просто не увидит разницы. */
export function scrollElementIntoCenter(target: HTMLElement) {
    requestAnimationFrame(() => requestAnimationFrame(() => attemptScrollToCenter(target)));
    setTimeout(() => attemptScrollToCenter(target), 250);
    setTimeout(() => attemptScrollToCenter(target), 600);
    setTimeout(() => attemptScrollToCenter(target), 1200);
}
