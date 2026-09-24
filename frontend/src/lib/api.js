const BASE_URL = "/api";
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
async function request(path, init) {
    const res = await fetch(`${BASE_URL}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...init?.headers },
        ...init,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, body.message ?? res.statusText);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
async function upload(path, formData) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(res.status, body.message ?? res.statusText);
    }
    return res.json();
}
export const api = {
    get: (path) => request(path),
    post: (path, data) => request(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
    put: (path, data) => request(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
    patch: (path, data) => request(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
    delete: (path) => request(path, { method: "DELETE" }),
    upload,
};
