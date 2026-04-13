import { useState, useCallback } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

interface LightingPanelProps {
  entities: Record<string, HassEntity>;
  onCallService: (domain: string, service: string, data?: Record<string, unknown>, target?: { entity_id?: string | string[] }) => void;
}

export default function LightingPanel({ entities, onCallService }: LightingPanelProps) {
  const [selectedLight, setSelectedLight] = useState<string | null>(null);

  const allLights = Object.values(entities).filter((e) => e.entity_id.startsWith('light.'));
  const lightsOn = allLights.filter((l) => l.state === 'on');
  const lightsOff = allLights.filter((l) => l.state !== 'on');

  const handleToggle = useCallback((entityId: string, currentState: string) => {
    onCallService('light', currentState === 'on' ? 'turn_off' : 'turn_on', undefined, { entity_id: entityId });
  }, [onCallService]);

  const handleBrightness = useCallback((entityId: string, brightness: number) => {
    onCallService('light', 'turn_on', { brightness }, { entity_id: entityId });
  }, [onCallService]);

  const handleColorTemp = useCallback((entityId: string, kelvin: number) => {
    onCallService('light', 'turn_on', { color_temp_kelvin: kelvin }, { entity_id: entityId });
  }, [onCallService]);

  const handleAllOff = useCallback(() => {
    onCallService('light', 'turn_off', undefined, {
      entity_id: lightsOn.map((l) => l.entity_id),
    });
  }, [onCallService, lightsOn]);

  const handleAllOn = useCallback(() => {
    onCallService('light', 'turn_on', { brightness_pct: 100 }, {
      entity_id: lightsOff.map((l) => l.entity_id),
    });
  }, [onCallService, lightsOff]);

  const selected = selectedLight ? entities[selectedLight] : null;
  const selectedAttrs = selected?.attributes as any;

  return (
    <div style={{
      background: theme.colors.bgCard, borderRadius: theme.radii.lg,
      padding: '1.5rem', border: `1px solid ${theme.colors.borderDefault}`,
      boxShadow: theme.shadows.card,
    }}>
      {/* Header with bulk actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: theme.colors.neonGreen }}>
          Lighting Control
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <SmallButton label="All On" onClick={handleAllOn} color={theme.colors.neonGreen} disabled={lightsOff.length === 0} />
          <SmallButton label="All Off" onClick={handleAllOff} color={theme.colors.statusOffline} disabled={lightsOn.length === 0} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: '0.8rem', color: theme.colors.textSecondary, marginBottom: '1rem' }}>
        {lightsOn.length} of {allLights.length} lights on
      </div>

      {/* Light grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '0.5rem', marginBottom: selectedLight ? '1rem' : 0,
      }}>
        {allLights.map((light) => {
          const isOn = light.state === 'on';
          const brightPct = isOn && (light.attributes as any)?.brightness
            ? Math.round(((light.attributes as any).brightness / 255) * 100)
            : null;
          const isSelected = selectedLight === light.entity_id;

          return (
            <button
              key={light.entity_id}
              onClick={() => setSelectedLight(isSelected ? null : light.entity_id)}
              onDoubleClick={() => handleToggle(light.entity_id, light.state)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0.25rem', padding: '0.75rem 0.5rem',
                borderRadius: theme.radii.md,
                border: `1px solid ${isSelected ? theme.colors.neonCyan : isOn ? theme.colors.neonGreen + '40' : 'transparent'}`,
                background: isOn ? `${theme.colors.neonGreen}10` : `${theme.colors.textMuted}08`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                fontFamily: theme.fonts.body,
              }}
              title="Click to select, double-click to toggle"
            >
              <span style={{
                fontSize: '1.5rem',
                filter: isOn ? 'none' : 'grayscale(1) opacity(0.4)',
              }}>
                💡
              </span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 500,
                color: isOn ? theme.colors.neonGreen : theme.colors.textMuted,
                textAlign: 'center', lineHeight: '1.2',
                overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100%', whiteSpace: 'nowrap',
              }}>
                {(light.attributes as any)?.friendly_name?.replace(/\s*light\s*/i, '') || light.entity_id.split('.')[1]}
              </span>
              {brightPct != null && (
                <span style={{ fontSize: '0.6rem', color: theme.colors.textMuted }}>
                  {brightPct}%
                </span>
              )}
            </button>
          );
        })}
        {allLights.length === 0 && (
          <div style={{ gridColumn: '1 / -1', color: theme.colors.textMuted, fontSize: '0.85rem', padding: '1rem 0' }}>
            No lights found — pair devices in HA first
          </div>
        )}
      </div>

      {/* Detail panel for selected light */}
      {selected && selected.state === 'on' && (
        <div style={{
          background: theme.colors.bgSecondary, borderRadius: theme.radii.md,
          padding: '1rem', border: `1px solid ${theme.colors.neonCyan}30`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.colors.textPrimary }}>
              {selectedAttrs?.friendly_name || selected.entity_id}
            </span>
            <SmallButton
              label="Off"
              onClick={() => handleToggle(selected.entity_id, 'on')}
              color={theme.colors.statusOffline}
            />
          </div>

          {/* Brightness slider */}
          {selectedAttrs?.brightness != null && (
            <SliderControl
              label="Brightness"
              value={Math.round((selectedAttrs.brightness / 255) * 100)}
              min={1}
              max={100}
              unit="%"
              color={theme.colors.neonGreen}
              onChange={(v) => handleBrightness(selected.entity_id, Math.round((v / 100) * 255))}
            />
          )}

          {/* Color temperature slider */}
          {selectedAttrs?.color_temp_kelvin != null && (
            <SliderControl
              label="Color Temp"
              value={selectedAttrs.color_temp_kelvin}
              min={selectedAttrs.min_color_temp_kelvin ?? 2000}
              max={selectedAttrs.max_color_temp_kelvin ?? 6500}
              unit="K"
              color={theme.colors.neonOrange}
              onChange={(v) => handleColorTemp(selected.entity_id, v)}
            />
          )}

          {/* Color presets */}
          {(selectedAttrs?.supported_features ?? 0) > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Presets
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Warm', kelvin: 2200, icon: '🕯️' },
                  { label: 'Relax', kelvin: 2700, icon: '🌅' },
                  { label: 'Neutral', kelvin: 4000, icon: '☁️' },
                  { label: 'Focus', kelvin: 5000, icon: '💡' },
                  { label: 'Daylight', kelvin: 6500, icon: '☀️' },
                ].map((preset) => (
                  <button
                    key={preset.kelvin}
                    onClick={() => handleColorTemp(selected.entity_id, preset.kelvin)}
                    style={{
                      padding: '0.4rem 0.6rem', borderRadius: theme.radii.sm,
                      border: `1px solid ${theme.colors.borderDefault}`,
                      background: selectedAttrs?.color_temp_kelvin != null
                        && Math.abs(selectedAttrs.color_temp_kelvin - preset.kelvin) < 200
                        ? `${theme.colors.neonOrange}20`
                        : 'transparent',
                      color: theme.colors.textSecondary,
                      cursor: 'pointer', fontSize: '0.7rem', fontFamily: theme.fonts.body,
                    }}
                  >
                    {preset.icon} {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected but off */}
      {selected && selected.state !== 'on' && (
        <div style={{
          background: theme.colors.bgSecondary, borderRadius: theme.radii.md,
          padding: '1rem', border: `1px solid ${theme.colors.borderDefault}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>
            {selectedAttrs?.friendly_name || selected.entity_id} is off
          </span>
          <SmallButton
            label="Turn On"
            onClick={() => handleToggle(selected.entity_id, 'off')}
            color={theme.colors.neonGreen}
          />
        </div>
      )}
    </div>
  );
}

function SliderControl({ label, value, min, max, unit, color, onChange }: {
  label: string; value: number; min: number; max: number;
  unit: string; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <label style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
          {label}
        </label>
        <span style={{ fontSize: '0.75rem', fontFamily: theme.fonts.mono, color }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
    </div>
  );
}

function SmallButton({ label, onClick, color, disabled }: {
  label: string; onClick: () => void; color: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.3rem 0.6rem', borderRadius: theme.radii.sm,
        border: `1px solid ${disabled ? theme.colors.textMuted + '30' : color + '60'}`,
        background: 'transparent',
        color: disabled ? theme.colors.textMuted : color,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.7rem', fontFamily: theme.fonts.body,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
