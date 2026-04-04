import { useState } from 'react';
import { useHomeAssistant, useDomain } from './hooks/useHA';
import { theme } from './styles/theme';

// TODO: Move to env vars or config after HA is running
const HA_URL = 'http://homeassistant.local:8123';
const HA_TOKEN = ''; // Long-lived access token — generate from HA Profile page

function App() {
  const { entities, status, callHA } = useHomeAssistant(HA_URL, HA_TOKEN);
  const lights = useDomain(entities, 'light');
  const climate = useDomain(entities, 'climate');
  const weather = useDomain(entities, 'weather');
  const persons = useDomain(entities, 'person');

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.body,
      padding: '2rem',
    }}>
      <header style={{ marginBottom: '2rem' }}>
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
          color: status === 'connected' ? theme.colors.statusOnline : theme.colors.statusOffline,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: status === 'connected' ? theme.colors.statusOnline : theme.colors.statusOffline,
            boxShadow: status === 'connected' ? theme.shadows.neonGreen : 'none',
          }} />
          {status}
        </div>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
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
            <Stat label="Weather" value={weather[0]?.state ?? '—'} />
            <Stat label="People Home" value={`${persons.filter(p => p.state === 'home').length}`} />
          </div>
        </div>

        {['Living Room', 'Bedroom', 'Office', 'Kitchen'].map((room) => (
          <div key={room} style={{
            background: theme.colors.bgCard, borderRadius: theme.radii.lg,
            padding: '1.5rem', border: `1px solid ${theme.colors.borderDefault}`,
            boxShadow: theme.shadows.card, minHeight: 180,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.colors.textMuted,
          }}>
            {room} — connect devices to populate
          </div>
        ))}
      </div>
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
