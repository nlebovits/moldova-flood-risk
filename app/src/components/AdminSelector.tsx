import { useMemo } from 'react';
import { useApp } from '../store/state';
import { useData } from '../lib/data';
import { t } from '../lib/i18n';

/**
 * Admin-unit (raion) zoom selector. A sharp-cornered native <select> listing
 * every raion alphabetically; choosing one selects it (the MapView selection
 * effect flies to its bounds). Map clicks on a raion keep the dropdown in sync
 * because its value is bound to `selectedAdminId`.
 */
export function AdminSelector() {
  const { locale, selectedAdminId, setSelectedAdmin } = useApp();
  const adminByName = useData((s) => s.adminByName);

  const names = useMemo(
    () => Object.keys(adminByName).sort((a, b) => a.localeCompare(b, locale)),
    [adminByName, locale],
  );

  if (names.length === 0) return null;

  return (
    <label className="block">
      <span className="re-eyebrow mb-1 block text-[var(--color-fg-3)]">
        {t(locale, 'admin_select.label')}
      </span>
      <select
        value={selectedAdminId ?? ''}
        onChange={(e) => setSelectedAdmin(e.target.value || null)}
        className="w-full border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-3 py-2 font-mono text-[13px] text-[var(--color-fg-1)] hover:bg-[var(--color-bg-sunken)] focus:outline-none"
      >
        <option value="">{t(locale, 'admin_select.placeholder')}</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
