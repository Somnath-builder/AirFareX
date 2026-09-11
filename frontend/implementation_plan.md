# Implementation Plan: Integrate Intelligence Copilot (Chatbot)

This plan outlines wiring the existing backend chatbot (`/api/chat`) into the frontend UI as a floating cybersecurity-styled AI Copilot.

## User Review Required
No breaking changes. The AI Copilot will be integrated as a non-intrusive floating overlay module.

## Proposed Changes

### `frontend/src/types.ts`
- **[MODIFY]**: Add `ChatResponse`, `ChatRequest`, and `ChatMessage` typescript interfaces.

### `frontend/src/services/airfareService.ts`
- **[MODIFY]**: Add `sendChatMessage` and `getChatHistory` methods to communicate with the `/api/chat` and `/api/chat/history` endpoints.

### `frontend/src/components/ui/CopilotHUD.tsx`
- **[NEW]**: Create a completely new cyberpunk-styled floating chat interface.
  - Floating action button (FAB) in the bottom right corner (e.g. glowing AI icon).
  - Sliding chat panel that overlays the right side of the screen.
  - Message bubbles styled as command-line logs (User vs. System).
  - Markdown/formatting support if the AI returns structured data.
  - Auto-scroll and loading indicators.

### `frontend/src/components/layout/Layout.tsx`
- **[MODIFY]**: Import and mount `<CopilotHUD />` inside the root layout so it is available across all dashboard pages globally.

## Verification Plan
1. Send a test message ("Hello, what can you do?") to verify the `/api/chat` API bridge works.
2. Verify context retention by asking follow-up questions.
3. Validate UI aesthetics (neon glows, scrolling, typing indicators).
