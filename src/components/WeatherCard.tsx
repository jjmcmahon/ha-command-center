import type { HassEntity } from 'home-assistant-js-websocket';
import { theme } from '../styles/theme';

const WEATHER_ICONS: Record<string, string> = {
  'sunny': '☀️',
  'clear-night': '🌙',
  'partlycloudy': '⛅',
  'cloudy': '☁️',
  'rainy': '🌧️',
  'lightning-rainy': '⛈️',
  'snowy': '❄️',
  'windy': '💨',
  'fog': '🌫️',
  'hail': '🌨️',
};

const WEATHER_COLORS: Record<string, string> = {
  'sunny': theme.colors.neonOrange,
  'clear-night': theme.colors.neonPurple,
  'partlycloudy': theme.colors.neonCyan,
  'cloudy': theme.colors.textMuted,
  'rainy': theme.colors.neonCyan,
  'lightning-rainy': theme.colors.neonPurple,
  'snowy': '#ffffff',
  'windy': theme.colors.textSecondary,
};

interface WeatherCardProps {
  entity: HassEntity | null;
}

export default function WeatherCard({ entity }: WeatherCardProps) {
  if (!entity) {
    return (
      <div style={{
        background: theme.colors.bgCard,
        borderRadius: theme.radii.lg,
        padding: '1.5rem',
        border: `1px solid ${theme.colors.borderDefault}`,
        color: theme.colors.textMuted,
      }}>
        Weather not available
      </div>
    );
  }

  const condition = entity.state;
  const attrs = entity.attributes as any;
  const temp = attrs.temperature;
  const humidity = attrs.humidity;
  const windSpeed = attrs.wind_speed;
  const icon = WEATHER_ICONS[condition] || '🌡️';
  const accentColor = WEATHER_COLORS[condition] || theme.colors.neonCyan;

  return (
    <div style={{
      background: theme.colors.bgCard,
      borderRadius: theme.radii.lg,
      padding: '1.5rem',
      border: `1px solid ${theme.colors.borderDefault}`,
      boxShadow: theme.shadows.card,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '2.5rem' }}>{icon}</span>
        <div>
          <div style={{
            fontSize: '2rem', fontWeight: 700, fontFamily: theme.fonts.mono, color: accentColor,
          }}>
            {temp}°F
          </div>
          <div style={{
            fontSize: '0.85rem', color: theme.colors.textSecondary, textTransform: 'capitalize',
          }}>
            {condition.replace(/-/g, ' ')}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {humidity != null && (
          <div>
            <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>Humidity</div>
            <div style={{ fontSize: '1rem', fontFamily: theme.fonts.mono, color: theme.colors.neonCyan }}>{humidity}%</div>
          </div>
        )}
        {windSpeed != null && (
          <div>
            <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, textTransform: 'uppercase' }}>Wind</div>
            <div style={{ fontSize: '1rem', fontFamily: theme.fonts.mono, color: theme.colors.textSecondary }}>{windSpeed} mph</div>
          </div>
        )}
      </div>
    </div>
  );
}
