import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const {
    userId,
    title = "Untitled Notebook",
    subtitle = "",
    content = "",
  } = await request.json();
  console.log("Received data:", { userId, title, subtitle, content });
  // Logic to create a new notebook with the provided data.

  try {
    const newNotebook = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      subtitle,
      content,
      createdAt: new Date().toISOString(),
    };

    //saving this notebook to db
    const dbResponse = db.insert(notebooksTable).values({
      userId,
      title,
      subtitle,
      content,
    });

    return NextResponse.json(newNotebook, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating notebook:", error);
    return NextResponse.json(
      { error: "Failed to create notebook" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
