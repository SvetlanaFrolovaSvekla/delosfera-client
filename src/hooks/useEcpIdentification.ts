/**
 * Общая логика "идентификации" в облачной ЭЦП ГП «Инфоком»: ПИН (+ необязательный ИНН организации)
 * → способы получения кода (2.1) → отправка кода (2.2) → ввод кода. Используется и в окне подписи
 * (EcpSignModal), и в личном кабинете (EcpCredentialCard); последний шаг — что делать с кодом
 * (подписать резолюцию / сохранить идентификацию) — у каждого свой, см. хосты.
 */
import {useCallback, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    infocomEcpService, infocomErrorText, isValidOrganizationInn, isValidPersonIdnp,
} from "@/service/infocomEcpService.ts";

export type EcpIdentStep = "idnp" | "code";

export const PERSON_IDNP_LENGTH = 14;
export const ORGANIZATION_INN_MAX_LENGTH = 14;

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

export function useEcpIdentification() {
    const {t} = useTranslation();
    const [step, setStep] = useState<EcpIdentStep>("idnp");
    const [personIdnp, setPersonIdnp] = useState("");
    const [organizationInn, setOrganizationInn] = useState("");
    const [methods, setMethods] = useState<string[]>([]);
    const [method, setMethod] = useState("sms");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const idnpValid = isValidPersonIdnp(personIdnp);
    const innValid = organizationInn === "" || isValidOrganizationInn(organizationInn);

    // Способы получения кода относятся к конкретной паре ПИН/ИНН — при смене любого из них загружаем заново.
    const changeIdnp = useCallback((value: string) => {
        setPersonIdnp(digitsOnly(value, PERSON_IDNP_LENGTH));
        setMethods([]);
        setError(null);
    }, []);

    const changeInn = useCallback((value: string) => {
        setOrganizationInn(digitsOnly(value, ORGANIZATION_INN_MAX_LENGTH));
        setMethods([]);
        setError(null);
    }, []);

    const loadMethods = useCallback(async () => {
        if (!idnpValid) { setError(t("ecp.identity.errPinLength")); return; }
        if (!innValid) { setError(t("ecp.identity.errInnFormat")); return; }
        setBusy(true);
        setError(null);
        try {
            const {userAuthMethodList} = await infocomEcpService.authMethods(personIdnp, organizationInn);
            const active = userAuthMethodList.filter((m) => m.isActive).map((m) => m.authType);
            const available = active.length > 0 ? active : userAuthMethodList.map((m) => m.authType);
            setMethods(available);
            if (available[0]) setMethod(available[0]);
            if (available.length === 0) setError(t("ecp.identity.errNoMethods"));
        } catch (e) {
            setError(infocomErrorText(e, t("ecp.identity.errMethodsFailed")));
        } finally {
            setBusy(false);
        }
    }, [t, idnpValid, innValid, personIdnp, organizationInn]);

    const requestCode = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            await infocomEcpService.pinCode(personIdnp, method, organizationInn);
            setStep("code");
        } catch (e) {
            setError(infocomErrorText(e, t("ecp.identity.errCodeRequestFailed")));
        } finally {
            setBusy(false);
        }
    }, [t, personIdnp, method, organizationInn]);

    const reset = useCallback(() => {
        setStep("idnp");
        setPersonIdnp("");
        setOrganizationInn("");
        setMethods([]);
        setCode("");
        setError(null);
    }, []);

    /** Шаг "ПИН": сначала загружаем способы, затем отправляем код. */
    const methodsLoaded = methods.length > 0;
    const next = methodsLoaded ? requestCode : loadMethods;

    return {
        step, personIdnp, organizationInn, methods, method, code, busy, error,
        idnpValid, innValid, methodsLoaded, canNext: idnpValid && innValid,
        changeIdnp, changeInn, setMethod, setCode, setBusy, setError,
        next, reset,
    };
}

export type EcpIdentification = ReturnType<typeof useEcpIdentification>;
