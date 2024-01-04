// Code is from: https://github.com/spotify/web-api-examples 
// This is a modified version of the code from the Spotify Web API examples repo.
// The original code is licensed under the Apache 2.0 license.

import { Token } from './token';

const clientId = '553fb95155e2496292584bc36823741d';
const redirectUrlDev = 'http://localhost:3000';
const redirectUrlProd = 'https://music-time-table.simonschlegl.com';

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email'; // TODO

// Returns true if the current environment is a development environment
function isDevelopmentEnvironment(): boolean {
    // taken from https://stackoverflow.com/questions/35469836/detecting-production-vs-development-react-at-runtime
    return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
}

function getRedirectUrl(): string {
    return isDevelopmentEnvironment() ? redirectUrlDev : redirectUrlProd;
}

// Generate a code verifier according to the Spotify PKCE docs
// ref: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
function generateCodeVerifier(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(64));
    return randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");
}

// Given a code verifier, generate a code challenge according to the Spotify PKCE docs
// ref: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
async function generateCodeChallenge(code_verifier: string): Promise<string> {
    const data = new TextEncoder().encode(code_verifier);
    const hashed = await crypto.subtle.digest('SHA-256', data);

    let code_challenge_base64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return code_challenge_base64;
}

const codeVerifierLocalStorageKey = "code_verifier";

// Store the code verifier in local storage so we can later retrieve it
function storeCodeVerifier(code_verifier: string) {
    localStorage.setItem(codeVerifierLocalStorageKey, code_verifier);
}

// Get the code verifier from local storage
function getCodeVerifier(): string | null {
    return localStorage.getItem(codeVerifierLocalStorageKey);
}

// Remove the code verifier from local storage
function removeCodeVerifier() {
    localStorage.removeItem(codeVerifierLocalStorageKey);
}

// Redirect the user to the Spotify authorization page
// ref: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
export async function authorizeStep1UserAuth() {
    const code_verifier = generateCodeVerifier();
    const code_challenge_base64 = await generateCodeChallenge(code_verifier);
    storeCodeVerifier(code_verifier);

    const authUrl = new URL(authorizationEndpoint)
    const params = {
        response_type: 'code',
        client_id: clientId,
        scope: scope,
        code_challenge_method: 'S256',
        code_challenge: code_challenge_base64,
        redirect_uri: getRedirectUrl(),
    };

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
}

// Try to exchange the auth code for a token.
// If we are currently in a callback, we will find the code in the URL and do the exchange.
// If not in a callback, we will return null.
export async function tryAuthorizeStep2TokenExchange(): Promise<Token | null> {
    // On page load, try to fetch auth code from current browser search URL
    const args = new URLSearchParams(window.location.search);
    const code = args.get('code');

    const code_verifier = getCodeVerifier();

    // If we find a code and a code verifier, we can try to exchange them for a token
    if (code && !!code_verifier) {
        // remove the code verifier so that we do not try to exchange it again
        removeCodeVerifier();

        const params: Record<string, string> = {
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: getRedirectUrl(),
            code_verifier: code_verifier || '',
        };

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params).toString(),
        });

        let parsedResponse = await response.json();
        if (!response.ok) {
            throw new Error(parsedResponse.error_description);
        }

        const token = new Token({
            accessToken: parsedResponse.access_token,
            refreshToken: parsedResponse.refresh_token,
            expiresInSeconds: parsedResponse.expires_in,
        });

        // Remove code from URL so we can refresh correctly.
        const url = new URL(window.location.href);
        url.searchParams.delete("code");

        const updatedUrl = url.search ? url.href : url.href.replace('?', '');
        window.history.replaceState({}, document.title, updatedUrl);

        return token;
    } else {
        return null;
    }
}