import OpenAI from "openai";
import { v4 as uuid } from "uuid";

export type QueryableDb = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

const openai = new OpenAI({
  apiKey: (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.OPENAI_API_KEY
});

export async function embedAndStore(db: QueryableDb, content: string, sourceType: string, sourceId?: string) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content
  });

  const firstEmbedding = embedding.data[0]?.embedding;
  if (!firstEmbedding) {
    throw new Error("Embedding generation returned no vector");
  }

  await db.query(
    `INSERT INTO ai_knowledge (id, source_type, source_id, content, embedding)
     VALUES ($1,$2,$3,$4,$5)`,
    [uuid(), sourceType, sourceId ?? null, content, firstEmbedding]
  );
}

export async function retrieveContext(db: QueryableDb, question: string) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  const firstEmbedding = embedding.data[0]?.embedding;
  if (!firstEmbedding) {
    return [];
  }

  const result = await db.query(
    `
    SELECT content
    FROM ai_knowledge
    ORDER BY embedding <-> $1
    LIMIT 6
    `,
    [firstEmbedding]
  );

  return result.rows.map((row: { content: string }) => row.content).join("\n\n");
}
