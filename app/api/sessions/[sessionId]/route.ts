import { dbConnect } from "@/lib/mongodb";
import Session from "@/models/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    await dbConnect();

    const session = await Session.findById(params.sessionId).lean();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error loading session:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
