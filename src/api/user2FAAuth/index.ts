import { Express, Request, Response } from 'express'

import { ServiceRegistry, User } from '@openforis/arena-core'

import { ExpressInitializer, ServerServiceType } from '../../server'
import { User2FAService, User2FAServiceErrorMessageKeys } from '../../service'
import { Requests, Responses } from '../../utils'
import { ApiEndpoint } from '../endpoint'

const getUser2FAService = (): User2FAService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.user2FA) as User2FAService

const checkDeviceUuid = async (req: Request, res: Response): Promise<boolean> => {
  const { deviceUuid } = Requests.getParams(req)
  if (!deviceUuid) {
    res.status(400).json({ message: 'Device UUID is required' })
    return false
  }
  return true
}

export const User2FAAuthApi: ExpressInitializer = {
  init: (express: Express): void => {
    // GET /api/2fa/devices - Get all 2FA devices for the current user
    express.get(ApiEndpoint.user2FAAuth.devices(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const service = getUser2FAService()
        const list = await service.getDevices({ userUuid: user.uuid })
        return res.json({ list })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/devices/count - Get count of 2FA devices for the current user
    express.get(ApiEndpoint.user2FAAuth.devicesCount(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const service = getUser2FAService()
        const count = await service.countDevices({ userUuid: user.uuid })
        return res.json({ count })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/device/:deviceUuid - Get a specific 2FA device by its UUID
    express.get(ApiEndpoint.user2FAAuth.device(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const { deviceUuid } = Requests.getParams(req)

        if (!(await checkDeviceUuid(req, res))) return

        const service = getUser2FAService()
        const device = await service.getDevice({ deviceUuid, userUuid: user.uuid })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/add - Add a new 2FA device
    express.post(ApiEndpoint.user2FAAuth.addDevice(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const { deviceName } = Requests.getParams(req)

        if (!deviceName) {
          return res.status(400).json({ message: 'Device name is required' })
        }

        const { uuid: userUuid, email: userEmail } = user

        const service = getUser2FAService()
        const device = await service.addDevice({ userUuid, userEmail, deviceName })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/verify - Verify and enable a 2FA device
    express.post(ApiEndpoint.user2FAAuth.verifyDevice(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const { deviceUuid, token1, token2 } = Requests.getParams(req)

        if (!deviceUuid || !token1 || !token2) {
          return res.status(400).json({ message: 'Device UUID and tokens are required' })
        }

        const service = getUser2FAService()
        const device = await service.verifyDevice({ deviceUuid, userUuid: user.uuid, token1, token2 })

        return res.json(device)
      } catch (error: any) {
        if (
          error.message === User2FAServiceErrorMessageKeys.invalidVerificationCode ||
          error.message === User2FAServiceErrorMessageKeys.deviceNotFound
        ) {
          return res.status(400).json({ message: error.message })
        }
        return Responses.sendError(res, error)
      }
    })

    // DELETE /api/2fa/device/:deviceUuid/remove - Remove a 2FA device
    express.delete(ApiEndpoint.user2FAAuth.removeDevice(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const { deviceUuid } = Requests.getParams(req)

        if (!(await checkDeviceUuid(req, res))) return

        const service = getUser2FAService()
        await service.removeDevice({ deviceUuid, userUuid: user.uuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/devices/disable-all - Disable all 2FA devices
    express.post(ApiEndpoint.user2FAAuth.disableAll(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const service = getUser2FAService()
        await service.disableAll({ userUuid: user.uuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/regenerate-backup-codes - Regenerate backup codes for a device
    express.post(ApiEndpoint.user2FAAuth.regenerateBackupCodes(), async (req: Request, res: Response) => {
      try {
        const user: User = Requests.getUser(req)
        const { deviceUuid } = Requests.getParams(req)

        if (!(await checkDeviceUuid(req, res))) return

        const service = getUser2FAService()
        const backupCodes = await service.regenerateBackupCodes({ deviceUuid, userUuid: user.uuid })
        return res.json({ backupCodes })
      } catch (error: any) {
        const { message } = error
        if (message === User2FAServiceErrorMessageKeys.deviceNotFound) {
          return res.status(400).json({ message })
        }
        return Responses.sendError(res, error)
      }
    })
  },
}
