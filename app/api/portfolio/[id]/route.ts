import { NextRequest, NextResponse } from "next/server";
import { updatePortfolioDeal, deletePortfolioDeal } from "../../../lib/db/portfolio-repo";
import type { PortfolioDeal } from "../../../lib/db/portfolio-repo";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as PortfolioDeal;
    const updated = await updatePortfolioDeal(id, { ...body, id });
    return NextResponse.json({ deal: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update deal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePortfolioDeal(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete deal" },
      { status: 500 }
    );
  }
}
