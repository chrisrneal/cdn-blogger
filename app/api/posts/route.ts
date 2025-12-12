import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { title, date, content } = await request.json();

    if (!title || !date || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const fileName = `${slug}.md`;
    const filePath = path.join(process.cwd(), 'posts', fileName);

    const fileContent = `---
title: "${title}"
date: "${date}"
---

${content}`;

    fs.writeFileSync(filePath, fileContent);

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    );
  }
}
