#!/bin/bash
set -uo pipefail

# Verify custom fork patches are intact after upstream merge/rebase.

PASS=0
FAIL=0

check() {
  local desc="$1" file="$2" marker="$3"
  if grep -q "$marker" "$file" 2>/dev/null; then
    echo "  OK: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc ($file missing: $marker)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Checking custom patches..."
echo ""

echo "Patch 1: Per-group agent routing"
check "routing.groups config" "src/config/zod-schema.agents.ts" "agentFile"
check "per-group agent loading" "src/auto-reply/reply/get-reply-run.ts" "perGroupConfig"

echo ""
echo "Patch 2: Session key + requester env exports"
check "session key export" "src/agents/bash-tools.exec.ts" "OPENCLAW_SESSION_KEY"
check "requester channel export" "src/agents/bash-tools.exec.ts" "OPENCLAW_REQUESTER_CHANNEL"
check "subagent registry lookup" "src/agents/subagent-registry.ts" "getSubagentRunByChildSession"
check "pi-tools requester origin" "src/agents/pi-tools.ts" "getSubagentRunByChildSession"

echo ""
echo "Patch 3: Media reply hint fix"
check "tightened hint" "src/auto-reply/reply/get-reply-run.ts" "do not repeat this guidance text"

echo ""
echo "Result: $PASS passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "All patches intact."
else
  echo "PATCHES MISSING - do not deploy!"
  exit 1
fi
