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
