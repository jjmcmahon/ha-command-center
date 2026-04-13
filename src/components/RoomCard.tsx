import { useMemo, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

interface RoomCardProps {
  name: string;
  areaId: string;
  /** Optional explicit entity IDs to show in this room */
  entityIds?: string[];
  entities: Record<string, HassEntity>;
  onToggleLight?: (entityId: string, currentState: string) => void;
  onSetBrightness?: (entityId: string, brightness: number) => void;
}

export default function RoomCard({ name, areaId, entityIds, entities, onToggleLight, onSetBrightness }: RoomCardProps) {
  const roomEntities = useMemo(() => {
    // If explicit entity IDs provided, use those
    if (entityIds && entityIds.length > 0) {
      return entityIds
        .map((id) => entities[id])
        .filter(Boolean);
    }
    // Otherwise try area_id matching
    return Object.values(entities).filter(
      (e) => (e.attributes as any)?.area_id === areaId
    );
  }, [entities, areaId, entityIds]);

  const lights = roomEntities.filter((e) => e.entity_id.startsWith('light.'));
  const sensors = roomEntities.filter((e) => e.entity_id.startsWith('sensor.'));
  const climateEnts = roomEntities.filter((e) => e.entity_id.startsWith('climate.'));
  const switches = roomEntities.filter((e) => e.entity_id.startsWith('switch.'));
  const mediaPlayers = roomEntities.filter((e) => e.entity_id.startsWith('media_player.'));
  const binarySensors = roomEntities.filter((e) => e.entity_id.startsWith('binary_sensor.'));

  const lightsOn = lights.filter((l) => l.state === 'on').length;
  const totalDevices = lights.length + switches.length + climateEnts.length + mediaPlayers.length;

  const temp = climateEnts[0]?.attributes?.current_temperature as number | undefined;
  const hvacAction = climateEnts[0]?.attributes?.hvac_action as string | undefined;
  const humidity = sensors.find((s) => s.entity_id.includes('humidity'))?.state;
  const occupancy = binarySensors.find((s) => s.entity_id.includes('occupancy') || s.entity_id.includes('motion'));
  const isOccupied = occupancy?.state === 'on';

  const activeMedia = mediaPlayers.find((m) => m.state === 'playing');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: theme.colors.textPrimary }}>{name}</h3>
          {occupancy && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOccupied ? theme.colors.neonCyan : 'transparent',
              border: `1px solid ${isOccupied ? theme.colors.neonCyan : theme.colors.textMuted}`,
              boxShadow: isOccupied ? theme.shadows.neonCyan : 'none',
            }} title={isOccupied ? 'Occupied' : 'Vacant'} />
          )}
        </div>
        <span style={{
          fontSize: '0.75rem',
          padding: '2px 8px',
          borderRadius: theme.radii.sm,
          background: lightsOn > 0 ? `${theme.colors.neonGreen}20` : `${theme.colors.textMuted}20`,
          color: lightsOn > 0 ? theme.colors.neonGreen : theme.colors.textMuted,
        }}>
          {totalDevices === 0 ? 'no devices' : lightsOn > 0 ? `${lightsOn} on` : 'off'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {temp != null && (
          <MiniStat label="Temp" value={`${temp}°`} color={theme.colors.neonOrange} />
        )}
        {humidity != null && (
          <MiniStat label="Humidity" value={`${humidity}%`} color={theme.colors.neonCyan} />
        )}
        {hvacAction && hvacAction !== 'off' && hvacAction !== 'idle' && (
          <MiniStat label="HVAC" value={hvacAction} color={theme.colors.neonPurple} />
        )}
      </div>

      {/* Now playing */}
      {activeMedia && (
        <div style={{
          padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
          borderRadius: theme.radii.sm,
          background: `${theme.colors.neonPurple}10`,
          border: `1px solid ${theme.colors.neonPurple}30`,
          fontSize: '0.8rem',
        }}>
          <span style={{ color: theme.colors.neonPurple }}>
            {(activeMedia.attributes as any)?.media_title || 'Playing'}
          </span>
          {(activeMedia.attributes as any)?.media_artist && (
            <span style={{ color: theme.colors.textMuted }}> — {(activeMedia.attributes as any).media_artist}</span>
          )}
        </div>
      )}

      {/* Light controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {lights.map((light) => (
          <LightRow
            key={light.entity_id}
            light={light}
            onToggle={onToggleLight}
            onSetBrightness={onSetBrightness}
          />
        ))}
        {switches.map((sw) => (
          <button
            key={sw.entity_id}
            onClick={() => onToggleLight?.(sw.entity_id, sw.state)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0.75rem', borderRadius: theme.radii.sm,
              border: 'none', cursor: 'pointer',
              background: sw.state === 'on' ? `${theme.colors.neonOrange}15` : `${theme.colors.textMuted}10`,
              color: sw.state === 'on' ? theme.colors.neonOrange : theme.colors.textMuted,
              transition: 'all 0.2s ease', fontFamily: theme.fonts.body, fontSize: '0.85rem',
            }}
          >
            <span>{(sw.attributes as any)?.friendly_name || sw.entity_id}</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: sw.state === 'on' ? theme.colors.neonOrange : theme.colors.textMuted,
            }} />
          </button>
        ))}
        {totalDevices === 0 && (
          <span style={{ color: theme.colors.textMuted, fontSize: '0.8rem' }}>
            Assign devices to &quot;{name}&quot; area in HA to populate
          </span>
        )}
      </div>
    </div>
  );
}

/** Individual light row with inline brightness slider */
function LightRow({ light, onToggle, onSetBrightness }: {
  light: HassEntity;
  onToggle?: (entityId: string, currentState: string) => void;
  onSetBrightness?: (entityId: string, brightness: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOn = light.state === 'on';
  const brightness = (light.attributes as any)?.brightness as number | undefined;
  const brightnessPct = brightness != null ? Math.round((brightness / 255) * 100) : undefined;

  return (
    <div>
      <button
        onClick={() => onToggle?.(light.entity_id, light.state)}
        onContextMenu={(e) => {
          e.preventDefault();
          setExpanded(!expanded);
        }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.5rem 0.75rem', borderRadius: theme.radii.sm,
          border: 'none', cursor: 'pointer', width: '100%',
          background: isOn ? `${theme.colors.neonGreen}15` : `${theme.colors.textMuted}10`,
          color: isOn ? theme.colors.neonGreen : theme.colors.textMuted,
          transition: 'all 0.2s ease', fontFamily: theme.fonts.body, fontSize: '0.85rem',
        }}
      >
        <span>{(light.attributes as any)?.friendly_name || light.entity_id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isOn && brightnessPct != null && (
            <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>{brightnessPct}%</span>
          )}
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{
              fontSize: '0.7rem', cursor: 'pointer', color: theme.colors.textMuted,
              padding: '0 4px',
            }}
          >
            {expanded ? '▲' : '▼'}
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isOn ? theme.colors.neonGreen : theme.colors.textMuted,
            boxShadow: isOn ? theme.shadows.neonGreen : 'none',
          }} />
        </div>
      </button>
      {expanded && isOn && (
        <div style={{
          padding: '0.5rem 0.75rem', marginTop: '2px',
          borderRadius: theme.radii.sm,
          background: `${theme.colors.textMuted}08`,
        }}>
          <label style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
            Brightness
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={brightnessPct ?? 100}
            onChange={(e) => {
              const pct = Number(e.target.value);
              onSetBrightness?.(light.entity_id, Math.round((pct / 100) * 255));
            }}
            style={{ width: '100%', accentColor: theme.colors.neonGreen }}
          />
        </div>
      )}
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
