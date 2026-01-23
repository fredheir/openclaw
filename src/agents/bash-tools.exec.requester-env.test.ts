/**
 * Regression test: exec tool exports CLAWDBOT_REQUESTER_* env vars for subagent sessions.
 *
 * When a subagent (e.g., code-reviewer) runs exec commands like delegate-agent,
 * the child process needs the requester's delivery context to route completion
 * messages back to the original chat (not the subagent's DM).
 *
 * This test verifies that when exec defaults include requester context,
 * those values are exported as CLAWDBOT_REQUESTER_* environment variables.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetProcessRegistryForTests } from "./bash-process-registry.js";
import { createExecTool } from "./bash-tools.js";

const isWin = process.platform === "win32";

beforeEach(() => {
  resetProcessRegistryForTests();
});

describe("exec tool requester env vars", () => {
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    if (!isWin) process.env.SHELL = "/bin/bash";
  });

  afterEach(() => {
    if (!isWin) process.env.SHELL = originalShell;
  });

  it("exports CLAWDBOT_REQUESTER_* env vars when requester context is provided", async () => {
    if (isWin) return; // Skip on Windows

    const execTool = createExecTool({
      sessionKey: "agent:code-reviewer:subagent:test-uuid",
      requesterChannel: "whatsapp",
      requesterTo: "group:120363123456789@g.us",
      requesterThreadId: "msg-123",
      requesterAccountId: "37127301244",
    });

    // Run a command that prints the env vars
    const result = await execTool.execute("test-call", {
      command: "env | grep CLAWDBOT_REQUESTER || true",
    });

    const output = (result.details as { aggregated?: string })?.aggregated ?? "";

    expect(output).toContain("CLAWDBOT_REQUESTER_CHANNEL=whatsapp");
    expect(output).toContain("CLAWDBOT_REQUESTER_TO=group:120363123456789@g.us");
    expect(output).toContain("CLAWDBOT_REQUESTER_THREAD_ID=msg-123");
    expect(output).toContain("CLAWDBOT_REQUESTER_ACCOUNT_ID=37127301244");
  });

  it("exports CLAWDBOT_SESSION_KEY alongside requester vars", async () => {
    if (isWin) return; // Skip on Windows

    const sessionKey = "agent:code-reviewer:subagent:test-uuid-2";
    const execTool = createExecTool({
      sessionKey,
      requesterChannel: "telegram",
      requesterTo: "dm:123456789",
    });

    const result = await execTool.execute("test-call", {
      command: "env | grep CLAWDBOT || true",
    });

    const output = (result.details as { aggregated?: string })?.aggregated ?? "";

    expect(output).toContain(`CLAWDBOT_SESSION_KEY=${sessionKey}`);
    expect(output).toContain("CLAWDBOT_REQUESTER_CHANNEL=telegram");
    expect(output).toContain("CLAWDBOT_REQUESTER_TO=dm:123456789");
  });

  it("does not export requester vars when not provided", async () => {
    if (isWin) return; // Skip on Windows

    const execTool = createExecTool({
      sessionKey: "agent:main:whatsapp:group:123",
      // No requester* fields
    });

    const result = await execTool.execute("test-call", {
      command: "env | grep CLAWDBOT_REQUESTER || echo 'none found'",
    });

    const output = (result.details as { aggregated?: string })?.aggregated ?? "";

    expect(output.trim()).toBe("none found");
  });
});
