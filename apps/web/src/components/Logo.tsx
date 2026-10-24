export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="TAP home">
      <span className="logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span>TAP</span>}
    </div>
  );
}
