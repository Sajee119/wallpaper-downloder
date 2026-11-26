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
            className="chip"
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
