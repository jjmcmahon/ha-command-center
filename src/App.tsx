import { useState, useCallback } from 'react';
import { useHomeAssistant, useDomain } from './hooks/useHA';
import RoomCard from './components/RoomCard';
import ModePanel from './components/ModePanel';
import WeatherCard from './components/WeatherCard';
import LightingPanel from './components/LightingPanel';
import ClimatePanel from './components/ClimatePanel';
import { theme } from './styles/theme';

// Pull from .env — create a .env file from .env.example
const DEFAULT_HA_URL = import.meta.env.VITE_HA_URL || '';
const DEFAULT_HA_TOKEN = import.meta.env.VITE_HA_TOKEN || '';

// Room definitions — update area IDs once devices are assigned to areas in HA
const ROOMS = [
  { name: 'Living Room', areaId: 'living_room' },
  { name: 'Bedroom', areaId: 'bedroom' },
  { name: 'Office', areaId: 'office' },
  { name: 'Kitchen', areaId: 'kitchen' },
  { name: 'Media Room', areaId: 'media_room' },
  { name: 'Bathroom', areaId: 'bathroom' },
];

type Tab = 'overview' | 'lighting' | 'climate';

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: 'overview', label: 'Overview', color: theme.colors.neonCyan },
  { id: 'lighting', label: 'Lighting', color: theme.colors.neonGreen },
  { id: 'climate', label: 'Climate & Energy', color: theme.colors.neonOrange },
];

function App() {
  const [haUrl, setHaUrl] = useState(DEFAULT_HA_URL);
  const [haToken, setHaToken] = useState(DEFAULT_HA_TOKEN);
  const [configOpen, setConfigOpen] = useState(!DEFAULT_HA_URL || !DEFAULT_HA_TOKEN);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { entities, status, callHA } = useHomeAssistant(haUrl, haToken);
  const lights = useDomain(entities, 'light');
  const climate = useDomain(entities, 'climate');
  const weather = useDomain(entities, 'weather');
  const persons = useDomain(entities, 'person');
  const weatherEntity = weather[0] ?? null;

  const handleToggle = useCallback(
    (entityId: string, currentState: string) => {
      const domain = entityId.split('.')[0];
      const service = currentState === 'on' ? 'turn_off' : 'turn_on';
      const callDomain = domain === 'input_boolean' ? 'input_boolean' : domain;
      callHA(callDomain, service, undefined, { entity_id: entityId });
    },
    [callHA]
  );

  const handleSetBrightness = useCallback(
    (entityId: string, brightness: number) => {
      callHA('light', 'turn_on', { brightness }, { entity_id: entityId });
    },
    [callHA]
  );

  const needsConfig = !haUrl || !haToken;

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.body,
      padding: '2rem',
    }}>
      {/* Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 700,
            fontFamily: theme.fonts.heading,
            background: `linear-gradient(135deg, ${theme.colors.neonGreen}, ${theme.colors.neonCyan})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>McMahon Command Center</h1>
          <p style={{ color: theme.colors.textSecondary, margin: '0.25rem 0 0' }}>
            Home Assistant Dashboard
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            marginTop: '0.5rem', fontSize: '0.85rem',
            color: status === 'connected' ? theme.colors.statusOnline
              : status === 'error' ? theme.colors.statusOffline
              : status === 'connecting' ? theme.colors.statusWarning
              : theme.colors.textMuted,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: status === 'connected' ? theme.colors.statusOnline
                : status === 'error' ? theme.colors.statusOffline
                : status === 'connecting' ? theme.colors.statusWarning
                : theme.colors.statusIdle,
              boxShadow: status === 'connected' ? theme.shadows.neonGreen : 'none',
            }} />
            {status}
            {status === 'connected' && (
              <span style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>
                ({Object.keys(entities).length} entities)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setConfigOpen(!configOpen)}
          style={{
            background: 'none', border: `1px solid ${theme.colors.borderDefault}`,
            color: theme.colors.textSecondary, cursor: 'pointer',
            padding: '0.5rem 1rem', borderRadius: theme.radii.sm,
            fontFamily: theme.fonts.body, fontSize: '0.8rem',
          }}
        >
          {configOpen ? 'Close Config' : 'Settings'}
        </button>
      </header>

      {/* Connection config panel */}
      {configOpen && (
        <div style={{
          background: theme.colors.bgCard, borderRadius: theme.radii.lg,
          padding: '1.5rem', marginBottom: '1.5rem',
          border: `1px solid ${theme.colors.borderDefault}`,
        }}>
          <h2 style={{ fontSize: '1rem', margin: '0 0 1rem', color: theme.colors.neonCyan }}>
            HA Connection
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textMuted, marginBottom: '0.25rem' }}>
                HA URL
              </label>
              <input
                type="text"
                value={haUrl}
                onChange={(e) => setHaUrl(e.target.value)}
                placeholder="http://192.168.120.3:8123"
                style={{
                  width: '100%', padding: '0.5rem 0.75rem',
                  background: theme.colors.bgSecondary, border: `1px solid ${theme.colors.borderDefault}`,
                  borderRadius: theme.radii.sm, color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono, fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textMuted, marginBottom: '0.25rem' }}>
                Long-Lived Access Token
              </label>
              <input
                type="password"
                value={haToken}
                onChange={(e) => setHaToken(e.target.value)}
                placeholder="Generate at HA Profile → Security → Long-lived access tokens"
                style={{
                  width: '100%', padding: '0.5rem 0.75rem',
                  background: theme.colors.bgSecondary, border: `1px solid ${theme.colors.borderDefault}`,
                  borderRadius: theme.radii.sm, color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono, fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {needsConfig && (
              <p style={{ fontSize: '0.8rem', color: theme.colors.statusWarning, margin: 0 }}>
                Set VITE_HA_URL and VITE_HA_TOKEN in your .env file, or enter them above.
                Generate a token at your HA instance → Profile → Security → Long-lived access tokens.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && (
        <div style={{
          background: `${theme.colors.statusOffline}10`,
          border: `1px solid ${theme.colors.statusOffline}40`,
          borderRadius: theme.radii.md, padding: '1rem 1.5rem',
          marginBottom: '1.5rem', fontSize: '0.9rem', color: theme.colors.statusOffline,
        }}>
          Connection failed — check your HA URL and token. Make sure HA is running at {haUrl || '(no URL set)'}.
        </div>
      )}

      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        borderBottom: `1px solid ${theme.colors.borderDefault}`,
        paddingBottom: '0',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? tab.color : 'transparent'}`,
              background: 'transparent',
              color: activeTab === tab.id ? tab.color : theme.colors.textMuted,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: theme.fonts.body,
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s ease',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Quick Stats */}
          <div style={{
            background: theme.colors.bgCard, borderRadius: theme.radii.lg,
            padding: '1.5rem', border: `1px solid ${theme.colors.borderDefault}`,
            boxShadow: theme.shadows.card,
          }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: theme.colors.neonCyan }}>
              Quick Stats
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Stat label="Lights" value={`${lights.filter(l => l.state === 'on').length}/${lights.length}`} />
              <Stat label="Climate" value={climate[0]?.attributes?.current_temperature ? `${climate[0].attributes.current_temperature}°` : '—'} />
              <Stat label="Weather" value={weatherEntity?.state ?? '—'} />
              <Stat label="People Home" value={`${persons.filter(p => p.state === 'home').length}`} />
            </div>
          </div>

          <WeatherCard entity={weatherEntity} />
          <ModePanel entities={entities} onToggle={handleToggle} />

          {ROOMS.map((room) => (
            <RoomCard
              key={room.areaId}
              name={room.name}
              areaId={room.areaId}
              entities={entities}
              onToggleLight={handleToggle}
              onSetBrightness={handleSetBrightness}
            />
          ))}
        </div>
      )}

      {activeTab === 'lighting' && (
        <LightingPanel entities={entities} onCallService={callHA} />
      )}

      {activeTab === 'climate' && (
        <ClimatePanel entities={entities} onCallService={callHA} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: theme.fonts.mono }}>
        {value}
      </div>
    </div>
  );
}

export default App;
