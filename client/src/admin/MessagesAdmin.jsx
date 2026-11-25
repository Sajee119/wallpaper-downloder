import { useEffect, useState } from 'react';
import { adminRequest } from './api.js';
import { btn, btnDanger, btnPrimary, card, textarea } from './ui.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'replied', label: 'Replied' },
];

export default function MessagesAdmin() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminRequest('/messages');
      setMessages(data.messages ?? []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = messages.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    setReply(selected?.reply ?? '');
  }, [selected?.id]);

  const select = async (row) => {
    setSelectedId(row.id);
    setNotice('');
    if (row.status === 'new') {
      try {
        await adminRequest(`/messages/${row.id}`, { method: 'PATCH', body: { status: 'read' } });
        setMessages((previous) =>
          previous.map((entry) => (entry.id === row.id ? { ...entry, status: 'read' } : entry)),
        );
      } catch {
        /* reading is a nicety */
      }
    }
  };

  const saveReply = async () => {
    if (!selected) return;
    try {
      const data = await adminRequest(`/messages/${selected.id}`, {
        method: 'PATCH',
        body: { reply, status: 'replied' },
      });
      setMessages((previous) =>
        previous.map((entry) => (entry.id === selected.id ? data.message : entry)),
      );
      setNotice('Reply saved');
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this request?')) return;
    try {
      await adminRequest(`/messages/${selected.id}`, { method: 'DELETE' });
      setMessages((previous) => previous.filter((entry) => entry.id !== selected.id));
      setSelectedId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = filter === 'all' ? messages : messages.filter((row) => row.status === filter);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((entry) => {
          const count =
            entry.key === 'all'
              ? messages.length
              : messages.filter((row) => row.status === entry.key).length;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setFilter(entry.key)}
              className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                filter === entry.key
                  ? 'border-line-2 bg-raised text-ink'
                  : 'border-line text-ink-3 hover:text-ink'
              }`}
            >
              {entry.label}
              <span className="ml-1.5 tabular-nums text-ink-3">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className={`${card} overflow-hidden`}>
          {loading ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">Loading requests…</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-ink-3">
              No requests here. The form lives at /contact.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => select(row)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      row.id === selectedId ? 'bg-raised' : 'hover:bg-raised/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[13px]">{row.subject}</p>
                      <span
                        className={`shrink-0 text-[10.5px] uppercase tracking-wide ${
                          row.status === 'new' ? 'text-amber' : 'text-ink-3'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {row.name} · {row.email}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-ink-3">{row.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${card} p-4`}>
          {!selected ? (
            <p className="py-10 text-center text-[13px] text-ink-3">
              Pick a request to read it and write a reply.
            </p>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-line pb-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
                <h2 className="mt-1 font-display text-[24px] leading-tight">{selected.subject}</h2>
                <p className="mt-1 text-[12.5px] text-ink-2">
                  {selected.name} ·{' '}
                  <a href={`mailto:${selected.email}`} className="underline decoration-line-2 underline-offset-2">
                    {selected.email}
                  </a>
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
                {selected.body}
              </p>

              <div className="mt-5">
                <label className="mb-1.5 block text-[12px] text-ink-3" htmlFor="reply">
                  Your reply
                </label>
                <textarea
                  id="reply"
                  rows={5}
                  className={textarea}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Write the answer you want to send…"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className={btnPrimary} onClick={saveReply} disabled={!reply.trim()}>
                  <i className="fa-solid fa-check text-[11px]" aria-hidden="true" />
                  Save reply
                </button>
                <a
                  className={btn}
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(
                    `Re: ${selected.subject}`,
                  )}&body=${encodeURIComponent(reply)}`}
                >
                  <i className="fa-solid fa-paper-plane text-[11px]" aria-hidden="true" />
                  Send by email
                </a>
                <button type="button" className={btnDanger} onClick={remove}>
                  Delete
                </button>
                {notice && <span className="text-[12px] text-ink-3">{notice}</span>}
              </div>

              {selected.repliedAt && (
                <p className="mt-3 text-[11.5px] text-ink-3">
                  Last replied {new Date(selected.repliedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
