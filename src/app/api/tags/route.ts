import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateTagPayload = {
  slug?: string;
  title?: string;
};

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateTagPayload;
  const { slug, title } = body;

  if (!slug || !title) {
    return NextResponse.json(
      { error: "slug and title are required" },
      { status: 400 }
    );
  }

  const tag = await prisma.tag.create({
    data: { slug, title },
  });

  return NextResponse.json(tag, { status: 201 });
}

