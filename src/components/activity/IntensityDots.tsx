export function IntensityDots({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div role="group" aria-label="Intensity" className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== undefined && n <= value;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Intensity ${n}`}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className="flex min-h-touch flex-1 items-center justify-center"
          >
            <span
              className={[
                'h-3 w-full rounded-[2px] border transition-colors',
                filled ? 'border-accent bg-accent' : 'border-hairline bg-raised',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}
