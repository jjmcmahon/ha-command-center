import { useCallback, useMemo } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

interface ClimatePanelProps {
  entities: Record<string, HassEntity>;
  onCallService: (domain: string, service: string, data?: Record<string, unknown>, target?: { entity_id?: string | string[] }) => void;
}

const HVAC_COLORS: Record<string, string> = {
  heating: theme.colors.neonOrange,
  cooling: theme.colors.neonCyan,
  idle: theme.colors.textMuted,
  off: theme.colors.textMuted,
  fan: theme.colors.neonPurple,
  drying: theme.colors.statusWarning,
};

const HVAC_ICONS: Record<string, string> = {
  heat: '🔥',
  cool: '❄️',
  heat_cool: '🔄',
  auto: '🤖',
  dry: '💧',
  fan_only: '🌀',
  off: '⏻',
};

export default function ClimatePanel({ entities, onCallService }: ClimatePanelProps) {
  const climateEntities = useMemo(() =>
    Object.values(entities).filter((e) => e.entity_id.startsWith('climate.')),
    [entities]
  );

  const energySensors = useMemo(() =>
    Object.values(entities).filter((e) =>
      e.entity_id.startsWith('sensor.') && (
        e.entity_id.includes('energy') ||
        e.entity_id.includes('power') ||
        e.entity_id.includes('electricity') ||
        (e.attributes as any)?.device_class === 'energy' ||
        (e.attributes as any)?.device_class === 'power'
      )
    ),
    [entities]
  );

  const tempSensors = useMemo(() =>
    Object.values(entities).filter((e) =>
      e.entity_id.startsWith('sensor.') && (
        (e.attributes as any)?.device_class === 'temperature' ||
        e.entity_id.includes('temperature')
      )
    ),
    [entities]
  );

  const humiditySensors = useMemo(() =>
    Object.values(entities).filter((e) =>
      e.entity_id.startsWith('sensor.') && (
        (e.attributes as any)?.device_class === 'humidity' ||
        e.entity_id.includes('humidity')
      )
    ),
    [entities]
  );

  return (
    <div style={{
      background: theme.colors.bgCard, borderRadius: theme.radii.lg,
      padding: '1.5rem', border: `1px solid ${theme.colors.borderDefault}`,
      boxShadow: theme.shadows.card,
    }}>
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: theme.colors.neonOrange }}>
        Climate & Energy
      </h2>

      {/* Thermostat controls */}
      {climateEntities.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {climateEntities.map((climate) => (
            <ThermostatCard
              key={climate.entity_id}
              entity={climate}
              onCallService={onCallService}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '1rem', marginBottom: '1rem',
          borderRadius: theme.radii.md,
          background: `${theme.colors.textMuted}08`,
          color: theme.colors.textMuted, fontSize: '0.85rem',
        }}>
          No thermostats found — add a climate integration in HA
        </div>
      )}

      {/* Temperature sensors grid */}
      {tempSensors.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
            Temperature Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {tempSensors.map((sensor) => (
              <SensorTile
                key={sensor.entity_id}
                name={(sensor.attributes as any)?.friendly_name?.replace(/temperature/i, '').trim() || sensor.entity_id.split('.')[1]}
                value={`${sensor.state}°`}
                color={theme.colors.neonOrange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Humidity sensors grid */}
      {humiditySensors.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
            Humidity
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {humiditySensors.map((sensor) => (
              <SensorTile
                key={sensor.entity_id}
                name={(sensor.attributes as any)?.friendly_name?.replace(/humidity/i, '').trim() || sensor.entity_id.split('.')[1]}
                value={`${sensor.state}%`}
                color={theme.colors.neonCyan}
              />
            ))}
          </div>
        </div>
      )}

      {/* Energy sensors */}
      {energySensors.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.8rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
            Energy
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {energySensors.map((sensor) => {
              const unit = (sensor.attributes as any)?.unit_of_measurement || '';
              return (
                <SensorTile
                  key={sensor.entity_id}
                  name={(sensor.attributes as any)?.friendly_name || sensor.entity_id.split('.')[1]}
                  value={`${sensor.state} ${unit}`}
                  color={theme.colors.neonPink}
                />
              );
            })}
          </div>
        </div>
      )}

      {climateEntities.length === 0 && tempSensors.length === 0 && energySensors.length === 0 && (
        <div style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>
          No climate or energy entities found yet. SmartThings climate devices will appear once assigned.
        </div>
      )}
    </div>
  );
}

function ThermostatCard({ entity, onCallService }: {
  entity: HassEntity;
  onCallService: ClimatePanelProps['onCallService'];
}) {
  const attrs = entity.attributes as any;
  const currentTemp = attrs?.current_temperature;
  const targetTemp = attrs?.temperature;
  const hvacAction = attrs?.hvac_action || 'idle';
  const hvacModes: string[] = attrs?.hvac_modes || [];
  const currentMode = entity.state;
  const friendlyName = attrs?.friendly_name || entity.entity_id;

  const actionColor = HVAC_COLORS[hvacAction] || theme.colors.textMuted;

  const handleSetTemp = useCallback((temp: number) => {
    onCallService('climate', 'set_temperature', { temperature: temp }, { entity_id: entity.entity_id });
  }, [onCallService, entity.entity_id]);

  const handleSetMode = useCallback((mode: string) => {
    onCallService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: entity.entity_id });
  }, [onCallService, entity.entity_id]);

  return (
    <div style={{
      background: theme.colors.bgSecondary, borderRadius: theme.radii.md,
      padding: '1rem', border: `1px solid ${actionColor}30`,
    }}>
      {/* Name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.colors.textPrimary }}>
          {friendlyName}
        </span>
        <span style={{
          fontSize: '0.7rem', padding: '2px 8px',
          borderRadius: theme.radii.sm,
          background: `${actionColor}20`, color: actionColor,
          textTransform: 'capitalize',
        }}>
          {hvacAction}
        </span>
      </div>

      {/* Temp display */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.75rem' }}>
        {currentTemp != null && (
          <div>
            <div style={{ fontSize: '0.6rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>Current</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: theme.fonts.mono, color: actionColor }}>
              {currentTemp}°
            </div>
          </div>
        )}
        {targetTemp != null && (
          <div>
            <div style={{ fontSize: '0.6rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>Target</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleSetTemp(targetTemp - 1)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `1px solid ${theme.colors.borderDefault}`,
                  background: 'transparent', color: theme.colors.textSecondary,
                  cursor: 'pointer', fontSize: '1rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: theme.fonts.mono, color: theme.colors.textPrimary }}>
                {targetTemp}°
              </span>
              <button
                onClick={() => handleSetTemp(targetTemp + 1)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `1px solid ${theme.colors.borderDefault}`,
                  background: 'transparent', color: theme.colors.textSecondary,
                  cursor: 'pointer', fontSize: '1rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
        )}
      </div>

      {/* Mode buttons */}
      {hvacModes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hvacModes.map((mode) => (
            <button
              key={mode}
              onClick={() => handleSetMode(mode)}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: theme.radii.sm,
                border: `1px solid ${currentMode === mode ? actionColor : theme.colors.borderDefault}`,
                background: currentMode === mode ? `${actionColor}20` : 'transparent',
                color: currentMode === mode ? actionColor : theme.colors.textMuted,
                cursor: 'pointer', fontSize: '0.7rem', fontFamily: theme.fonts.body,
              }}
            >
              {HVAC_ICONS[mode] || ''} {mode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SensorTile({ name, value, color }: { name: string; value: string; color: string }) {
  return (
    <div style={{
      background: theme.colors.bgSecondary, borderRadius: theme.radii.sm,
      padding: '0.5rem 0.75rem',
    }}>
      <div style={{ fontSize: '0.6rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.15rem' }}>
        {name}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: theme.fonts.mono, color }}>
        {value}
      </div>
    </div>
  );
}
