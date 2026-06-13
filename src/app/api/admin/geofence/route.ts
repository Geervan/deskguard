import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { getGeofenceConfig, saveGeofenceConfig } from "@/lib/geofence";

// GET /api/admin/geofence - Retrieve current geofence settings
export async function GET() {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    const config = getGeofenceConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load geofence configuration" },
      { status: 500 }
    );
  }
}

// POST /api/admin/geofence - Update geofence coordinates (Librarians only)
export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!session || session.role !== "LIBRARIAN") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lat, lng, radius } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid parameters. 'lat' and 'lng' must be numbers." },
        { status: 400 }
      );
    }

    const currentConfig = getGeofenceConfig();
    const newConfig = {
      lat,
      lng,
      radius: typeof radius === "number" ? radius : currentConfig.radius,
    };

    saveGeofenceConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: "Geofence center updated successfully.",
      config: newConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update geofence configuration" },
      { status: 500 }
    );
  }
}
