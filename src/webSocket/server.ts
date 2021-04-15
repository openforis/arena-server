import { NextFunction, Request, Response } from 'express'
import { Server } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'

import { Logger } from '../log'
import { ArenaApp } from '../server'
import { WebSocketEvent } from './event'

export class WebSocketServer {
  private static logger: Logger = new Logger(`WebSocketServer`)
  private static socketsById = new Map<string, Socket>()
  private static socketIdsByUserUuid = new Map<string, Set<string>>()

  static init(app: ArenaApp, server: Server): void {
    new SocketServer(server)
      .use((socket, next) => {
        app.session(socket.request as Request, {} as Response, next as NextFunction)
      })
      .on(WebSocketEvent.connection, (socket) => {
        const userUuid = socket.request.session.passport?.user
        const socketDetails = `ID: ${socket.id} - User UUID: ${userUuid}`
        WebSocketServer.logger.debug(`socket connected (${socketDetails})`)

        if (userUuid) {
          this.addSocket(userUuid, socket)

          socket.on(WebSocketEvent.disconnect, () => {
            WebSocketServer.logger.debug(`socket disconnected (${socketDetails})`)
            WebSocketServer.deleteSocket(userUuid, socket.id)
          })
        }
      })
  }

  static notifySocket(socketId: string, eventType: string, message: any): void {
    const socket = WebSocketServer.socketsById.get(socketId)

    if (socket) {
      socket.emit(eventType, message)
    } else {
      WebSocketServer.logger.error(`socket with ID ${socketId} not found!`)
    }
  }

  static notifyUser(userUuid: string, eventType: string, message: any): void {
    const socketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    socketIds &&
      socketIds.forEach((socketId) => {
        WebSocketServer.notifySocket(socketId, eventType, message)
      })
  }

  private static addSocket(userUuid: string, socket: Socket): void {
    WebSocketServer.socketsById.set(socket.id, socket)

    if (!this.socketIdsByUserUuid.has(userUuid)) {
      WebSocketServer.socketIdsByUserUuid.set(userUuid, new Set())
    }
    const socketIds = WebSocketServer.socketIdsByUserUuid.get(userUuid)
    socketIds && socketIds.add(socket.id)
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
