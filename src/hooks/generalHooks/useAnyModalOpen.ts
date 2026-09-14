// Определяет, открыта ли сейчас поверх страницы модалка/оверлей.
//
// Единого модального контекста в проекте нет — каждая модалка сама рисует свой
// полноэкранный бэкдроп (`fixed inset-0 ...`, см. RubricTreeModal.tsx,
// CreateDocumentModal.tsx и т.д.), поэтому вместо правки каждой модалки по
// отдельности слушаем DOM: как только в дереве появляется элемент с классами
// "fixed" и "inset-0" — где-то открылась модалка. Это не задевает тултипы и
// выпадающие списки — они позиционируются иначе (fixed, но не inset-0, либо
// absolute).
import {useEffect, useState} from "react";

const MODAL_BACKDROP_SELECTOR = ".fixed.inset-0";

export function useAnyModalOpen(): boolean {
    const [open, setOpen] = useState(
        () => typeof document !== "undefined" && document.querySelectorAll(MODAL_BACKDROP_SELECTOR).length > 0
    );

    useEffect(() => {
        const check = () => {
            setOpen(document.querySelectorAll(MODAL_BACKDROP_SELECTOR).length > 0);
        };

        check();

        const observer = new MutationObserver(check);
        observer.observe(document.body, {childList: true, subtree: true});

        return () => observer.disconnect();
    }, []);

    return open;
}
