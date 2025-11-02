import { Server } from 'http'
import jwt from 'jsonwebtoken'
import { Socket, Server as SocketServer } from 'socket.io'

import { Logger } from '../log'
import { ProcessEnv } from '../processEnv'
import { ArenaApp } from '../server'
import { WebSocketEvent } from './event'

export class WebSocketServer {
  private static logger: Logger = new Logger(`WebSocketServer`)
  private static socketsById = new Map<string, Socket>()
  private static socketIdsByUserUuid = new Map<string, Set<string>>()

  static init(_app: ArenaApp, server: Server): void {
    new SocketServer(server).use((socket, next) => {
      const { token } = socket.handshake.auth ?? {}
      if (!token) {
        return next(new Error('Authentication error: Token required'))
      }
      try {
        const jwtPayload = jwt.verify(token, ProcessEnv.refreshTokenSecret)
        const { userUuid } = (jwtPayload as any) ?? {}

        // Attach userUuid to socket data for later use
        socket.data.userUuid = userUuid

        const socketDetails = `ID: ${socket.id} - User UUID: ${userUuid}`
        WebSocketServer.logger.debug(`socket connected (${socketDetails})`)

        if (userUuid) {
          this.addSocket(userUuid, socket)

          socket.on(WebSocketEvent.disconnect, () => {
            WebSocketServer.logger.debug(`socket disconnected (${socketDetails})`)
            WebSocketServer.deleteSocket(userUuid, socket.id)
          })
        }
      } catch (error) {
        socket.disconnect()
        return next(new Error('Authentication error: Invalid token'))
      }
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
