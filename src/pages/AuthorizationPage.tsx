import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";

export function AuthorizationPage() {
    const {login} = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await login(email, password);
            navigate("/");
        } catch {
            setError("Неверный email или пароль!");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Пароль" />
            {error && <p>{error}</p>}
            <button type="submit">Войти</button>
        </form>
    );
}