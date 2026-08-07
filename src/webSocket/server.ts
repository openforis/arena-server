import { Server } from 'http'
import { Socket, Server as SocketServer } from 'socket.io'

import { ServiceRegistry, ServiceType, UserAuthTokenPayload, UserAuthTokenService } from '@openforis/arena-core'

import { ClusterBus, ClusterEvent, runWithClusterLock } from '../clusterBus'
import { ConnectedSocketRepository } from '../repository'
import { Logger } from '../log'
import { ArenaApp } from '../server'
import { WebSocketEvent } from './event'

// ClusterEvent.targetType values used for WebSocket delivery - opaque to ClusterBus itself.
enum ClusterEventTargetType {
  socket = 'socket',
  user = 'user',
}

// How often this dyno refreshes last_seen_at for the sockets it holds.
const HEARTBEAT_INTERVAL_MS = 30_000
// How often (at most, cluster-wide - see runWithClusterLock) stale connected_socket rows are pruned.
const TTL_SWEEP_INTERVAL_MS = 60_000
// A socket not heartbeat-refreshed for this long is assumed to belong to a dyno that died
// without a clean disconnect (SIGKILL/OOM/crash) - generous multiple of HEARTBEAT_INTERVAL_MS.
const CONNECTED_SOCKET_STALE_AFTER_MS = 4 * HEARTBEAT_INTERVAL_MS
const TTL_SWEEP_LOCK_NAME = 'connected-socket-ttl-sweep'

export class WebSocketServer {
  private static logger: Logger = new Logger(`WebSocketServer`)
  private static socketsById = new Map<string, Socket>()
  private static socketIdsByUserUuid = new Map<string, Set<string>>()
  private static heartbeatInterval: NodeJS.Timeout | null = null
  private static ttlSweepInterval: NodeJS.Timeout | null = null

  private static readonly verifyAuthToken = ({ socket }: { socket: Socket }): string | null => {
    const { token } = socket.handshake.auth ?? {}
    if (!token) {
      WebSocketServer.logger.error(`authentication token not found in handshake for socket ${socket.id}`)
      socket.disconnect()
      return null
    }
    try {
      const service: UserAuthTokenService = ServiceRegistry.getInstance().getService(ServiceType.userAuthToken)
      const jwtPayload: UserAuthTokenPayload = service.verifyAuthToken(token)
      const { userUuid } = jwtPayload
      return userUuid
    } catch (error) {
      WebSocketServer.logger.error(`authentication token validation error: ${error}`)
      socket.disconnect()
      return null
    }
  }

  static init(_app: ArenaApp, server: Server): void {
    const socketServer = new SocketServer(server)

    ClusterBus.init().catch((error) => WebSocketServer.logger.error(`error initializing cluster bus: ${error}`))
    ClusterBus.onEvent(WebSocketServer.onClusterEvent)

    socketServer.on(WebSocketEvent.connection, (socket) => {
      const userUuid = WebSocketServer.verifyAuthToken({ socket })

      const socketDetails = `ID: ${socket.id} - User UUID: ${userUuid}`
      WebSocketServer.logger.debug(`socket connected (${socketDetails})`)

      if (!userUuid) {
        return
      }

      // Attach userUuid to socket data for later use
      socket.data.userUuid = userUuid

      this.addSocket(userUuid, socket)

      socket.on(WebSocketEvent.disconnect, () => {
        WebSocketServer.logger.debug(`socket disconnected (${socketDetails})`)
        WebSocketServer.deleteSocket(userUuid, socket.id)
      })
    })

    WebSocketServer.startMaintenanceTasks()
  }

  /**
   * Removes this dyno's own presence rows and stops delivering/broadcasting.
   * Call on graceful shutdown (SIGTERM) - a crashed/killed dyno instead relies on the TTL sweep.
   */
  static async shutdown(): Promise<void> {
    if (WebSocketServer.heartbeatInterval) clearInterval(WebSocketServer.heartbeatInterval)
    if (WebSocketServer.ttlSweepInterval) clearInterval(WebSocketServer.ttlSweepInterval)
    WebSocketServer.heartbeatInterval = null
    WebSocketServer.ttlSweepInterval = null

    const socketIds = Array.from(WebSocketServer.socketsById.keys())
    try {
      await ConnectedSocketRepository.removeMany(socketIds)
    } catch (error) {
      WebSocketServer.logger.error(`error removing connected_socket rows on shutdown: ${error}`)
    }

    await ClusterBus.shutdown()
  }

  static notifySocket(socketId: string, eventType: string, message: any): boolean {
    const socket = WebSocketServer.socketsById.get(socketId)

    if (socket) {
      socket.emit(eventType, message)
      return true
    }
    // Not held by this dyno: it may be connected to another one - broadcast and let its
    // owner (if any) deliver. Best effort, matching the pre-existing "self-heal" behavior.
    WebSocketServer.logger.debug(`socket with ID ${socketId} not found locally, broadcasting to cluster`)
    ClusterBus.publish({
      targetType: ClusterEventTargetType.socket,
      targetId: socketId,
      eventType,
      message,
    }).catch((error) => WebSocketServer.logger.error(`error broadcasting to socket ${socketId}: ${error}`))
    return true
  }

  static notifyUser(userUuid: string, eventType: string, message: any): void {
    // Always broadcast rather than special-casing "no local sockets for this user": a user can
    // have sockets open on more than one dyno at once (multiple tabs/devices). Postgres delivers
    // NOTIFY to every session listening on the channel, including this dyno's own - so local
    // delivery happens through the same onClusterEvent path as every other dyno's, exactly once
    // per socket.
    ClusterBus.publish({
      targetType: ClusterEventTargetType.user,
      targetId: userUuid,
      eventType,
      message,
    }).catch((error) => WebSocketServer.logger.error(`error broadcasting to user ${userUuid}: ${error}`))
  }

  static async isSocketConnected(socketId: string): Promise<boolean> {
    if (WebSocketServer.socketsById.has(socketId)) return true
    return ConnectedSocketRepository.exists(socketId)
  }

  private static onClusterEvent = (event: ClusterEvent): void => {
    const { targetType, targetId, eventType, message } = event

    if (targetType === ClusterEventTargetType.socket) {
      WebSocketServer.socketsById.get(targetId)?.emit(eventType, message)
    } else if (targetType === ClusterEventTargetType.user) {
      WebSocketServer.socketIdsByUserUuid.get(targetId)?.forEach((socketId) => {
        WebSocketServer.socketsById.get(socketId)?.emit(eventType, message)
      })
    }
  }

  private static addSocket(userUuid: string, socket: Socket): void {
    WebSocketServer.socketsById.set(socket.id, socket)

    if (!this.socketIdsByUserUuid.has(userUuid)) {
      WebSocketServer.socketIdsByUserUuid.set(userUuid, new Set())
    }
    const socketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    socketIds?.add(socket.id)

    ConnectedSocketRepository.upsert({ socketId: socket.id, userUuid }).catch((error) =>
      WebSocketServer.logger.error(`error persisting connected socket ${socket.id}: ${error}`)
    )
  }

  private static deleteSocket(userUuid: string, socketId: string): void {
    WebSocketServer.socketsById.delete(socketId)

    const userSocketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    if (userSocketIds) {
      userSocketIds.delete(socketId)

      if (userSocketIds.size === 0) {
        WebSocketServer.socketIdsByUserUuid.delete(userUuid)
      }
    }

    ConnectedSocketRepository.remove(socketId).catch((error) =>
      WebSocketServer.logger.error(`error removing connected socket ${socketId}: ${error}`)
    )
  }

  private static startMaintenanceTasks(): void {
    WebSocketServer.heartbeatInterval = setInterval(() => {
      const socketIds = Array.from(WebSocketServer.socketsById.keys())
      if (socketIds.length === 0) return
      ConnectedSocketRepository.touchMany(socketIds).catch((error) =>
        WebSocketServer.logger.error(`error sending heartbeat: ${error}`)
      )
    }, HEARTBEAT_INTERVAL_MS)
    WebSocketServer.heartbeatInterval.unref()

    WebSocketServer.ttlSweepInterval = setInterval(() => {
      runWithClusterLock({
        lockName: TTL_SWEEP_LOCK_NAME,
        fn: async () => {
          const deletedCount = await ConnectedSocketRepository.deleteStale(CONNECTED_SOCKET_STALE_AFTER_MS)
          if (deletedCount > 0) {
            WebSocketServer.logger.debug(`pruned ${deletedCount} stale connected_socket row(s)`)
          }
        },
      }).catch((error) => WebSocketServer.logger.error(`error running connected_socket TTL sweep: ${error}`))
    }, TTL_SWEEP_INTERVAL_MS)
    WebSocketServer.ttlSweepInterval.unref()
  }
}
