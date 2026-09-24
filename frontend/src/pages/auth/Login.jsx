import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button, ErrorBanner } from "../../components/Button";
import { FormField } from "../../components/FormField";
export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const accountDeleted = searchParams.get("accountDeleted") === "1";
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const user = await login(email, password);
            navigate(user.role === "PET_PARENT" ? "/" : "/provider/dashboard");
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-surface px-container-padding-mobile py-12">
      <div className="w-full max-w-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Welcome back</h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">Log in to continue.</p>

        {accountDeleted && (<div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 font-body-md text-body-md text-secondary">
            Your account has been deleted.
          </div>)}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <ErrorBanner message={error}/>
          <FormField id="email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}/>
          <FormField id="password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}/>
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="font-body-md text-body-md mt-8 text-center text-on-surface-variant">
          New to PawTrack?{" "}
          <Link to="/signup" className="font-semibold text-secondary">
            Sign up
          </Link>
        </p>
      </div>
    </div>);
}
