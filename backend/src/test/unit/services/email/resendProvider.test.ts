import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSend, mockEnv, MockResend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const MockResend = vi.fn(function (this: unknown, _apiKey?: string) {
    (this as Record<string, unknown>).emails = { send: mockSend };
  });
  return {
    mockSend,
    mockEnv: { RESEND_API_KEY: "re_test_key_123" } as Record<string, unknown>,
    MockResend,
  };
});

// vi.mock por teste para Resend — MockResend é function constructable e espiável
vi.mock("../../../../utils/environment.js", () => ({
  Env: mockEnv,
}));

vi.mock("resend", () => ({
  Resend: MockResend,
}));

import { ResendProvider } from "../../../../services/email/resendProvider.js";

describe("ResendProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.RESEND_API_KEY = "re_test_key_123";
  });

  it("deve enviar payload mínimo com from/to/subject/html", async () => {
    mockSend.mockResolvedValue({ data: { id: "resend-id-1" }, error: null });
    const provider = new ResendProvider();
    const result = await provider.send({
      from: "Viggo <noreply@viggo.com.br>",
      to: "user@test.com",
      subject: "Teste",
      html: "<html>hello</html>",
    });
    expect(result).toEqual({ id: "resend-id-1" });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Viggo <noreply@viggo.com.br>",
        to: ["user@test.com"],
        subject: "Teste",
        html: "<html>hello</html>",
      })
    );
    // text e replyTo não devem estar no payload quando não informados
    const payload = mockSend.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.text).toBeUndefined();
    expect(payload.replyTo).toBeUndefined();
  });

  it("deve normalizar to string para array", async () => {
    mockSend.mockResolvedValue({ data: { id: "id2" }, error: null });
    const provider = new ResendProvider();
    await provider.send({
      from: "a@b.com",
      to: "single@test.com",
      subject: "s",
      html: "<p>hi</p>",
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: ["single@test.com"] }));
  });

  it("deve manter to array quando já é array", async () => {
    mockSend.mockResolvedValue({ data: { id: "id3" }, error: null });
    const provider = new ResendProvider();
    await provider.send({
      from: "a@b.com",
      to: ["a@test.com", "b@test.com"],
      subject: "s",
      html: "<p>hi</p>",
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: ["a@test.com", "b@test.com"] }));
  });

  it("deve incluir text quando fornecido", async () => {
    mockSend.mockResolvedValue({ data: { id: "id4" }, error: null });
    const provider = new ResendProvider();
    await provider.send({
      from: "a@b.com",
      to: "u@test.com",
      subject: "s",
      html: "<p>hi</p>",
      text: "fallback text",
    });
    const payload = mockSend.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.text).toBe("fallback text");
  });

  it("deve incluir replyTo quando fornecido", async () => {
    mockSend.mockResolvedValue({ data: { id: "id5" }, error: null });
    const provider = new ResendProvider();
    await provider.send({
      from: "a@b.com",
      to: "u@test.com",
      subject: "s",
      html: "<p>hi</p>",
      replyTo: "suporte@viggo.com.br",
    });
    const payload = mockSend.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.replyTo).toBe("suporte@viggo.com.br");
  });

  it("deve incluir text e replyTo simultaneamente", async () => {
    mockSend.mockResolvedValue({ data: { id: "id6" }, error: null });
    const provider = new ResendProvider();
    await provider.send({
      from: "a@b.com",
      to: "u@test.com",
      subject: "s",
      html: "<p>hi</p>",
      text: "txt",
      replyTo: "reply@test.com",
    });
    const payload = mockSend.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.text).toBe("txt");
    expect(payload.replyTo).toBe("reply@test.com");
  });

  it("deve usar apiKey passada no construtor", async () => {
    mockSend.mockResolvedValue({ data: { id: "id7" }, error: null });
    const provider = new ResendProvider("custom-key-xyz");
    await provider.send({ from: "a@b.com", to: "u@test.com", subject: "s", html: "<p>hi</p>" });
    expect(MockResend).toHaveBeenCalledWith("custom-key-xyz");
    expect(provider).toBeDefined();
  });

  it("deve usar Env.RESEND_API_KEY quando apiKey não passada", async () => {
    mockSend.mockResolvedValue({ data: { id: "id8" }, error: null });
    vi.clearAllMocks();
    mockEnv.RESEND_API_KEY = "env-key-999";
    const provider = new ResendProvider();
    await provider.send({ from: "a@b.com", to: "u@test.com", subject: "s", html: "<p>hi</p>" });
    expect(MockResend).toHaveBeenCalledWith("env-key-999");
  });

  it("deve lançar erro quando Resend retorna error", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "You can only send testing emails", statusCode: 403 } });
    const provider = new ResendProvider();
    await expect(
      provider.send({ from: "a@b.com", to: "u@test.com", subject: "s", html: "<p>hi</p>" })
    ).rejects.toThrow("Resend error");
  });

  it("deve retornar unknown quando data.id ausente", async () => {
    mockSend.mockResolvedValue({ data: {}, error: null });
    const provider = new ResendProvider();
    const result = await provider.send({ from: "a@b.com", to: "u@test.com", subject: "s", html: "<p>hi</p>" });
    expect(result).toEqual({ id: "unknown" });
  });

  it("deve retornar unknown quando data null", async () => {
    mockSend.mockResolvedValue({ data: null, error: null });
    const provider = new ResendProvider();
    const result = await provider.send({ from: "a@b.com", to: "u@test.com", subject: "s", html: "<p>hi</p>" });
    expect(result).toEqual({ id: "unknown" });
  });
});
