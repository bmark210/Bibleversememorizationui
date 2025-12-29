import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateUserPayload = {
  name?: string;
  username?: string;
  avatar?: string;
  email?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");
  const username = searchParams.get("username");

  if (!id && !email && !username) {
    return NextResponse.json(
      { error: "Provide id, email or username to fetch user" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: id
      ? { id }
      : email
      ? { email }
      : {
          username: username as string,
        },
    include: {
      verses: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateUserPayload;
  const { name, username, avatar, email } = body;

  if (!name || !username || !avatar || !email) {
    return NextResponse.json(
      { error: "name, username, avatar, email are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, username, avatar },
    create: { name, username, avatar, email },
  });

  return NextResponse.json(user, { status: 201 });
}

