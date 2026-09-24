import { useCallback, useEffect, useState } from "react";
import type {AddVndLinkRequest, VndLinksResponse} from "@/service/vndService/vndServiceType.ts";
import {vndService} from "@/service/vndService/vndService.ts";


/** Связи ВНД (вкладка "Связанные документы", подсветка ссылок в тексте на вкладке "Редакции").
 * vndId === undefined - ничего не загружать (например, пока документ ещё не открыт). */
export function useVndLinks(vndId: number | undefined) {
    const [data, setData] = useState<VndLinksResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    const refetch = useCallback(async () => {
        if (vndId === undefined) return;
        setIsLoading(true);
        try {
            setData(await vndService.getLinks(vndId));
        } catch {
            // Связи - вспомогательная информация: не роняем страницу, просто показываем пустой
            // список (вкладка сама подскажет, что ссылок нет).
            setData((prev) => prev ?? {outgoing: [], incoming: [], attachmentReferences: []});
        } finally {
            setIsLoading(false);
        }
    }, [vndId]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    const addLink = useCallback(
        async (request: AddVndLinkRequest) => {
            if (vndId === undefined) return;
            setIsMutating(true);
            try {
                await vndService.addLink(vndId, request);
                await refetch();
            } finally {
                setIsMutating(false);
            }
        },
        [vndId, refetch]
    );

    const deleteLink = useCallback(
        async (linkId: number) => {
            if (vndId === undefined) return;
            setIsMutating(true);
            try {
                await vndService.deleteLink(vndId, linkId);
                await refetch();
            } finally {
                setIsMutating(false);
            }
        },
        [vndId, refetch]
    );

    return { data, isLoading, isMutating, addLink, deleteLink, refetch };
}
