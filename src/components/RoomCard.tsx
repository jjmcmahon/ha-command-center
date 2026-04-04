import { useMemo } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

interface RoomCardProps {
  name: string;
  areaId: string;
  entities: Record<string, HassEntity>;
  onToggleLight?: (entityId: string, currentState: string) => void;
}

export default function RoomCard({ name, areaId, entities, onToggleLight }: RoomCardProps) {
  const roomEntities = useMemo(() => {
    return Object.values(entities).filter(
      (e) => (e.attributes as any)?.area_id === areaId
    );
  }, [entities, areaId]);

  const lights = roomEntities.filter((e) => e.entity_id.startsWith('light.'));
  const sensors = roomEntities.filter((e) => e.entity_id.startsWith('sensor.'));
  const climate = roomEntities.filter((e) => e.entity_id.startsWith('climate.'));
  const lightsOn = lights.filter((l) => l.state === 'on').length;

  const temp = climate[0]?.attributes?.current_temperature;
  const humidity = sensors.find((s) => 
    s.entity_id.includes('humidity')
  )?.state;

  return (
    <div style={{
      background: theme.colors.bgCard,
      borderRadius: theme.radii.lg,
      padding: '1.5rem',
      border: `1px solid ${lightsOn > 0 ? theme.colors.borderGlow : theme.colors.borderDefault}`,
      boxShadow: lightsOn > 0 ? theme.shadows.neonGreen : theme.shadows.card,
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.colors.textPrimary }}>{name}</h3>
        <span style={{
          fontSize: '0.75rem',
          padding: '2px 8px',
          borderRadius: theme.radii.sm,
          background: lightsOn > 0 ? `${theme.colors.neonGreen}20` : `${theme.colors.textMuted}20`,
          color: lightsOn > 0 ? theme.colors.neonGreen : theme.colors.textMuted,
        }}>
          {lightsOn > 0 ? `${lightsOn} on` : 'off'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        {temp && (
          <MiniStat label="Temp" value={`${temp}°`} color={theme.colors.neonOrange} />
        )}
        {humidity && (
          <MiniStat label="Humidity" value={`${humidity}%`} color={theme.colors.neonCyan} />
        )}
      </div>

      {/* Light toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {lights.map((light) => (
          <button
            key={light.entity_id}
            onClick={() => onToggleLight?.(light.entity_id, light.state)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              borderRadius: theme.radii.sm,
              border: 'none',
              cursor: 'pointer',
              background: light.state === 'on' ? `${theme.colors.neonGreen}15` : `${theme.colors.textMuted}10`,
              color: light.state === 'on' ? theme.colors.neonGreen : theme.colors.textMuted,
              transition: 'all 0.2s ease',
              fontFamily: theme.fonts.body,
              fontSize: '0.85rem',
            }}
          >
            <span>{(light.attributes as any)?.friendly_name || light.entity_id}</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: light.state === 'on' ? theme.colors.neonGreen : theme.colors.textMuted,
              boxShadow: light.state === 'on' ? theme.shadows.neonGreen : 'none',
            }} />
          </button>
        ))}
        {lights.length === 0 && (
          <span style={{ color: theme.colors.textMuted, fontSize: '0.8rem' }}>No lights paired yet</span>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: theme.fonts.mono, color }}>
        {value}
      </div>
    </div>
  );
}
