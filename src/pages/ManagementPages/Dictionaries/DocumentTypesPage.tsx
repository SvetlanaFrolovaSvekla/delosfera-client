/**
 * Типы документов, заводимые без программирования.
 *
 * Банк добавляет свой вид документа, задаёт поля карточки и шаблон маршрута —
 * и документ начинает ходить по согласованию наравне со встроенными.
 *
 * Шаблон маршрута здесь не украшение: без него документ такого типа отправить
 * на согласование нельзя, сервер откажет словами «согласовывать нечем».
 * Поэтому тип без шаблона помечен прямо в списке, а не выясняется при первой
 * отправке — к тому времени карточку уже заполнили.
 */
import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {documentTypeService, isReadyToUse, type DocumentType} from "@/service/documentTypeService/documentTypeService.ts";
import {workflowService} from "@/service/workflowService/workflowService.ts";
import {toast} from "@/service/toastService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {AlertTriangle, Plus} from "lucide-react";
import {translit} from "@/utils/translit.ts";
import {TypeCard} from "@/components/componentsDocumentsTypes/TypeCard.tsx";

export interface RouteTemplate {
    id: number;
    name: string;
}

export function DocumentTypesPage() {
    const {t} = useTranslation();
    const [types, setTypes] = useState<DocumentType[]>([]);
    const [templates, setTemplates] = useState<RouteTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);

    const load = useCallback(async () => {
        const [types, tpl] = await Promise.all([
            documentTypeService.list(),
            workflowService.templates().catch(() => []),
        ]);
        setTypes(types);
        setTemplates(tpl.map((x: { id: number; name?: string; title?: string }) => ({
            id: x.id,
            name: x.name ?? x.title ?? t("documentTypes.templateFallback", {id: x.id}),
        })));
    }, [t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load().finally(() => setLoading(false));
    }, [load]);

    const createType = async () => {
        // const titleRu = window.prompt("Название нового типа документа");
        const titleRu = window.prompt(t("documentTypes.createPromptTitle"));
        if (!titleRu?.trim()) return;

        const code = window.prompt(
            // "Системное имя латиницей — попадёт в номер документа, менять потом нельзя",
            t("documentTypes.createPromptCode"),
            translit(titleRu),
        );
        if (!code?.trim()) return;

        try {
            const created = await documentTypeService.create({
                code: code.trim(),
                titleRu: titleRu.trim(),
                isActive: true,
            });
            await load();
            setOpenId(created.id);
        } catch (e: unknown) {
            const r = e as { response?: { data?: { message?: string } } };
            // toast.error("Не удалось завести тип", r.response?.data?.message);
            toast.error(t("documentTypes.createError"), r.response?.data?.message);
        }
    };

    // if (loading) return <Loader label="Загружаем типы…"/>;
    if (loading) return <Loader label={t("documentTypes.loading")}/>;

    const withoutRoute = types.filter((type) => !isReadyToUse(type)).length;

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                // title="Типы документов"
                title={t("documentTypes.title")}
                // description="Свои виды документов: поля карточки и маршрут согласования — без программирования"
                description={t("documentTypes.description")}
                actions={
                    <button
                        type="button"
                        onClick={createType}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {/* Новый тип */}
                        {t("documentTypes.newType")}
                    </button>
                }
            />

            {withoutRoute > 0 && (
                <p className="flex items-start gap-2 rounded-[10px] bg-[#fbeeda] px-4 py-3
                              text-[13.5px] text-[#96590a] mb-4">
                    <AlertTriangle size={16} className="mt-0.5 flex-none"/>
                    <span>
                        {/*
                        {withoutRoute === 1 ? "Один тип" : `Типов без маршрута: ${withoutRoute}`}
                        {" "}— документы такого типа заводятся, но отправить их на согласование
                        нельзя, пока не выбран шаблон маршрута.
                        */}
                        {t("documentTypes.noRouteWarning", {count: withoutRoute})}
                    </span>
                </p>
            )}

            {types.length === 0 ? (
                <EmptyState
                    // title="Своих типов пока нет"
                    title={t("documentTypes.emptyTitle")}
                    // description="Встроенные виды документов — записки, нормативные документы, закупки — настраиваются в своих разделах."
                    description={t("documentTypes.emptyDescription")}
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {types.map((type) => (
                        <TypeCard
                            key={type.id}
                            type={type}
                            templates={templates}
                            open={openId === type.id}
                            onToggle={() => setOpenId(openId === type.id ? null : type.id)}
                            onChanged={load}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}