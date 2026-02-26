# Custom Patches (Do Not Lose on Upstream Merge)

This file tracks custom patches maintained on our fork.
Run `scripts/check-custom-patches.sh` before completing any upstream rebase.

## Required Patches

### 1. Per-group agent file injection (routing)

- **Files**: `src/agents/system-prompt.ts`, `src/auto-reply/reply/get-reply-run.ts`, `src/config/types.*`, `src/config/zod-schema*.ts`
- **Purpose**: Maps WhatsApp group JIDs to per-group agent files and instructions via `routing.groups` config
- **Marker**: `perGroupConfig?.agentFile`
- **Upstream candidate**: Yes - clean feature, worth proposing

### 2. Session key + requester env var exports (exec tool)

- **Files**: `src/agents/bash-tools.exec.ts`, `src/agents/bash-tools.exec-types.ts`, `src/agents/pi-tools.ts`, `src/agents/subagent-registry.ts`
- **Purpose**: Exports CLAWDBOT*SESSION_KEY and OPENCLAW_REQUESTER*\* env vars to child processes. Enables delegate-agent wake-back and subagent routing to original chat.
- **Markers**:
  - `baseEnv.OPENCLAW_SESSION_KEY = defaults.sessionKey`
  - `baseEnv.OPENCLAW_REQUESTER_CHANNEL = defaults.requesterChannel`
  - `getSubagentRunByChildSession`
- **Upstream candidate**: Yes - useful for any multi-agent setup

### 3. Media reply hint fix

- **File**: `src/auto-reply/reply/get-reply-run.ts`
- **Purpose**: Tightens media reply hint to prevent LLM from echoing guidance text verbatim
- **Marker**: `do not repeat this guidance text`
- **Upstream candidate**: Yes - simple quality fix

## Verification

```bash
./scripts/check-custom-patches.sh
```

## Upgrade Workflow

1. `git fetch origin --tags`
2. `git rebase <new-release-tag>`
3. Resolve conflicts, preserving our patches
4. Run `./scripts/check-custom-patches.sh`
5. `pnpm install && pnpm build`
6. `systemctl --user restart openclaw`
