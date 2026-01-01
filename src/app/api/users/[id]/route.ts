import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить пользователя по telegramId (params.id).
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findUnique({
    where: { telegramId: params.id },
    include: {
      verses: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
