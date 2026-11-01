export function IntensityDots({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div role="group" aria-label="Intensity" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== undefined && n <= value;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Intensity ${n}`}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className="flex min-h-touch min-w-touch items-center justify-center"
          >
            <span
              className={[
                'h-5 w-5 rounded-full border transition-colors',
                filled ? 'border-accent bg-accent' : 'border-border bg-surface',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}
