import { NextResponse } from "next/server";
import swaggerDoc from "@/swagger/doc";

export async function GET() {
  return NextResponse.json(swaggerDoc);
}

