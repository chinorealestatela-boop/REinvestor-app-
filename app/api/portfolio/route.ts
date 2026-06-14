import { NextRequest, NextResponse } from "next/server";
import { listPortfolioDeals, createPortfolioDeal } from "../../lib/db/portfolio-repo";
import type { PortfolioDeal } from "../../lib/db/portfolio-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deals = await listPortfolioDeals();
    return NextResponse.json({ deals });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load portfolio" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PortfolioDeal>;
    if (!body.propertyAddress) {
      return NextResponse.json({ error: "propertyAddress is required" }, { status: 400 });
    }
    const deal: PortfolioDeal = {
      id: body.id || `pd-${Date.now()}`,
      propertyAddress: body.propertyAddress,
      propertyCity: body.propertyCity ?? "",
      propertyState: body.propertyState ?? "NV",
      propertyZip: body.propertyZip ?? "",
      propertyType: body.propertyType ?? "single_family",
      beds: body.beds ?? 0,
      baths: body.baths ?? 0,
      sqft: body.sqft ?? 0,
      stage: body.stage ?? "offer",
      purchasePrice: body.purchasePrice ?? 0,
      rehabBudget: body.rehabBudget ?? 0,
      rehabSpent: body.rehabSpent ?? 0,
      arv: body.arv ?? 0,
      salePrice: body.salePrice ?? null,
      listingDate: body.listingDate ?? null,
      closingDate: body.closingDate ?? null,
      notes: body.notes ?? "",
      openedAt: new Date().toISOString(),
      closedAt: body.closedAt ?? null,
    };
    const created = await createPortfolioDeal(deal);
    return NextResponse.json({ deal: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create deal" },
      { status: 500 }
    );
  }
}
