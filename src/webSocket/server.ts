import { Server } from 'http'
import { Socket, Server as SocketServer } from 'socket.io'

import { ServiceRegistry, ServiceType, UserAuthTokenPayload, UserAuthTokenService } from '@openforis/arena-core'

import { Logger } from '../log'
import { ArenaApp } from '../server'
import { WebSocketEvent } from './event'

export class WebSocketServer {
  private static logger: Logger = new Logger(`WebSocketServer`)
  private static socketsById = new Map<string, Socket>()
  private static socketIdsByUserUuid = new Map<string, Set<string>>()

  private static verifyAuthToken = ({ socket }: { socket: Socket }): string | null => {
    const { token } = socket.handshake.auth ?? {}
    if (!token) {
      WebSocketServer.logger.error(`authentication token not found`)
      socket.disconnect()
      return null
    }
    try {
      const service: UserAuthTokenService = ServiceRegistry.getInstance().getService(ServiceType.userAuthToken)
      const jwtPayload: UserAuthTokenPayload = service.verifyAuthToken(token)
      const { userUuid } = jwtPayload
      return userUuid
    } catch (error) {
      socket.disconnect()
      WebSocketServer.logger.error(`authentication token validation error: ${error}`)
      return null
    }
  }

  static init(_app: ArenaApp, server: Server): void {
    const socketServer = new SocketServer(server)

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
  }

  static notifySocket(socketId: string, eventType: string, message: any): boolean {
    const socket = WebSocketServer.socketsById.get(socketId)

    if (socket) {
      socket.emit(eventType, message)
      return true
    } else {
      WebSocketServer.logger.error(`socket with ID ${socketId} not found!`)
      return false
    }
  }

  static notifyUser(userUuid: string, eventType: string, message: any): void {
    const socketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    socketIds?.forEach((socketId) => {
      WebSocketServer.notifySocket(socketId, eventType, message)
    })
  }

  static isSocketConnected(socketId: string): boolean {
    return WebSocketServer.socketsById.has(socketId)
  }

  private static addSocket(userUuid: string, socket: Socket): void {
    WebSocketServer.socketsById.set(socket.id, socket)

    if (!this.socketIdsByUserUuid.has(userUuid)) {
      WebSocketServer.socketIdsByUserUuid.set(userUuid, new Set())
    }
    const socketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    socketIds?.add(socket.id)
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
  }
}
