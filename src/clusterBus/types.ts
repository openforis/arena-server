/**
 * Generic "invalidate/deliver this on every dyno" envelope. `targetType`/`targetId` are opaque
 * to ClusterBus - each subsystem (WebSocketServer, record/survey cache invalidation, ...)
 * defines its own vocabulary and is expected to no-op on events it doesn't recognize.
 */
export interface ClusterEvent {
  targetType: string
  targetId: string
  eventType: string
  message: any
}

export type ClusterEventHandler = (event: ClusterEvent) => void
