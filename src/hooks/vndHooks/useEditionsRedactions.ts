// Какие редакции видит пользователь на вкладке "Редакции", какая выбрана и с чем её сравнивать
import {useMemo} from "react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {useRedactionSelection} from "@/hooks/vndHooks/useRedactionSelection.ts";
import {isRedactionVisibleToRegularUser} from "@/utils/vndProcess/redactionStatus.ts";
import {expandRedactionsWithRevisions, findPreviousRevisionOption} from "@/utils/vndProcess/redactionRevisions.ts";

export function useEditionsRedactions(
    vnd: VndResponse,
    redactions: VndRedactionResponse[],
    selectedId: number | undefined,
    isVndEditor: boolean,
    approvalHistory: ApprovalProcessResponse[],
) {
    const {sortedDesc, lastByNumber, current, selected: rawSelected, compareTarget: rawCompareTarget, uploadBlocked} =
        useRedactionSelection(redactions, selectedId);

    // "Рядовой" пользователь (не редактор ВНД) не должен видеть редакции, которые ещё не стали
    // официальным текстом документа - черновик/на согласовании/отклонена/на консолидации.
    const visibleRedactions = useMemo(
        () => isVndEditor
            ? sortedDesc
            : sortedDesc.filter((r) =>
                isRedactionVisibleToRegularUser(r, vnd.status, r.id === lastByNumber?.id, vnd.effectiveDate)
            ),
        [isVndEditor, sortedDesc, vnd.status, vnd.effectiveDate, lastByNumber]
    );

    // Если выбранное по умолчанию (или явно) из ПОЛНОГО списка скрыто от рядового пользователя -
    // откатываемся на самую свежую из видимых ему редакций, а не показываем скрытое содержимое.
    const selected = isVndEditor || (rawSelected && visibleRedactions.some((r) => r.id === rawSelected.id))
        ? rawSelected
        : visibleRedactions[0];

    const compareTarget = useMemo(() => {
        if (isVndEditor) return rawCompareTarget;
        if (!selected) return undefined;
        const idx = visibleRedactions.findIndex((r) => r.id === selected.id);
        if (idx === -1) return undefined;
        return visibleRedactions[idx + 1] ?? visibleRedactions[idx - 1];
    }, [isVndEditor, rawCompareTarget, selected, visibleRedactions]);

    // Список для окна сравнения - редакции + их промежуточные версии.
    const compareRedactions = useMemo(
        () => isVndEditor ? expandRedactionsWithRevisions(sortedDesc, approvalHistory) : visibleRedactions,
        [isVndEditor, sortedDesc, approvalHistory, visibleRedactions],
    );
    // Левая сторона сравнения - выбранная редакция (в списке сравнения она может быть
    // переподписана как живая версия "Р2.2"), правая по умолчанию - её предыдущая промежуточная
    // версия, если такие были (что исправили в ответ на замечания), иначе - соседняя редакция.
    const compareLeft = selected
        ? compareRedactions.find((r) => r.id === selected.id) ?? selected
        : undefined;
    const compareRight = selected
        ? findPreviousRevisionOption(compareRedactions, selected.id) ?? compareTarget
        : undefined;

    return {
        lastByNumber, current, uploadBlocked,
        /** Выбранная редакция без учёта видимости - undefined, только если редакций нет вовсе */
        rawSelected,
        selected, visibleRedactions,
        compareRedactions, compareLeft, compareRight,
    };
}
