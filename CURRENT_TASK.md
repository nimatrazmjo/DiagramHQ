# Current Task: F044 — Flow playback

**Status**: NOT STARTED

## Description
Animated playback of architecture flows.
- Controls: play, pause, next, previous, speed, restart
- Animates steps in order
- Test: playback advances step index; controls work.

## Next Steps
1. Review `PHASE-05-FLOWS.md` for F044 acceptance criteria.
2. Implement flow playback state machine/hook (`useFlowPlayback` or domain playback controller) with play/pause/step/speed/restart.
3. Wire playback controls toolbar to active canvas flow projection.
4. Add integration tests in `apps/web/flow-playback.spec.ts`.
5. Verify with `pnpm verify`.
