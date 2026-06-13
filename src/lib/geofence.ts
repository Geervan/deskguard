import { prisma } from "./db";

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

export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "geofence" },
    });
    if (setting) {
      return JSON.parse(setting.value);
    }
  } catch (e) {
    console.error("Failed to read geofence config from database, using defaults:", e);
  }
  return DEFAULT_CONFIG;
}

export async function saveGeofenceConfig(config: GeofenceConfig): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: "geofence" },
      update: { value: JSON.stringify(config) },
      create: { key: "geofence", value: JSON.stringify(config) },
    });
  } catch (e) {
    console.error("Failed to save geofence config to database:", e);
    throw new Error("Failed to save geofence config on database");
  }
}
