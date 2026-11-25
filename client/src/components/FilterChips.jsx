const ALL = 'All';

export default function FilterChips({ categories, value, onChange, disabled }) {
  const options = [ALL, ...categories];

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by collection">
      {options.map((category) => {
        const active = value === category;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(category)}
            className={`h-8 rounded-full border px-3.5 text-[12.5px] transition duration-300 disabled:cursor-default disabled:opacity-50 ${
              active
                ? 'border-transparent bg-ink text-paper shadow-[0_12px_24px_-20px_rgba(0,0,0,0.9)]'
                : 'border-transparent text-ink-2 hover:bg-panel hover:text-ink'
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
