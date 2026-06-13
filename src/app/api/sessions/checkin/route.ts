import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getGeofenceConfig } from "@/lib/geofence";

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to check in" },
        { status: 401 }
      );
    }

    const { seatId, userLat, userLng, mockMode } = await request.json();

    if (!seatId) {
      return NextResponse.json(
        { success: false, error: "Seat ID is required" },
        { status: 400 }
      );
    }

    // Geofencing verification
    if (mockMode === "OUTSIDE") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Geofence Verification Failed: You are outside the allowed library boundary." 
        },
        { status: 400 }
      );
    }

    if (mockMode !== "INSIDE") {
      if (userLat === undefined || userLng === undefined) {
        return NextResponse.json(
          { success: false, error: "Location coordinates are required to verify presence inside the library geofence." },
          { status: 400 }
        );
      }

      const config = await getGeofenceConfig();
      const distance = getDistanceMeters(userLat, userLng, config.lat, config.lng);
      if (distance > config.radius) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Geofence Verification Failed: You are ${Math.round(distance)}m away from the library. Maximum allowed boundary is ${config.radius}m.` 
          },
          { status: 400 }
        );
      }
    }

    // 1. Check if the user already occupies another seat
    const activeUserSession = await prisma.seatSession.findFirst({
      where: {
        userId: user.id,
        endedAt: null
      }
    });

    if (activeUserSession) {
      return NextResponse.json(
        { 
          success: false, 
          error: `You already occupy Seat ${activeUserSession.seatId}. Please leave that seat before checking into a new one.` 
        },
        { status: 400 }
      );
    }

    // 2. Fetch the target seat
    const seat = await prisma.seat.findUnique({
      where: { id: seatId }
    });

    if (!seat) {
      return NextResponse.json(
        { success: false, error: "The requested seat does not exist" },
        { status: 404 }
      );
    }

    if (seat.status !== "AVAILABLE") {
      return NextResponse.json(
        { success: false, error: "This seat is already occupied or marked as away" },
        { status: 400 }
      );
    }

    const now = new Date();
    // Schedule first presence check in 2 hours
    const nextPresenceCheckAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 3. Execute transaction to occupy seat and start session
    await prisma.$transaction([
      prisma.seatSession.create({
        data: {
          userId: user.id,
          seatId: seatId,
          startedAt: now,
          nextPresenceCheckAt: nextPresenceCheckAt
        }
      }),
      prisma.seat.update({
        where: { id: seatId },
        data: { status: "OCCUPIED" }
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          seatId: seatId,
          action: "CHECK_IN",
          timestamp: now
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully checked into Seat ${seatId}.`,
      seatId
    });
  } catch (error: any) {
    console.error("Check-in failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
