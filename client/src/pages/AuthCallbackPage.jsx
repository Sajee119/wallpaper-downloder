import { useEffect } from 'react';
import { useRouter } from '../router.jsx';
import { useAuth } from '../auth.jsx';
import { shell } from '../ui.js';

export default function AuthCallbackPage() {
  const { initializing, user } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (initializing) return;
    navigate(user ? '/profile' : '/', { replace: true });
  }, [initializing, navigate, user]);

  return (
    <main className={`${shell} flex-1 py-24`}>
      <div className="surface rounded-2xl px-6 py-16 text-center">
        <i className="fa-solid fa-circle-notch fa-spin text-[18px] text-ink-3" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[26px] leading-none">Signing you in</h1>
        <p className="mt-2 text-[13px] text-ink-2">
          {initializing ? 'Finishing the Google handshake…' : 'Taking you to your profile.'}
        </p>
      </div>
    </main>
  );
}
