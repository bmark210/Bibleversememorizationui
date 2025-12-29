import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateUserPayload = {
  name?: string;
  username?: string;
  avatar?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      verses: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as UpdateUserPayload;
  const { name, username, avatar } = body;

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name ? { name } : {}),
      ...(username ? { username } : {}),
      ...(avatar ? { avatar } : {}),
    },
  });

  return NextResponse.json(user);
}

