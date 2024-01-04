import { useState, useEffect } from "react";
import { Token } from "./token";

export const useTokenStorage = () => {
    const localStorageKey = "music-time-table-token";

    const [token, setToken] = useState<Token | null>(() => {
        const token = localStorage.getItem(localStorageKey);
        if (!token) {
            return null;
        } else {
            return Token.fromJson(token);
        }
    });

    useEffect(() => {
        if (!token) {
            localStorage.removeItem(localStorageKey);
        } else {
            localStorage.setItem(localStorageKey, token.toJson());
        }
    }, [token]);

    const isLoggedIn = !!token && !token?.isExpired;

    return { token, setToken, isLoggedIn };
};