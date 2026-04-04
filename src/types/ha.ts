/**
 * Home Assistant WebSocket API types
 * These mirror the HA WS API entities for type-safe dashboard development.
 */

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HALight extends HAEntity {
  attributes: {
    brightness?: number;
    color_temp_kelvin?: number;
    rgb_color?: [number, number, number];
    friendly_name: string;
    supported_features: number;
  };
}

export interface HAClimate extends HAEntity {
  attributes: {
    temperature: number;
    current_temperature: number;
    hvac_modes: string[];
    hvac_action: string;
    friendly_name: string;
  };
}

export interface HAMediaPlayer extends HAEntity {
  attributes: {
    media_title?: string;
    media_artist?: string;
    volume_level?: number;
    friendly_name: string;
  };
}

export interface HAPerson extends HAEntity {
  attributes: {
    friendly_name: string;
    entity_picture?: string;
    source?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface HAWeather extends HAEntity {
  attributes: {
    temperature: number;
    humidity: number;
    condition: string;
    wind_speed: number;
    forecast?: Array<{
      datetime: string;
      temperature: number;
      condition: string;
    }>;
    friendly_name: string;
  };
}

export interface HAArea {
  area_id: string;
  name: string;
  picture: string | null;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
