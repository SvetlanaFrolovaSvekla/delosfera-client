import i18n from "i18next";
import {apiClient} from "@/service/apiClient.ts";

/**
 * ЭЦП ГП «Инфоком» (SIG-ECP, тестовый контур). Клиент → delosfera-server (/signing/infocom/*) →
 * delosfera-ecp-service → cdsapi-test.srs.kg. Типы полей — как у провайдера (см. документацию
 * раздела 2), сервис на бекенде их не переименовывает.
 *
 * ЭП здесь — не замена входа в систему (документация провайдера прямо запрещает ЭП как первый
 * фактор), а доп. подтверждение действия — см. EcpSignModal, который проводит согласующего через
 * все шаги и передаёт итоговую подпись в резолюцию "Согласовать".
 */

export interface UserAuthMethod {
    authType: string;
    isActive: boolean;
}

export interface UserAuthMethodsResponse {
    userAuthMethodList: UserAuthMethod[];
}

export interface GetPinCodeResponse {
    status: number;
}

export interface AccountAuthResponse {
    createAt: string | null;
    expireAt: string | null;
    /** 0 — физ.лицо, 1 — представитель юр.лица, 2 — юр.лицо. */
    subjectType: number;
    personIdnp: number | null;
    personFio: string | null;
    organizationInn: string | null;
    organizationName: string | null;
    isActive: boolean;
    /** Живёт ~1 минуту. */
    token: string | null;
}

export interface CertIssuer {
    commonName: string | null;
    organizationName: string | null;
    countryName: string | null;
}

export interface GetCertInfoResponse {
    validNotBefore: string | null;
    validNotAfter: string | null;
    personIdnp: number | null;
    commonName: string | null;
    organizationInn: string | null;
    organizationName: string | null;
    countryName: string | null;
    keyIdentifier: string | null;
    certIssuer: CertIssuer | null;
}

export interface SignHashResponse {
    isSuccesfull: boolean;
    sign: string | null;
    timestamp: number;
}

export interface CheckSignResponse {
    personIdnp: number | null;
    personFio: string | null;
    organizationInn: string | null;
    organizationName: string | null;
    verified: boolean;
    timestamp: number;
}

/** Тело ошибки провайдера/ecp-service, как приходит в response.data при не-2xx. */
export interface InfocomErrorBody {
    errorCode: number;
    errorMessage: string;
    isActive?: boolean;
    inactiveReason?: string;
}

/** ПИН физ. лица — ровно 14 цифр (та же проверка на backend и в ecp-service). */
export const PERSON_IDNP_PATTERN = /^\d{14}$/;

export const isValidPersonIdnp = (value: string) => PERSON_IDNP_PATTERN.test(value);

/** ИНН организации — только цифры, 10–14 знаков (у физ. лица не задаётся). */
export const isValidOrganizationInn = (value: string) => /^\d{10,14}$/.test(value);

/**
 * organizationInn необязателен: для физ. лица не передаётся. Если подписывают от организации
 * (представитель юр. лица), ИНН уходит в 2.1/2.2/2.3; пустое значение backend и ecp-service
 * дальше провайдеру не отправляют.
 */
export const infocomEcpService = {
    /** 2.1 Получение метода авторизации. */
    async authMethods(personIdnp: string, organizationInn?: string): Promise<UserAuthMethodsResponse> {
        const {data} = await apiClient.post<UserAuthMethodsResponse>(
            "/signing/infocom/auth-methods", {personIdnp, organizationInn: organizationInn || undefined});
        return data;
    },

    /** 2.2 Запрос на отправку пин-кода по выбранному методу. */
    async pinCode(personIdnp: string, method: string, organizationInn?: string): Promise<GetPinCodeResponse> {
        const {data} = await apiClient.post<GetPinCodeResponse>(
            "/signing/infocom/pin-code", {personIdnp, method, organizationInn: organizationInn || undefined});
        return data;
    },

    /** 2.3 Получение токена доступа по пин-коду. */
    async token(personIdnp: string, byPin: string, organizationInn?: string): Promise<AccountAuthResponse> {
        const {data} = await apiClient.post<AccountAuthResponse>(
            "/signing/infocom/token", {personIdnp, byPin, organizationInn: organizationInn || undefined});
        return data;
    },

    /** 2.4 Получение сведений о сертификате по токену доступа. */
    async certInfo(userToken: string): Promise<GetCertInfoResponse> {
        const {data} = await apiClient.post<GetCertInfoResponse>(
            "/signing/infocom/cert-info", {userToken});
        return data;
    },

    /** 2.5 Подписание хэша выданным токеном доступа. */
    async signHash(hash: string, userToken: string): Promise<SignHashResponse> {
        const {data} = await apiClient.post<SignHashResponse>(
            "/signing/infocom/sign-hash", {hash, userToken});
        return data;
    },

    /** 2.6 Проверка подписи по хэшу. */
    async checkSign(signBase64: string, hash: string): Promise<CheckSignResponse> {
        const {data} = await apiClient.post<CheckSignResponse>(
            "/signing/infocom/check-sign", {signBase64, hash});
        return data;
    },
};

/**
 * Понятный пользователю текст ошибки ЭЦП. Порядок: сообщение провайдера/backend (например,
 * «Неверный ПИН-код! Осталось попыток: N») → ошибка валидации → текст по HTTP-статусу.
 * Технический текст axios («Request failed with status code 500», «Network Error») пользователю
 * не показываем никогда — например, когда страница долго простояла открытой («уснула») и сеть,
 * сессия или сервис ЭЦП за это время отвалились.
 */
export function infocomErrorText(e: unknown, запасное: string): string {
    const err = e as {
        response?: {
            status?: number;
            data?: unknown;
        };
        code?: string;
    };
    const raw = err.response?.data;
    const body = raw && typeof raw === "object"
        ? raw as Partial<InfocomErrorBody> & {message?: string; errors?: Record<string, string[]>}
        : undefined;

    const usable = (text: unknown): text is string =>
        typeof text === "string" && text.trim() !== "" && !text.trimStart().startsWith("<")
        // Общая заглушка ExceptionHandlingMiddleware ничего не объясняет - лучше текст по статусу.
        && text !== "Внутренняя ошибка сервера";

    if (usable(body?.errorMessage)) return body.errorMessage;
    if (usable(body?.message)) return body.message;
    // 400 от [ApiController] (ValidationProblemDetails) — например, ПИН не из 14 цифр.
    const firstValidationError = body?.errors ? Object.values(body.errors).flat()[0] : undefined;
    if (usable(firstValidationError)) return firstValidationError;

    const status = err.response?.status;
    // Ответа нет вовсе: сеть пропала, компьютер просыпался, сервер перезапускался.
    if (!err.response) {
        return err.code === "ECONNABORTED" || err.code === "ETIMEDOUT"
            ? i18n.t("ecp.errors.timeout")
            : i18n.t("ecp.errors.network");
    }
    if (status === 401) return i18n.t("ecp.errors.sessionExpired");
    if (status === 429) return i18n.t("ecp.errors.tooManyAttempts");
    if (status === 504 || status === 408) return i18n.t("ecp.errors.timeout");
    if (status === 502 || status === 503) return i18n.t("ecp.errors.unavailable");
    if (status !== undefined && status >= 500) return i18n.t("ecp.errors.serverError");
    return запасное;
}
