import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function buildPrompt(mode: string, outputFormat: string, content: string): string {
  const baseInstructions = mode === 'exam'
    ? `You are an expert academic tutor. Analyze the content and create study-ready material.`
    : `You are an expert content summarizer. Create a clear, insightful summary.`;

  if (mode === 'exam' && outputFormat === 'flashcards') {
    return `${baseInstructions}

Create 8-12 flashcards from this content. Each flashcard should test a key concept.

Return ONLY a valid JSON array (no markdown, no code blocks, just raw JSON):
[
  {
    "front": "Question or concept to test",
    "back": "Answer or explanation"
  }
]

Content to analyze:
${content}`;
  }

  if (mode === 'exam' && outputFormat === 'bullets') {
    return `${baseInstructions}

Create comprehensive exam-ready bullet points from this content. Structure them as:
1. A brief 2-3 sentence overview
2. Key concepts as bullet points (use • for main points, use - for sub-points)
3. Important terms/definitions
4. Key takeaways for exams

Format your response with clear sections using **Section Name** for headers.

Content to analyze:
${content}`;
  }

  if (mode === 'normal' && outputFormat === 'bullets') {
    return `${baseInstructions}

Summarize this content as clear, concise bullet points. Cover:
• The main topic/purpose
• Key points and arguments  
• Important details worth remembering
• Conclusion or outcome

Use • for main points and - for sub-points. Keep it scannable and clear.

Content to analyze:
${content}`;
  }

  // Normal paragraph mode
  return `${baseInstructions}

Write a clear, well-structured summary of this content in flowing paragraphs. Include:
- An opening sentence capturing the main idea
- The key points and their significance  
- Any important details or nuances
- A brief concluding thought

Aim for 150-300 words. Write naturally and engagingly.

Content to analyze:
${content}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const mode = formData.get('mode') as string || 'normal';
    const outputFormat = formData.get('outputFormat') as string || 'paragraph';
    const userApiKey = formData.get('apiKey') as string || '';
    const textContent = formData.get('text') as string || '';
    const file = formData.get('file') as File | null;

    // Determine API key
    const apiKey = userApiKey.trim() || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key provided. Please add your Gemini API key.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    let result;

    if (file) {
      const fileType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      if (fileType === 'application/pdf') {
        // For PDFs, use document part
        const prompt = buildPrompt(mode, outputFormat, 'the provided PDF document');
        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        };
        result = await model.generateContent([prompt, imagePart]);
      } else if (fileType.startsWith('image/')) {
        // For images, use vision
        const prompt = buildPrompt(mode, outputFormat, 'the provided image — extract all text and visual information from it');
        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: fileType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          },
        };
        result = await model.generateContent([prompt, imagePart]);
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image.' }, { status: 400 });
      }
    } else if (textContent.trim()) {
      const prompt = buildPrompt(mode, outputFormat, textContent);
      result = await model.generateContent(prompt);
    } else {
      return NextResponse.json({ error: 'Please provide text content or upload a file.' }, { status: 400 });
    }

    const responseText = result.response.text();

    // Parse flashcards if needed
    if (mode === 'exam' && outputFormat === 'flashcards') {
      try {
        // Strip any markdown code fences if present
        const cleaned = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const flashcards = JSON.parse(cleaned);
        return NextResponse.json({ type: 'flashcards', data: flashcards });
      } catch {
        // If parsing fails, return as text
        return NextResponse.json({ type: 'text', data: responseText });
      }
    }

    return NextResponse.json({ type: outputFormat === 'bullets' ? 'bullets' : 'text', data: responseText });

  } catch (error: unknown) {
    console.error('Summarize API error:', error);
    
    const err = error as { message?: string; status?: number };
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key')) {
      return NextResponse.json({ error: 'Invalid API key. Please check your Gemini API key.' }, { status: 401 });
    }
    if (err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'API quota exceeded. Please try again later or use your own API key.' }, { status: 429 });
    }
    
    return NextResponse.json(
      { error: err.message || 'Failed to summarize content. Please try again.' },
      { status: 500 }
    );
  }
}
