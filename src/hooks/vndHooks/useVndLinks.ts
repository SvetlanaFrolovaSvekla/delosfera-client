import { useCallback, useEffect, useState } from "react";
import type {VndLinksResponse} from "@/service/vndService/vndServiceType.ts";
import {vndService} from "@/service/vndService/vndService.ts";


export function useVndLinks(vndId: number) {
    const [data, setData] = useState<VndLinksResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        try {
            setData(await vndService.getLinks(vndId));
        } finally {
            setIsLoading(false);
        }
    }, [vndId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const addLink = useCallback(
        async (targetVndId: number) => {
            setIsMutating(true);
            try {
                await vndService.addLink(vndId, targetVndId);
                await refetch();
            } finally {
                setIsMutating(false);
            }
        },
        [vndId, refetch]
    );

    const deleteLink = useCallback(
        async (linkId: number) => {
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