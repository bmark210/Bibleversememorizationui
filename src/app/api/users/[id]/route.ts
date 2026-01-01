import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить пользователя по telegramId (params.id).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Обработка случая, когда params может быть промисом (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const telegramId = resolvedParams.id;

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        verses: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
