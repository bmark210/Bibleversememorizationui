import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateTagPayload = {
  slug?: string;
  title?: string;
};

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

