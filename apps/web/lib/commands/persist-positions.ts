import type { CanvasPosition } from '@diagramhq/domain';

export type PersistPositionsFn = (
  viewId: string,
  positions: Array<{ objectId: string; x: number; y: number }>,
) => Promise<void>;

export interface PositionResult {
  objectId: string;
  position: CanvasPosition;
}

/** Shared by every command that persists a batch of `{objectId, position}` results. */
export async function persistPositions(
  viewId: string | undefined,
  persistFn: PersistPositionsFn | undefined,
  results: PositionResult[],
): Promise<void> {
  if (persistFn && viewId) {
    await persistFn(
      viewId,
      results.map((r) => ({ objectId: r.objectId, x: r.position.x, y: r.position.y })),
    );
  }
}
