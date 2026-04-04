import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

interface Mode {
  entityId: string;
  label: string;
  icon: string;
  color: string;
}

const MODES: Mode[] = [
  { entityId: 'input_boolean.movie_mode', label: 'Movie', icon: '🎬', color: theme.colors.neonPurple },
  { entityId: 'input_boolean.gaming_mode', label: 'Gaming', icon: '🎮', color: theme.colors.neonGreen },
  { entityId: 'input_boolean.goodnight', label: 'Goodnight', icon: '🌙', color: theme.colors.neonCyan },
  { entityId: 'input_boolean.party_mode', label: 'Party', icon: '🎉', color: theme.colors.neonPink },
  { entityId: 'input_boolean.guest_mode', label: 'Guest', icon: '👋', color: theme.colors.neonOrange },
  { entityId: 'input_boolean.do_not_disturb', label: 'DND', icon: '🔕', color: theme.colors.statusWarning },
];

interface ModePanelProps {
  entities: Record<string, HassEntity>;
  onToggle: (entityId: string, currentState: string) => void;
}

export default function ModePanel({ entities, onToggle }: ModePanelProps) {
  return (
    <div style={{
      background: theme.colors.bgCard,
      borderRadius: theme.radii.lg,
      padding: '1.5rem',
      border: `1px solid ${theme.colors.borderDefault}`,
      boxShadow: theme.shadows.card,
    }}>
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: theme.colors.neonPurple }}>
        House Modes
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
      }}>
        {MODES.map((mode) => {
          const entity = entities[mode.entityId];
          const isOn = entity?.state === 'on';
          return (
            <button
              key={mode.entityId}
              onClick={() => onToggle(mode.entityId, entity?.state ?? 'off')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.75rem 0.5rem',
                borderRadius: theme.radii.md,
                border: `1px solid ${isOn ? mode.color : 'transparent'}`,
                background: isOn ? `${mode.color}15` : `${theme.colors.textMuted}08`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: isOn ? mode.color : theme.colors.textMuted,
                fontFamily: theme.fonts.body,
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{mode.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
