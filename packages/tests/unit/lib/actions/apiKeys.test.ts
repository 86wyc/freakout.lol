import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockListForUser = vi.fn();
const mockDecryptApiKey = vi.fn();
const mockEncryptApiKey = vi.fn();
vi.mock("@/lib/models/UserApiKeyModel", () => ({
  UserApiKeyModel: {
    listForUser: mockListForUser,
    findForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    decryptApiKey: mockDecryptApiKey,
    encryptApiKey: mockEncryptApiKey,
  },
}));

const mockUserApiKeyUpsert = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    userApiKey: {
      upsert: mockUserApiKeyUpsert,
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: {
    OPENAI: "OPENAI",
    ANTHROPIC: "ANTHROPIC",
    GOOGLE: "GOOGLE",
    DEEPSEEK: "DEEPSEEK",
    LOCAL: "LOCAL",
  },
}));

vi.mock("@/lib/diligence/model-provider", () => ({
  ModelProviderRegistry: class {},
}));

vi.mock("@/lib/diligence/model-router", () => ({
  MODEL_PROVIDER_ORDER: ["OPENAI", "ANTHROPIC", "GOOGLE", "DEEPSEEK", "LOCAL"],
  defaultModelForProvider: (provider: string) => {
    const defaults: Record<string, string> = {
      OPENAI: "gpt-4o-mini",
      ANTHROPIC: "claude-3-5-sonnet-latest",
      GOOGLE: "gemini-2.5-flash",
      DEEPSEEK: "deepseek-v4-flash",
      LOCAL: "llama3.1",
    };
    return defaults[provider] ?? "unknown";
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { getApiKeyStatuses, upsertApiKey } = await import(
  "@/lib/actions/apiKeys"
);

describe("getApiKeyStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default statuses when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      id: null,
      provider: "OPENAI",
      isSet: false,
      hint: null,
      connectorUrl: null,
      defaultModel: "gpt-4o-mini",
      enabled: false,
      lastValidatedAt: null,
    });
    expect(result[1].provider).toBe("ANTHROPIC");
    expect(result[2].provider).toBe("GOOGLE");
    expect(result[3].provider).toBe("DEEPSEEK");
    expect(result[4].provider).toBe("LOCAL");
  });

  it("returns default statuses when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(5);
    result.forEach((status) => {
      expect(status.isSet).toBe(false);
      expect(status.enabled).toBe(false);
    });
  });

  it("returns statuses with user keys when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockListForUser.mockResolvedValue([
      {
        id: "key-1",
        provider: "OPENAI",
        encryptedKey: "encrypted-openai",
        keyHint: "abcd",
        defaultModel: "gpt-4o",
        enabled: true,
        lastValidatedAt: new Date("2024-06-01T00:00:00Z"),
      },
    ]);

    const result = await getApiKeyStatuses();

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      id: "key-1",
      provider: "OPENAI",
      isSet: true,
      hint: "abcd",
      connectorUrl: null,
      defaultModel: "gpt-4o",
      enabled: true,
      lastValidatedAt: "2024-06-01T00:00:00.000Z",
    });
    // Providers without keys
    expect(result[1]).toEqual({
      id: null,
      provider: "ANTHROPIC",
      isSet: false,
      hint: null,
      connectorUrl: null,
      defaultModel: "claude-3-5-sonnet-latest",
      enabled: false,
      lastValidatedAt: null,
    });
    expect(result[3]).toEqual({
      id: null,
      provider: "DEEPSEEK",
      isSet: false,
      hint: null,
      connectorUrl: null,
      defaultModel: "deepseek-v4-flash",
      enabled: false,
      lastValidatedAt: null,
    });
  });

  it("uses defaultModelForProvider when key has no defaultModel", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockListForUser.mockResolvedValue([
      {
        id: "key-2",
        provider: "GOOGLE",
        encryptedKey: "encrypted-google",
        keyHint: "wxyz",
        defaultModel: null,
        enabled: true,
        lastValidatedAt: null,
      },
    ]);

    const result = await getApiKeyStatuses();

    const googleStatus = result.find((s) => s.provider === "GOOGLE");
    expect(googleStatus?.defaultModel).toBe("gemini-2.5-flash");
  });

  it("returns local LLM connector status with decrypted endpoint", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockListForUser.mockResolvedValue([
      {
        id: "key-local",
        provider: "LOCAL",
        encryptedKey: "encrypted-local",
        keyHint: "localhost:11434",
        defaultModel: "llama3.1",
        enabled: true,
        lastValidatedAt: null,
      },
    ]);
    mockDecryptApiKey.mockReturnValue(
      JSON.stringify({
        baseUrl: "http://localhost:11434/v1",
        apiKey: null,
      })
    );

    const result = await getApiKeyStatuses();

    const localStatus = result.find((s) => s.provider === "LOCAL");
    expect(localStatus).toEqual({
      id: "key-local",
      provider: "LOCAL",
      isSet: true,
      hint: "localhost:11434",
      connectorUrl: "http://localhost:11434/v1",
      defaultModel: "llama3.1",
      enabled: true,
      lastValidatedAt: null,
    });
  });
});

describe("upsertApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockEncryptApiKey.mockImplementation((value: string) => `encrypted:${value}`);
  });

  it("accepts Google keys without the legacy AIzaSy prefix", async () => {
    const result = await upsertApiKey("GOOGLE", "google-key-with-new-format");

    expect(result).toEqual({});
    expect(mockEncryptApiKey).toHaveBeenCalledWith("google-key-with-new-format");
    expect(mockUserApiKeyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: "GOOGLE",
          encryptedKey: "encrypted:google-key-with-new-format",
        }),
      })
    );
  });

  it("extracts a DeepSeek key from JSON before storing it", async () => {
    const result = await upsertApiKey(
      "DEEPSEEK",
      JSON.stringify({ api_key: "deepseek-test-key-00000002" })
    );

    expect(result).toEqual({});
    expect(mockEncryptApiKey).toHaveBeenCalledWith("deepseek-test-key-00000002");
    expect(mockUserApiKeyUpsert).toHaveBeenCalledWith({
      where: { userId_provider: { userId: "user-1", provider: "DEEPSEEK" } },
      create: {
        userId: "user-1",
        provider: "DEEPSEEK",
        encryptedKey: "encrypted:deepseek-test-key-00000002",
        keyHint: "0002",
        defaultModel: "deepseek-v4-flash",
        enabled: true,
        lastValidatedAt: null,
        validationError: null,
      },
      update: {
        encryptedKey: "encrypted:deepseek-test-key-00000002",
        keyHint: "0002",
        defaultModel: "deepseek-v4-flash",
        enabled: true,
        lastValidatedAt: undefined,
        validationError: null,
      },
    });
  });

  it("rejects wrapped DeepSeek input when no key field can be extracted", async () => {
    const result = await upsertApiKey(
      "DEEPSEEK",
      JSON.stringify({ value: "deepseek-test-key-00000002" })
    );

    expect(result).toEqual({
      error: "Paste the raw DeepSeek API key, not a JSON object or quoted value.",
    });
    expect(mockUserApiKeyUpsert).not.toHaveBeenCalled();
  });
});
