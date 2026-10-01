// Thrown from a service when a request can't be fulfilled for a domain
// reason (not found, conflict, forbidden, etc). Caught by the global error
// middleware in index.ts, which maps it straight to `status`/`message` —
// controllers don't need their own try/catch for these.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
