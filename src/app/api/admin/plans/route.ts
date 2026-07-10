import { NextRequest, NextResponse } from "next/server";

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  return auth === process.env.INTERNAL_API_KEY || auth === process.env.NEXT_PUBLIC_INTERNAL_KEY;
}

// GET /api/admin/plans - List all plans
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { loadPlans } = await import("@/lib/server-store");
    const plans = loadPlans();
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/plans - Create a new plan
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { createPlan } = await import("@/lib/server-store");
    const body = await request.json();
    const plan = createPlan(body);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/plans - Update a plan
export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { updatePlan } = await import("@/lib/server-store");
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const plan = updatePlan(id, updates);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/plans?id=xxx - Delete a plan
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { deletePlan } = await import("@/lib/server-store");
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const success = deletePlan(id);
    if (!success) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
