import { useAuth } from '@/data/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

/** Unauthenticated users see this and nothing else (SPEC §3.3). */
export function SignIn() {
  const { signInWithGoogle } = useAuth();
  return (
    <main className="relative mx-auto flex min-h-screen max-w-content flex-col items-center justify-center px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <h1 className="font-display text-display-xl text-text">Training &amp; Meal Planner</h1>
      <p className="mt-3 text-body text-text-muted">
        Strength, fuel and sauna — one plan, on every device.
      </p>
      <button
        onClick={signInWithGoogle}
        className="mt-8 min-h-tap rounded-lg bg-accent px-6 py-3 font-display uppercase
                   tracking-wide text-accent-ink transition-opacity duration-fast ease-brand
                   hover:opacity-90"
      >
        Sign in with Google
      </button>
    </main>
  );
}
