import { Link } from '../router.jsx';
import { btnGhost, shell } from '../ui.js';

export default function NotFoundPage() {
  return (
    <main className={`${shell} page-enter flex-1 py-20`}>
      <div className="empty-state">
        <p className="eyebrow justify-center">404</p>
        <h1 className="page-title mt-4">This page does not exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] text-ink-2">
          The link may be old, or the wallpaper behind it is no longer in the archive.
        </p>
        <Link className={`${btnGhost} mt-6`} to="/">
          Back to the archive
        </Link>
      </div>
    </main>
  );
}
