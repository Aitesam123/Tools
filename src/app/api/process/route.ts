import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/image/pipeline";
import { validateUploadedImage, withTimeout, ImageValidationError } from "@/lib/image/validate";
import { parseProcessOptions, OptionsValidationError } from "@/lib/image/parseOptions";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/image/rateLimit";
import { LIMITS } from "@/lib/image/limits";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const clientKey = clientKeyFromRequest(req);
  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const optionsRaw = form.get("options");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No image file was uploaded." }, { status: 400 });
    }
    if (typeof optionsRaw !== "string") {
      return NextResponse.json({ error: "Missing processing options." }, { status: 400 });
    }

    const options = parseProcessOptions(JSON.parse(optionsRaw));
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validated = await validateUploadedImage(buffer);
    const filename = (form.get("filename") as string) || (file as File).name || "image";

    const output = await withTimeout(
      runPipeline(validated, filename, options),
      LIMITS.processingTimeoutMs,
      "Processing took too long and was cancelled. Try a smaller image or simpler settings."
    );

    return NextResponse.json({
      result: output.result,
      filename: output.filename,
      mime: output.mime,
      fileBase64: output.buffer.toString("base64"),
    });
  } catch (err) {
    if (err instanceof ImageValidationError || err instanceof OptionsValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("process route failure:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't process this image. Please try another image or output setting." },
      { status: 500 }
    );
  }
}
