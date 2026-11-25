import { useEffect, useState } from 'react';
import { adminRequest } from './api.js';
import { card } from './ui.js';

export default function UsersAdmin() {
  const [state, setState] = useState({ loading: true, available: false, reason: '', users: [] });

  useEffect(() => {
    let active = true;
    adminRequest('/users')
      .then((data) => active && setState({ loading: false, ...data }))
      .catch((err) =>
        active && setState({ loading: false, available: false, reason: err.message, users: [] }),
      );
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) return <p className="text-[13px] text-ink-3">Loading accounts…</p>;

  if (!state.available) {
    return (
      <div className={`${card} max-w-[560px] p-5`}>
        <h2 className="font-display text-[22px] leading-none">Accounts are not available yet</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{state.reason}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          The list comes from Supabase Auth. Add the service role key to{' '}
          <code className="text-ink-2">server/.env</code> and restart the API.
        </p>
      </div>
    );
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-medium">Signed-up accounts</h2>
        <span className="text-[12px] text-ink-3">{state.users.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-b border-line text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-normal">Email</th>
              <th className="px-3 py-2.5 font-normal">Provider</th>
              <th className="px-3 py-2.5 font-normal">Joined</th>
              <th className="px-4 py-2.5 font-normal">Last sign-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {state.users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-ink-3">
                  No accounts yet.
                </td>
              </tr>
            )}
            {state.users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-2.5 text-[13px]">{user.email}</td>
                <td className="px-3 py-2.5 text-[12.5px] capitalize text-ink-2">{user.provider}</td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink-2">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-[12.5px] text-ink-2">
                  {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
