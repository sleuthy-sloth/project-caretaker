import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// --- Module under test ---

// Re-import the functions we need by re-loading the module
// Since api/generate.ts exports config (edge runtime), we test the
// logic functions via dynamic import with environment mocking

async function loadModule() {
  return await import("./generate");
}

describe("isRetryable", () => {
  let isRetryable: (status: number) => boolean;

  beforeEach(async () => {
    const mod = await loadModule();
    // @ts-ignore - accessing module-private export for testing
    isRetryable = mod.isRetryable;
  });

  it("returns true for 429 (rate limited)", () => {
    expect(isRetryable(429)).toBe(true);
  });

  it("returns true for 502 (bad gateway)", () => {
    expect(isRetryable(502)).toBe(true);
  });

  it("returns true for 503 (service unavailable)", () => {
    expect(isRetryable(503)).toBe(true);
  });

  it("returns true for 504 (gateway timeout)", () => {
    expect(isRetryable(504)).toBe(true);
  });

  it("returns false for 400 (bad request)", () => {
    expect(isRetryable(400)).toBe(false);
  });

  it("returns false for 401 (unauthorized)", () => {
    expect(isRetryable(401)).toBe(false);
  });

  it("returns false for 403 (forbidden)", () => {
    expect(isRetryable(403)).toBe(false);
  });

  it("returns false for 500 (internal server error)", () => {
    expect(isRetryable(500)).toBe(false);
  });

  it("returns false for 200 (success)", () => {
    expect(isRetryable(200)).toBe(false);
  });
});

describe("delay", () => {
  it("resolves after the specified number of milliseconds", async () => {
    const start = Date.now();
    // @ts-ignore
    const mod = await loadModule();
    // @ts-ignore
    await mod.delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});

describe("callOpenAICompatible (no internal retry — rotation handles retries)", () => {
  const TEST_URL = "https://api.example.com/v1/chat/completions";
  const TEST_KEY = "test-api-key";
  const TEST_MODEL = "test-model";
  const TEST_MESSAGES = [{ role: "user", content: "hello" }];

  let callOpenAICompatible: any;

  beforeEach(async () => {
    const mod = await loadModule();
    // @ts-ignore
    callOpenAICompatible = mod.callOpenAICompatible;
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  it("does NOT retry on 504 — rotation handles retries", async () => {
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      return Promise.resolve(
        new Response(JSON.stringify({ error: "upstream timeout" }), {
          status: 504,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const result = await callOpenAICompatible(
      TEST_URL,
      TEST_KEY,
      TEST_MODEL,
      TEST_MESSAGES
    );

    expect(callCount).toBe(1); // no internal retry
    expect(result.ok).toBe(false);
    expect(result.status).toBe(504);
  });

  it("does NOT retry on 400 (non-retryable 4xx)", async () => {
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { message: "bad request" } }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    const result = await callOpenAICompatible(
      TEST_URL,
      TEST_KEY,
      TEST_MODEL,
      TEST_MESSAGES
    );

    expect(callCount).toBe(1); // no retry
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("does NOT retry on 401 (unauthorized)", async () => {
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      return Promise.resolve(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const result = await callOpenAICompatible(
      TEST_URL,
      TEST_KEY,
      TEST_MODEL,
      TEST_MESSAGES
    );

    expect(callCount).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("does NOT retry on network error (fetch throws)", async () => {
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      throw new Error("fetch failed");
    });

    const result = await callOpenAICompatible(
      TEST_URL,
      TEST_KEY,
      TEST_MODEL,
      TEST_MESSAGES
    );

    expect(callCount).toBe(1); // no retry on network error
    expect(result.ok).toBe(false);
  });
});

describe("handler fallback narrative responses", () => {
  let handler: any;

  beforeEach(async () => {
    const mod = await loadModule();
    handler = mod.default;
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  const mockRequest = (body: any): Request => {
    return new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("returns 400 for missing prompt", async () => {
    const req = mockRequest({});
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("returns fallback narrative when all providers fail", async () => {
    // Mock environment with Groq key but all requests fail
    const origEnv = process.env;
    process.env = { ...origEnv, GROQ_API_KEY: "test-key" };

    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Gateway Timeout" }), {
          status: 504,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const req = mockRequest({
      prompt: "hello",
      history: [],
    });
    const res = await handler(req);
    process.env = origEnv;
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("content");
    expect(data).toHaveProperty("fallback", true);
    expect(data).toHaveProperty("retryAfter", 5);
    // Content should be valid JSON (a fallback narrative)
    expect(() => JSON.parse(data.content)).not.toThrow();
  });

  it("returns fallback narrative when no API keys configured", async () => {
    const req = mockRequest({
      prompt: "hello",
      history: [],
    });
    // No API key set — handler returns fallback immediately
    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("content");
    expect(data).toHaveProperty("fallback", true);
    expect(data).toHaveProperty("retryAfter", 5);
  });
});
