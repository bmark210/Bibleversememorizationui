import type { VerseAnnotationData } from "@/app/domain/verse";

type AnnotationApiPayload = {
  verseId: string;
  verseRef: string;
  textRu: string;
  context: string;
  meaning: string;
  keyPoints: string[];
};

type AnnotationApiResponse = {
  data: AnnotationApiPayload;
};

/**
 * Fetch (and lazily generate) LLM annotation for a single Bible verse.
 *
 * @param externalVerseId - ExternalVerseID in "{bookNum}-{chapter}-{verse}" format
 *                          e.g. "43-1-3" for John 1:3
 */
export async function fetchVerseAnnotation(
  externalVerseId: string,
): Promise<VerseAnnotationData> {
  const res = await fetch(`/api/bible-verses/${externalVerseId}/annotation`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Annotation fetch failed (${res.status}): ${text}`);
  }

  const json: AnnotationApiResponse = await res.json();
  const d = json.data;

  return {
    context: d.context ?? "",
    meaning: d.meaning ?? "",
    keyPoints: Array.isArray(d.keyPoints) ? d.keyPoints : [],
  };
}
