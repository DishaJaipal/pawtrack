import { Link } from "react-router-dom";

export default function RoleSelect() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-container-padding-mobile py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Welcome to PawTrack
        </h1>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          Tell us who you are so we can set things up right.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <Link
            to="/signup/pet-parent"
            className="soft-card-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              pets
            </span>
            <span>
              <span className="font-headline-md text-body-lg block font-semibold text-on-surface">
                I'm a Pet Parent
              </span>
              <span className="font-body-md text-label-sm block text-on-surface-variant">
                Book care and manage your pet's records
              </span>
            </span>
          </Link>

          <Link
            to="/signup/provider"
            className="soft-card-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              medical_services
            </span>
            <span>
              <span className="font-headline-md text-body-lg block font-semibold text-on-surface">
                I'm a Service Provider
              </span>
              <span className="font-body-md text-label-sm block text-on-surface-variant">
                Vet clinic, groomer, trainer, or pet sitter
              </span>
            </span>
          </Link>
        </div>

        <p className="font-body-md text-body-md mt-8 text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-secondary">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
