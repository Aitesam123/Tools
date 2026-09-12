import { NextResponse } from "next/server";
import sharp from "sharp";
import { validateUploadedImage, ImageValidationError } from "@/lib/image/validate";
import { analyzeImage } from "@/lib/image/analyze";
import { recommendFormats } from "@/lib/image/formats";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/image/rateLimit";
import { LIMITS } from "@/lib/image/limits";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rate = checkRateLimit(clientKeyFromRequest(req));
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = await validateUploadedImage(buffer);
    const pipeline = sharp(buffer, { limitInputPixels: LIMITS.maxInputPixels });
    const analysis = await analyzeImage(pipeline, validated.metadata);
    const recommendation = recommendFormats({
      hasAlpha: analysis.hasAlpha,
      isPhotographic: analysis.isPhotographic,
      isAnimated: analysis.isAnimated,
    });

    return NextResponse.json({
      width: validated.metadata.width,
      height: validated.metadata.height,
      format: validated.metadata.format,
      bytes: buffer.length,
      hasAlpha: analysis.hasAlpha,
      isAnimated: analysis.isAnimated,
      recommendation,
    });
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("analyze route failure:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "We couldn't read this image." }, { status: 500 });
  }
}
