import React, {useEffect, useRef, useState, useCallback} from 'react';
import {useTranslation} from "react-i18next";
import {SuperDoc} from '@harbour-enterprises/superdoc';
import '@harbour-enterprises/superdoc/style.css';
import {fetchFileBlob} from "@/utils/downloadFile.ts";
import {Loader} from "@/components/componentsGeneral/Loader";
import {Copy, Search} from "lucide-react";

interface DocxEditorProps {
    fileId: number;
    fallbackName?: string;
    onReady?: (superdoc: SuperDoc) => void;
    editable?: boolean;
}

interface ContextMenuState {
    x: number;
    y: number;
    text: string;
}

// Минимальный тип для той части внутреннего API SuperDoc, которой мы пользуемся,
// чтобы не тянуть `any`/`never` и не терять проверку типов.
interface SuperDocWithUiSelection {
    ui?: {
        selection?: {
            getSnapshot?: () => { quotedText?: string } | null;
        };
    };
}

export function DocxEditor({fileId, fallbackName = "document.docx", onReady, editable = true}: DocxEditorProps) {
    const {t} = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const superdocRef = useRef<SuperDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);

    const lastSelectedTextRef = useRef('');

    // Постоянно следим за реальным выделением браузера и запоминаем последнее непустое.
    // SuperDoc может сбросить window.getSelection() к моменту правого клика,
    // поэтому читаем не "сейчас", а "последнее известное".
    useEffect(() => {
        const onSelectionChange = () => {
            const text = window.getSelection()?.toString().trim() ?? '';
            if (text) {
                lastSelectedTextRef.current = text;
            }
        };
        document.addEventListener('selectionchange', onSelectionChange);
        return () => document.removeEventListener('selectionchange', onSelectionChange);
    }, []);

    const scrollAnchorsRef = useRef<{ el: HTMLElement; top: number }[]>([]);

    const captureScrollPositions = useCallback(() => {
        const anchors: { el: HTMLElement; top: number }[] = [];
        let node: HTMLElement | null = containerRef.current;
        while (node) {
            if (node.scrollHeight > node.clientHeight) {
                anchors.push({el: node, top: node.scrollTop});
            }
            node = node.parentElement;
        }
        scrollAnchorsRef.current = anchors;
    }, []);

    const restoreScrollPositions = useCallback(() => {
        scrollAnchorsRef.current.forEach(({el, top}) => {
            if (el.scrollTop !== top) el.scrollTop = top;
        });
    }, []);

    // Сбрасываем кэш выделения при обычном клике + фиксируем и восстанавливаем скролл
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        lastSelectedTextRef.current = '';
        captureScrollPositions();
        requestAnimationFrame(() => {
            restoreScrollPositions();
            requestAnimationFrame(restoreScrollPositions);
        });
    }, [captureScrollPositions, restoreScrollPositions]);

    const getSelectedText = useCallback((): string => {
        const nativeNow = window.getSelection()?.toString().trim() ?? '';
        if (nativeNow) return nativeNow;

        if (lastSelectedTextRef.current) return lastSelectedTextRef.current;

        const superdoc = superdocRef.current as unknown as SuperDocWithUiSelection;
        return superdoc?.ui?.selection?.getSnapshot?.()?.quotedText ?? '';
    }, []);

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
                        comments: editable ? {allowResolve: true} : false,
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

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const text = getSelectedText();
        setMenu({x: e.clientX, y: e.clientY, text});
    }, [getSelectedText]);

    const closeMenu = useCallback(() => setMenu(null), []);

    const handleCopy = useCallback(async () => {
        if (!menu?.text) {
            closeMenu();
            return;
        }
        try {
            await navigator.clipboard.writeText(menu.text);
        } catch (err) {
            console.error('Не удалось скопировать текст', err);
        } finally {
            closeMenu();
        }
    }, [menu, closeMenu]);

    const handleSearchInGoogle = useCallback(() => {
        if (!menu?.text) {
            closeMenu();
            return;
        }
        const url = `https://www.google.com/search?q=${encodeURIComponent(menu.text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        closeMenu();
    }, [menu, closeMenu]);

    useEffect(() => {
        if (!menu) return;
        const onClickAway = () => closeMenu();
        window.addEventListener('click', onClickAway);
        window.addEventListener('scroll', onClickAway, true);
        return () => {
            window.removeEventListener('click', onClickAway);
            window.removeEventListener('scroll', onClickAway, true);
        };
    }, [menu, closeMenu]);

    if (error) {
        return (
            <div className="flex items-center justify-center p-[48px] text-[13px] text-[#c0392b]">
                {error}
            </div>
        );
    }

    // Обрезаем длинный текст для подписи пункта меню, как делает сам Chrome
    const truncatedQuery = menu?.text
        ? (menu.text.length > 24 ? `${menu.text.slice(0, 24)}…` : menu.text)
        : '';

    return (
        <div className={`relative overflow-x-hidden w-full min-h-[220px] ${!editable ? 'docx-viewer-readonly' : ''}`}>
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                    <Loader label={t("docxEditor.loadingDocument")} size="sm" fullHeight={false}/>
                </div>
            )}

            <div
                ref={containerRef}
                className="w-full overflow-x-hidden py-5"
                onContextMenu={!editable ? handleContextMenu : undefined}
                onMouseDown={!editable ? handleMouseDown : undefined}
            />

            {menu && (
                <div
                    className="fixed z-50 min-w-[220px] rounded-[8px] border border-[#e2e6ee] bg-white py-1 shadow-[0_8px_24px_rgba(15,27,45,0.14)]"
                    style={{left: menu.x, top: menu.y}}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#0f1b2d] hover:bg-[#f4f6fb]"
                    >
                        <Copy size={14} className="text-[#4e57d6]"/>
                        {t("docxEditor.contextMenu.copy")}
                    </button>

                    {menu.text && (
                        <button
                            type="button"
                            onClick={handleSearchInGoogle}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#0f1b2d] hover:bg-[#f4f6fb]"
                        >
                            <Search size={14} className="text-[#4e57d6]"/>
                            {/* Найти «текст» в Google */}
                            {t("docxEditor.contextMenu.searchInGoogle", {query: truncatedQuery})}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}