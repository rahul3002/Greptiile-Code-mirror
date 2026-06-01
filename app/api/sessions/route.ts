import { dbConnect } from "@/lib/mongodb";
import Session from "@/models/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    const sessions = await Session.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20)
      .select(
        "idealRepo userRepo idealBranch userBranch status statusMessage createdAt updatedAt analyses"
      )
      .lean();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error loading sessions:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
