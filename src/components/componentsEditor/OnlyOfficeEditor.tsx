import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    coauthoringService,
    type OnlyOfficeConfig,
} from "@/service/coauthoringService/coauthoringService.ts";
import {X} from "lucide-react";

interface Props {
    /** Вложение карточки, которое открываем на соредактирование. */
    attachmentId: number;
    fileName: string;
    onClose: () => void;
}

// Api.js Document Server кладёт конструктор редактора в window. DocsAPI. Тип узкий —
// нам нужен лишь конструктор и метод destroyEditor для корректного закрытия.
interface DocsApi {
    DocEditor: new (elementId: string, config: unknown) => {destroyEditor?: () => void};
}
declare global {
    interface Window {
        DocsAPI?: DocsApi;
    }
}

const CONTAINER_ID = "onlyoffice-componentsEditor-container";

/**
 * Обёртка редактора OnlyOffice (COOP-1).
 *
 * Конфиг (адрес Document Server, подписанный JWT, ссылки на файл и callback) целиком
 * приходит с backend — клиент лишь грузит api.js по ServerUrl из конфига и открывает
 * DocEditor. Комментарии и рецензирование — нативные средства OnlyOffice; правку/
 * рецензирование по правам определяет тоже backend (document.permissions).
 */
export function OnlyOfficeEditor({attachmentId, fileName, onClose}: Props) {
    const {t} = useTranslation();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const editorRef = useRef<{destroyEditor?: () => void} | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const config = await coauthoringService.getConfig(attachmentId);
                if (cancelled) return;

                await loadApiScript(config.serverUrl);
                if (cancelled) return;

                if (!window.DocsAPI) {
                    setError(t("coauthoring.errorScript"));
                    setLoading(false);
                    return;
                }

                editorRef.current = new window.DocsAPI.DocEditor(CONTAINER_ID, buildDocsConfig(config, onClose));
                setLoading(false);
            } catch (e) {
                if (cancelled) return;
                const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
                setError(message ?? t("coauthoring.errorOpen"));
                setLoading(false);
            }
        }

        void init();

        return () => {
            cancelled = true;
            // Освобождаем сессию редактора: без destroyEditor DS держит документ открытым.
            try {
                editorRef.current?.destroyEditor?.();
            } catch {
                // редактор мог не инициализироваться — закрытие всё равно безопасно
            }
            editorRef.current = null;
        };
    }, [attachmentId, onClose, t]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
            <div className="flex items-center justify-between bg-[#1c2740] px-4 py-2 text-white">
                <span className="truncate text-[14px] font-medium">{fileName}</span>
                <button
                    type="button"
                    onClick={onClose}
                    title={t("coauthoring.close")}
                    className="border-none bg-transparent p-1 text-white/80 cursor-pointer hover:text-white"
                >
                    <X size={18}/>
                </button>
            </div>

            <div className="relative flex-1 bg-white">
                {loading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center text-[14px] text-[#55617a]">
                        {t("coauthoring.loading")}
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-[#c0392b]">
                        {error}
                    </div>
                )}
                <div id={CONTAINER_ID} className="h-full w-full"/>
            </div>
        </div>
    );
}

/** Строит объект конфига в форме, которую ждёт DocsAPI.DocEditor. */
function buildDocsConfig(config: OnlyOfficeConfig, onClose: () => void) {
    return {
        documentType: config.documentType,
        token: config.token,
        document: {
            fileType: config.document.fileType,
            key: config.document.key,
            title: config.document.title,
            url: config.document.url,
            permissions: config.document.permissions,
        },
        editorConfig: {
            mode: config.editorConfig.mode,
            callbackUrl: config.editorConfig.callbackUrl,
            lang: config.editorConfig.lang,
            user: config.editorConfig.user,
        },
        width: "100%",
        height: "100%",
        events: {
            onRequestClose: onClose,
        },
    };
}

// api.js грузится один раз на страницу и кэшируется: у разных вложений один и тот же
// Document Server, повторно тянуть скрипт незачем.
const loadedScripts = new Map<string, Promise<void>>();

function loadApiScript(serverUrl: string): Promise<void> {
    const src = `${serverUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;

    const existing = loadedScripts.get(src);
    if (existing) return existing;

    const promise = new Promise<void>((resolve, reject) => {
        if (window.DocsAPI) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            loadedScripts.delete(src);
            reject(new Error("Не удалось загрузить api.js OnlyOffice"));
        };
        document.body.appendChild(script);
    });

    loadedScripts.set(src, promise);
    return promise;
}
