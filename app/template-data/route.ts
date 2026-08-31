import { NextRequest, NextResponse } from "next/server";
import serviceDashboard from "@/data/service-dashboard.json";
import mobileBooking from "@/data/mobile-booking.json";
import adminPage from "@/data/admin-page.json";

const templates = {
  "service-dashboard": serviceDashboard,
  "mobile-booking": mobileBooking,
  "admin-page": adminPage,
} as const;

export function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("template");
  if (!name || !(name in templates)) {
    return NextResponse.json(
      { error: "존재하지 않는 템플릿입니다." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    template: templates[name as keyof typeof templates],
  });
}
