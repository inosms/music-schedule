export class Token {
    private _accessToken: string;
    private _refreshToken: string;
    private _expiresInSeconds: number;
    private _createdAt: number;

    constructor(token: { accessToken: string; refreshToken: string; expiresInSeconds: number }) {
        this._accessToken = token.accessToken;
        this._refreshToken = token.refreshToken;
        this._expiresInSeconds = token.expiresInSeconds;
        this._createdAt = Date.now();
    }

    static fromJson(json: string): Token {
        const parsed = JSON.parse(json);
        let token = new Token({
            accessToken: parsed._accessToken,
            refreshToken: parsed._refreshToken,
            expiresInSeconds: parsed._expiresInSeconds,
        });
        token._createdAt = parsed._createdAt;
        return token;
    }

    toJson(): string {
        return JSON.stringify(this);
    }

    get accessToken() {
        return this._accessToken;
    }

    get refreshToken() {
        return this._refreshToken;
    }

    get expiresInSeconds() {
        return this._expiresInSeconds;
    }

    get isExpired() {
        return Date.now() >= this._createdAt + this._expiresInSeconds * 1000;
    }
}