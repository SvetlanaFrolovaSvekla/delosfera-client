import {useEffect, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {SuperDoc} from '@harbour-enterprises/superdoc';
import '@harbour-enterprises/superdoc/style.css';
import {fetchFileBlob} from "@/utils/downloadFile.ts";
import {Loader} from "@/components/componentsGeneral/Loader";

interface DocxEditorProps {
    fileId: number;
    fallbackName?: string;
    onReady?: (superdoc: SuperDoc) => void;
    editable?: boolean;
}

export function DocxEditor({fileId, fallbackName = "document.docx", onReady, editable = true}: DocxEditorProps) {
    const {t} = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const superdocRef = useRef<SuperDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        fetchFileBlob(fileId, fallbackName)
            .then(({blob, fileName}) => {
                if (cancelled || !containerRef.current) return;

                const file = new File([blob], fileName, {
                    type: blob.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                const superdoc = new SuperDoc({
                    selector: containerRef.current,
                    document: file,
                    documentMode: editable ? 'editing' : 'viewing',
                    allowSelectionInViewMode: true,
                    modules: {
                        comments: {
                            allowResolve: false,
                        },
                    },
                    viewOptions: {layout: 'web'},
                    layoutEngineOptions: {flowMode: 'semantic'},
                    onReady: () => {
                        if (!cancelled) {
                            setLoading(false);
                            onReady?.(superdoc);
                        }
                    },
                });

                superdocRef.current = superdoc;
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t("docxEditor.loadError"));
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
            superdocRef.current?.destroy?.();
            superdocRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId, editable]);

    if (error) {
        return (
            <div className="flex items-center justify-center p-[48px] text-[13px] text-[#c0392b]">
                {error}
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-[220px]">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                    <Loader label={t("docxEditor.loadingDocument")} size="sm" fullHeight={false}/>
                </div>
            )}

            {/* Веб-раскладка: текст растягивается на всю ширину контейнера */}
            <div ref={containerRef} className="w-full px-6 py-5"/>
        </div>
    );
}