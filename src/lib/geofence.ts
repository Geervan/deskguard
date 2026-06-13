import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "geofence-config.json");

export interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number; // in meters
}

const DEFAULT_CONFIG: GeofenceConfig = {
  lat: 37.7749,
  lng: -122.4194,
  radius: 100, // default 100m
};

export function getGeofenceConfig(): GeofenceConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read geofence config, using defaults:", e);
  }
  return DEFAULT_CONFIG;
}

export function saveGeofenceConfig(config: GeofenceConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save geofence config:", e);
    throw new Error("Failed to save geofence config on server");
  }
}
