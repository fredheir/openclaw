# Quick Launch Feature - PRD

**Task:** TBD (will be created after spec)
**Author:** Rolf (via interview) + Clawd
**Date:** 2026-01-03
**Status:** Ready for implementation

---

## 1. Overview

### Goals
- Enable rapid agent launches for ad-hoc urgent commands (e.g., "commit and push", "check logs")
- Reduce friction: no need to create task first, pick from existing tasks, or fill metadata
- Maintain audit trail by creating tasks automatically
- Provide visibility into agent execution via live logs

### Non-Goals
- Replace the full task creation flow (AddTaskDrawer remains for structured work)
- Support multi-step workflows (that's what regular tasks are for)
- Available on all pages (scoped to landing page only for V1)

### Context
All required components already exist:
- `AddTaskDrawer` has task creation + launch logic
- `AgentActivityFeed` has live log rendering with ANSI colors
- `useLaunchWithConflictCheck` hook handles agent conflicts
- Toast notifications via `sonner`

---

## 2. Architecture

### Component Structure

**New Component: `QuickLaunchButton.tsx`**
```typescript
interface QuickLaunchButtonProps {
  // No props needed - self-contained
}
```

Renders:
- Floating rocket button (left of + button)
- Drawer with prompt input
- Reuses conflict detection hooks
- Manages command history in localStorage

**New Component: `AgentLogSheet.tsx`**
```typescript
interface AgentLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
}
```

Renders:
- Bottom sheet modal with live log feed
- Polls `/api/agent-logs?taskId=<id>` every 3s
- Auto-scrolls to bottom on new lines
- Shows completion status when agent finishes

### Data Flow

1. User types command → hits Enter or clicks Launch
2. Create task with defaults:
   - Priority: `D`
   - Section: `"Ops"`
   - Assignee: `agent`
   - Execution Location: `null` (anywhere)
   - Content: user's prompt
3. Launch agent via `/api/agent-launch`
4. Show success toast with task ID and "View Logs" action
5. If user clicks "View Logs", open `AgentLogSheet` with live feed
6. Agent completes → task auto-completes (status = 'completed')

### Command History

Stored in localStorage as:
```typescript
interface CommandHistory {
  commands: string[];  // Last 10 commands
  maxSize: 10;
}
```

- Up/Down arrows cycle through history
- New commands prepend to array
- Max 10 entries (FIFO eviction)

---

## 3. User Experience

### Initial State
- Floating rocket button (🚀) appears bottom-right, left of the + button
- Distinct color (blue accent?) to differentiate from + button
- Tooltip: "Quick Launch"

### Interaction Flow

**1. Open Drawer:**
- Tap rocket button
- Drawer slides up from bottom (same pattern as AddTaskDrawer)
- Auto-focus on text input

**2. Enter Command:**
- Single multiline text area (3-4 rows)
- Placeholder: "Enter command to run (e.g., 'commit and push changes')"
- Up/Down arrows cycle through command history
- Shift+Enter for new line, Enter submits (or explicit "Launch" button if safer)

**3. Submit:**
- Haptic feedback (50ms vibration)
- Drawer closes
- Toast appears: "Launched agent for task #123" with "View Logs" action button

**4. View Logs (optional):**
- Click "View Logs" on toast
- `AgentLogSheet` opens (bottom sheet modal)
- Shows task ID, command, and live log output
- Auto-scrolls to bottom as new lines arrive
- Displays completion status when done

**5. Completion:**
- Agent finishes → task auto-completes
- Log sheet shows "✓ Completed" badge
- Sheet stays open for user to review (doesn't auto-close)
- User dismisses manually

### States & Feedback

| State | UI |
|-------|-----|
| Idle | Rocket button visible |
| Drawer open | Text input focused, command history available |
| Launching | Button disabled, spinner in toast |
| Running | Toast with "View Logs" action, live feed in sheet |
| Completed | Green checkmark badge in log sheet |
| Failed | Red error badge in log sheet, full output visible |
| Agent conflict | Standard "Kill & Launch" dialog (reuse existing) |

### Error Handling

- **Agent already running:** Show kill-and-replace dialog (same as AddTaskDrawer)
- **API failure:** Toast error message, task may or may not be created (show what happened)
- **Agent crash:** Log sheet shows full crash output, task remains open (does NOT auto-complete)

---

## 4. Implementation Plan

### Files to Create

**`tools/task-pwa/src/components/quick-launch-button.tsx`**
- Floating button + drawer
- Command history state management
- Task creation + launch logic (reuse from AddTaskDrawer)
- Conflict handling via `useLaunchWithConflictCheck`

**`tools/task-pwa/src/components/agent-log-sheet.tsx`**
- Bottom sheet modal
- Live log polling (similar to AgentActivityFeed)
- ANSI color rendering (reuse `renderAnsiLine` from existing code)
- Auto-scroll behavior

### Files to Modify

**`tools/task-pwa/src/app/page.tsx`**
- Import and render `<QuickLaunchButton />`
- Position left of `<AddTaskDrawer />` (both floating)

### Backend Notes
- No backend changes needed
- Relies on existing `/api/tasks` (POST) and `/api/agent-launch` (POST)
- Uses existing `/api/agent-logs` for polling

### Styling
- Rocket button: distinct color (e.g., `bg-blue-500` vs `bg-primary`)
- Positioned: `bottom-20 left-4` (mirrors + button at `bottom-20 right-4`)
- Z-index: `z-20` (same layer as + button)
- Drawer: reuse existing drawer component styles

### Command History Implementation
```typescript
// hooks/use-command-history.ts
function useCommandHistory(key: string = 'quick-launch-history') {
  const [history, setHistory] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setHistory(JSON.parse(saved));
  }, []);
  
  const addCommand = (cmd: string) => {
    const updated = [cmd, ...history.filter(c => c !== cmd)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setIndex(-1);
  };
  
  const navigate = (direction: 'up' | 'down') => {
    // Arrow key navigation logic
  };
  
  return { history, index, addCommand, navigate, currentCommand };
}
```

---

## 5. Success Criteria

- [ ] Rocket button renders on landing page (left of +)
- [ ] Drawer opens with auto-focused text input
- [ ] Up/Down arrows cycle through command history (last 10 commands)
- [ ] Enter key submits and launches agent
- [ ] Task created with: Priority=D, Section=Ops, Assignee=agent, Location=null
- [ ] Toast shows with task ID and "View Logs" action
- [ ] Log sheet opens on click, shows live output
- [ ] ANSI colors render correctly in log sheet
- [ ] Auto-scroll works as new log lines arrive
- [ ] Task auto-completes when agent succeeds
- [ ] Task stays open when agent fails (manual review required)
- [ ] Agent conflict dialog works (kill & replace)
- [ ] Command history persists across sessions
- [ ] Haptic feedback on launch (if supported)
- [ ] Only available on `/` (tasks landing page)

---

## 6. Future Work (V2+)

**Out of scope for V1, create follow-up tasks:**

1. **Multi-agent support:**
   - Agent picker dropdown (pi/claude/codex) in quick-launch drawer
   - Different default sections per agent type

2. **Quick-launch templates:**
   - Saved command shortcuts (e.g., "Deploy PWA" → runs full script)
   - Managed via settings page

3. **Site-wide availability:**
   - Show rocket button on other pages (agents, projects, insights)
   - Context-aware: pre-fill prompt with page context

4. **Execution location picker:**
   - Optional toggle for server/laptop preference
   - Defaults to "anywhere" but user can override

5. **Notification preferences:**
   - Sound on completion/error
   - Desktop notification (if PWA installed)
   - Email on long-running task completion

6. **Log sheet enhancements:**
   - Multiple tabs for concurrent quick-launches
   - Download log output as .txt
   - Share agent output (copy link)

---

## 7. Open Questions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Task defaults? | Priority=D, Section=Ops, Assignee=agent, Location=null | Quick launches are urgent, ops-flavored work |
| Prompt UX? | Single text area, Enter submits | Minimal friction, ChatGPT-like |
| Task persistence? | Auto-complete on success, manual on failure | Keeps task list clean for simple commands |
| Agent conflict? | Reuse kill-and-replace dialog | Consistent with existing AddTaskDrawer behavior |
| Log viewer? | Toast → "View Logs" → bottom sheet | Non-blocking, opt-in detail view |
| Auto-close sheet? | No, user dismisses manually | User may want to review output |
| Button placement? | Left of + button, bottom-right floating | User preference, mirrors existing pattern |
| Command history? | Yes, last 10 commands via localStorage | Power-user feature, low implementation cost |
| Scope? | Landing page only (V1) | Focused launch, expand in V2 |
| Agent picker? | Default to "agent", no picker in V1 | Simplicity first, add in V2 if needed |

---

## 8. Implementation Notes

### Reusable Patterns

From `AddTaskDrawer`:
- `useLaunchWithConflictCheck()` hook
- Conflict dialog structure
- Toast notification pattern

From `AgentActivityFeed`:
- `useAgentLogs()` polling hook
- `renderAnsiLine()` for terminal colors
- Log container styling (black bg, monospace font)

### Positioning Math
```css
/* QuickLaunchButton */
.quick-launch-btn {
  position: fixed;
  bottom: 5rem;       /* Same as AddTaskDrawer (bottom-20 = 5rem) */
  left: 1rem;         /* Left side instead of right-4 */
  z-index: 20;        /* Same layer */
}

/* Ensure both buttons fit on small screens */
@media (max-width: 640px) {
  /* May need to stack vertically or adjust spacing */
}
```

### Accessibility
- Rocket button: `aria-label="Quick launch agent"`
- Drawer: `role="dialog"`, `aria-labelledby="quick-launch-title"`
- Log sheet: `role="dialog"`, keyboard dismissible (Esc key)

---

## 9. Acceptance Testing

Manual test scenarios:

1. **Happy path:**
   - Open landing page → click rocket → type "ls -la" → Enter
   - Verify task created with correct defaults
   - Verify toast shows task ID
   - Click "View Logs" → verify live output appears
   - Wait for completion → verify task auto-completes

2. **Command history:**
   - Launch 3 different commands
   - Open drawer again → press Up arrow → verify last command appears
   - Press Up again → verify second-to-last command
   - Press Down → verify forward navigation works
   - Refresh page → verify history persists

3. **Agent conflict:**
   - Launch first command (long-running)
   - Launch second command immediately
   - Verify "Kill & Launch" dialog appears
   - Click "Kill & Launch" → verify first agent stops, second starts

4. **Error handling:**
   - Launch command that fails (e.g., "invalid-command")
   - Verify log sheet shows error output
   - Verify task stays open (not auto-completed)

5. **Multi-session:**
   - Launch command → close log sheet
   - Launch another command
   - Click "View Logs" on second toast → verify shows second agent only

---

**Ready for implementation.** Estimated effort: 4-6 hours for experienced dev, includes testing.
