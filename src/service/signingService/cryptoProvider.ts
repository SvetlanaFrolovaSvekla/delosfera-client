/**
 * Мост к криптопровайдеру на рабочем месте подписанта (SIG-02, INT-03).
 *
 * Закрытый ключ не должен покидать рабочее место: система отдаёт хеш, провайдер
 * подписывает его своим ключом и возвращает подпись и сертификат. Поэтому здесь
 * нет ни одной операции с ключом — только разговор с тем, кто им владеет.
 *
 * Провайдеров у банка может оказаться несколько, и какой именно будет — решается
 * при обследовании. Поэтому вместо одного жёстко зашитого способа перебираются
 * три, от самого удобного к самому простому:
 *
 *   1. Плагин в браузере — если он объявил себя в window;
 *   2. Локальный агент на 127.0.0.1 — так устроены ТУМАР и родственные средства
 *      ЭП: браузер говорит с ними по WebSocket, потому что доступа к смарт-карте
 *      у страницы нет и быть не должно;
 *   3. Ручной перенос — когда ни того, ни другого нет. Хеш показывается человеку,
 *      он подписывает его отдельной утилитой и приносит подпись обратно файлом.
 *
 * Третий способ выглядит неуклюже и нужен именно поэтому: пока плагин не
 * установлен и не согласован с банком, подписать документ квалифицированной
 * подписью можно всё равно — медленно, но можно, и весь остальной контур
 * проверяется по-настоящему.
 */

/** Порт, на котором локальные средства ЭП слушают браузер. */
const AGENT_PORTS = [13579, 8090];

const AGENT_TIMEOUT = 4000;

export type ProviderKind = "plugin" | "agent" | "manual";

export interface ProviderInfo {
    kind: ProviderKind;

    /** Как называть провайдера человеку. */
    title: string;

    /** Готов ли подписывать прямо сейчас. */
    ready: boolean;

    /** Почему не готов — показывается дословно. */
    reason?: string;
}

export interface CertificateChoice {
    /** Сертификат в base64 (DER) — его же примет сервер. */
    certificate: string;

    subject: string;
    issuer?: string;
    serial?: string;
    validTo?: string;
}

export interface SignedData {
    /** Подпись хеша, base64. */
    signature: string;

    /** Сертификат подписанта, base64. */
    certificate: string;
}

/** То, что провайдер обязан уметь: показать сертификаты и подписать хеш. */
export interface CryptoProvider {
    info: ProviderInfo;

    listCertificates(): Promise<CertificateChoice[]>;

    /** dataToSign — хеш в base64, ровно как его отдал сервер. */
    sign(dataToSign: string, certificate?: CertificateChoice): Promise<SignedData>;
}

/** Плагин, если он объявил себя в window. */
interface BrowserPlugin {
    listCertificates?: () => Promise<unknown>;
    getCertificates?: () => Promise<unknown>;
    signHash?: (data: string, certificate?: string) => Promise<unknown>;
    sign?: (data: string, certificate?: string) => Promise<unknown>;
    version?: string;
}

declare global {
    interface Window {
        tumar?: BrowserPlugin;
        TumarCSP?: BrowserPlugin;
        cryptoSocket?: BrowserPlugin;
    }
}

// ── обнаружение ──────────────────────────────────────────────────────────────

/**
 * Найти провайдера. Возвращается всегда что-то: если не нашлось ничего, это
 * ручной режим, а не ошибка — отказ на этом шаге лишил бы подписанта
 * единственного оставшегося пути.
 */
export async function detectProvider(): Promise<CryptoProvider> {
    const plugin = window.tumar ?? window.TumarCSP ?? window.cryptoSocket;
    if (plugin) return pluginProvider(plugin);

    const agent = await findAgent();
    if (agent) return agent;

    return manualProvider();
}

function pluginProvider(plugin: BrowserPlugin): CryptoProvider {
    const list = plugin.listCertificates ?? plugin.getCertificates;
    const sign = plugin.signHash ?? plugin.sign;

    if (!list || !sign) {
        return {
            info: {
                kind: "plugin",
                title: "Плагин электронной подписи",
                ready: false,
                reason: "Плагин установлен, но не отвечает на запрос сертификатов — " +
                    "возможно, нужна другая его версия",
            },
            listCertificates: async () => [],
            sign: async () => {
                throw new Error("Плагин не умеет подписывать");
            },
        };
    }

    return {
        info: {
            kind: "plugin",
            title: `Плагин электронной подписи${plugin.version ? ` ${plugin.version}` : ""}`,
            ready: true,
        },
        listCertificates: async () => normalizeCertificates(await list.call(plugin)),
        sign: async (dataToSign, certificate) =>
            normalizeSignature(await sign.call(plugin, dataToSign, certificate?.certificate), certificate),
    };
}

/**
 * Локальный агент. Опрашиваем известные порты по очереди; тот, что ответил
 * первым, и берём. Опрос идёт по одному, а не разом: одновременное подключение
 * к нескольким портам средства ЭП обычно понимают как попытку перехвата.
 */
async function findAgent(): Promise<CryptoProvider | null> {
    for (const port of AGENT_PORTS) {
        const socket = await openSocket(`wss://127.0.0.1:${port}`) ?? await openSocket(`ws://127.0.0.1:${port}`);
        if (socket) return agentProvider(socket);
    }
    return null;
}

function openSocket(url: string): Promise<WebSocket | null> {
    return new Promise((resolve) => {
        let socket: WebSocket;

        try {
            socket = new WebSocket(url);
        } catch {
            resolve(null);
            return;
        }

        const timer = setTimeout(() => {
            socket.close();
            resolve(null);
        }, AGENT_TIMEOUT);

        socket.onopen = () => {
            clearTimeout(timer);
            resolve(socket);
        };

        socket.onerror = () => {
            clearTimeout(timer);
            resolve(null);
        };
    });
}

function agentProvider(socket: WebSocket): CryptoProvider {
    const ask = (method: string, params: Record<string, unknown>): Promise<unknown> =>
        new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Средство ЭП не ответило")), 60_000);

            const onMessage = (event: MessageEvent) => {
                clearTimeout(timer);
                socket.removeEventListener("message", onMessage);

                try {
                    const answer = JSON.parse(String(event.data));
                    // Отказ пользователя от ввода PIN приходит тем же каналом, что и
                    // ответ, и это не сбой связи — показываем его словами провайдера.
                    if (answer?.error) reject(new Error(String(answer.error?.message ?? answer.error)));
                    else resolve(answer?.result ?? answer);
                } catch {
                    reject(new Error("Средство ЭП ответило неразборчиво"));
                }
            };

            socket.addEventListener("message", onMessage);
            socket.send(JSON.stringify({method, params}));
        });

    return {
        info: {kind: "agent", title: "Локальное средство электронной подписи", ready: true},
        listCertificates: async () => normalizeCertificates(await ask("listCertificates", {})),
        sign: async (dataToSign, certificate) =>
            normalizeSignature(
                await ask("signHash", {data: dataToSign, certificate: certificate?.certificate}),
                certificate,
            ),
    };
}

/**
 * Ручной режим: подписывает не браузер, а человек — сторонней утилитой. Список
 * сертификатов здесь пуст по существу, а не по недоработке: страница не знает,
 * что лежит на токене, и узнать не может.
 */
function manualProvider(): CryptoProvider {
    return {
        info: {
            kind: "manual",
            title: "Рабочее место без плагина",
            ready: false,
            reason: "Плагин электронной подписи не найден. Подписать можно вручную: " +
                "скопировать хеш, подписать его своей утилитой и приложить подпись с сертификатом",
        },
        listCertificates: async () => [],
        sign: async () => {
            throw new Error("В ручном режиме подпись прикладывается файлом, а не запросом к плагину");
        },
    };
}

// ── приведение ответов ───────────────────────────────────────────────────────

/**
 * Провайдеры отвечают по-разному: кто списком строк, кто списком объектов с
 * разными именами полей. Приводим к одному виду, а не подстраиваемся под каждый
 * в месте вызова.
 */
function normalizeCertificates(raw: unknown): CertificateChoice[] {
    const list = Array.isArray(raw) ? raw : Array.isArray((raw as {certificates?: unknown})?.certificates)
        ? (raw as {certificates: unknown[]}).certificates
        : [];

    return list.flatMap((item): CertificateChoice[] => {
        if (typeof item === "string") {
            return [{certificate: strip(item), subject: "Сертификат без описания"}];
        }

        if (item && typeof item === "object") {
            const o = item as Record<string, unknown>;
            const certificate = firstString(o, ["certificate", "cert", "base64", "data", "value"]);
            if (!certificate) return [];

            return [{
                certificate: strip(certificate),
                subject: firstString(o, ["subject", "subjectName", "owner", "cn"]) ?? "Сертификат без описания",
                issuer: firstString(o, ["issuer", "issuerName", "ca"]),
                serial: firstString(o, ["serial", "serialNumber"]),
                validTo: firstString(o, ["validTo", "notAfter", "expires"]),
            }];
        }

        return [];
    });
}

function normalizeSignature(raw: unknown, chosen?: CertificateChoice): SignedData {
    if (typeof raw === "string") {
        if (!chosen) throw new Error("Провайдер вернул подпись без сертификата — приложить её не к чему");
        return {signature: strip(raw), certificate: chosen.certificate};
    }

    if (raw && typeof raw === "object") {
        const o = raw as Record<string, unknown>;
        const signature = firstString(o, ["signature", "sign", "signedData", "result", "value"]);
        const certificate = firstString(o, ["certificate", "cert", "signerCertificate"]) ?? chosen?.certificate;

        if (signature && certificate) return {signature: strip(signature), certificate: strip(certificate)};
    }

    throw new Error("Провайдер вернул ответ, в котором нет подписи");
}

function firstString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return undefined;
}

/** PEM-обёртка и переносы строк серверу не нужны — он ждёт чистый base64. */
function strip(value: string): string {
    return value
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "")
        .trim();
}
