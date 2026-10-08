import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Info, RotateCcw} from "lucide-react";
import {vndService, type DeletedVndItem} from "@/service/vndService/vndService.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import type {VndStatusKey} from "@/constants/vndTabs.ts";
import {toast} from "@/service/toastService.ts";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

/**
 * Вкладка «Черновики» → «Удалённые»: мягко удалённые ВНД (право DeleteAnyVnd — главный редактор и
 * администратор). Документ можно восстановить прямо из системы — он вернётся в реестр в том же
 * статусе, со всеми редакциями и журналом подписей.
 */
export function DeletedVndList() {
    const {t, i18n} = useTranslation();
    const locale = i18n.language === "ky" || i18n.language === "kg" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
    const [items, setItems] = useState<DeletedVndItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await vndService.listDeleted());
        } catch (e) {
            setError(e instanceof Error ? e.message : t("openVndPage.deletedListLoadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const restore = async (item: DeletedVndItem) => {
        setRestoringId(item.id);
        try {
            await vndService.restore(item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
            toast.success(t("openVndPage.deletedRestoredToast"), t("openVndPage.deletedRestoredToastDescription", {name: item.code}));
        } catch (e) {
            toast.error(t("openVndPage.deletedRestoreFailed"), e instanceof Error ? e.message : undefined);
        } finally {
            setRestoringId(null);
        }
    };

    const titleOf = (x: DeletedVndItem) =>
        (i18n.language === "en" ? x.titleEn : i18n.language === "ky" || i18n.language === "kg" ? x.titleKg : null) ?? x.titleRu;

    const statusLabel = (key: string) => {
        const meta = STATUS_META[key as VndStatusKey];
        return meta ? t(meta.label) : key;
    };

    if (loading) return <Loader label={t("registry.loadingData")}/>;
    if (error) {
        return (
            <EmptyState
                variant="error"
                title={t("registry.errors.loadDataTitle")}
                description={error}
                actionLabel={t("registry.errors.retry")}
                onAction={() => void load()}
            />
        );
    }

    return (
        <div className="rounded-[14px] border border-[#e5e9f0] bg-white">
            <div className="border-b border-[#eef1f5] bg-[#f6f8fb] px-4 py-3.5">
                <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-[#3a4560]">
                    <Info className="h-4 w-4 text-[#4e57d6]" strokeWidth={2.2}/>
                    {t("openVndPage.deletedListHintTitle")}
                </div>
                <ul className="grid gap-x-6 gap-y-1.5 text-[12.5px] leading-[1.45] text-[#55617a] lg:grid-cols-2">
                    {[1, 2, 3, 4, 5].map((k) => (
                        <li key={k} className="flex items-start gap-2">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#a3adbd]"/>
                            <span>{t(`openVndPage.deletedListHint${k}`)}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-[#8b97ab]">
                    {t("openVndPage.deletedListEmpty")}
                </div>
            ) : (
                <div className="divide-y divide-[#eef1f5]">
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold text-[#1c2740]">
                                    <span className="font-mono text-[12.5px] text-[#4e57d6]">{item.code}</span>
                                    <span className="mx-1.5 text-[#c5cbd8]">·</span>
                                    {titleOf(item)}
                                </div>
                                <div className="mt-0.5 text-[11.5px] text-[#8b97ab]">
                                    {t("openVndPage.deletedListStatus", {status: statusLabel(item.status)})}
                                    {item.deletedAt && ` · ${t("openVndPage.deletedListDeletedAt", {date: new Date(item.deletedAt).toLocaleString(locale)})}`}
                                    {item.deletedByName && ` · ${t("openVndPage.deletedListDeletedBy", {name: item.deletedByName})}`}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void restore(item)}
                                disabled={restoringId !== null}
                                className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#cfd6f7] bg-[#ececfc] px-3 text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#e0e2fa] disabled:cursor-default disabled:opacity-50 transition-colors"
                            >
                                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2}/>
                                {restoringId === item.id ? t("openVndPage.deletedRestoring") : t("openVndPage.deletedRestore")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
