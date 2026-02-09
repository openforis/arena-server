import { Express, Request, Response } from 'express'

import { User } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { Requests, Responses } from '../../utils'
import { UserTwoFactorService } from '../../service'
import { ApiEndpoint } from '../endpoint'

export const UserTwoFactorAuthApi: ExpressInitializer = {
  init: (express: Express): void => {
    // GET /api/2fa/devices - Get all 2FA devices for the current user
    express.get(ApiEndpoint.userTwoFactorAuth.devices(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const list = await UserTwoFactorService.getDevices({ userUuid: user.uuid })
        return res.json({ list })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/devices/count - Get count of 2FA devices for the current user
    express.get(ApiEndpoint.userTwoFactorAuth.devicesCount(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const count = await UserTwoFactorService.countDevices({ userUuid: user.uuid })
        return res.json({ count })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/device/:deviceUuid - Get a specific 2FA device by its UUID
    express.get(ApiEndpoint.userTwoFactorAuth.device(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        const device = await UserTwoFactorService.getDevice({ deviceUuid })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/add - Add a new 2FA device
    express.post(ApiEndpoint.userTwoFactorAuth.addDevice(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const { deviceName } = Requests.getParams(req)

        if (!deviceName) {
          return res.status(400).json({ message: 'Device name is required' })
        }

        const { uuid: userUuid, email: userEmail } = user

        const device = await UserTwoFactorService.addDevice({ userUuid, userEmail, deviceName })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/verify - Verify and enable a 2FA device
    express.post(ApiEndpoint.userTwoFactorAuth.verifyDevice(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid, token1, token2 } = Requests.getParams(req)

        if (!deviceUuid || !token1 || !token2) {
          return res.status(400).json({ message: 'Device UUID and tokens are required' })
        }

        const device = await UserTwoFactorService.verifyDevice({ deviceUuid, token1, token2 })

        return res.json(device)
      } catch (error: any) {
        if (
          error.message === 'Invalid verification code' ||
          error.message === UserTwoFactorService.deviceNotFoundErrorMessageKey
        ) {
          return res.status(400).json({ message: error.message })
        }
        return Responses.sendError(res, error)
      }
    })

    // DELETE /api/2fa/device/:deviceUuid/remove - Remove a 2FA device
    express.delete(ApiEndpoint.userTwoFactorAuth.removeDevice(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        await UserTwoFactorService.removeDevice({ deviceUuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/devices/disable-all - Disable all 2FA devices
    express.post(ApiEndpoint.userTwoFactorAuth.disableAll(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        await UserTwoFactorService.disableAll({ userUuid: user.uuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/regenerate-backup-codes - Regenerate backup codes for a device
    express.post(ApiEndpoint.userTwoFactorAuth.regenerateBackupCodes(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        const backupCodes = await UserTwoFactorService.regenerateBackupCodes({ deviceUuid })
        return res.json({ backupCodes })
      } catch (error: any) {
        const { message } = error
        if (message === UserTwoFactorService.deviceNotFoundErrorMessageKey) {
          return res.status(400).json({ message })
        }
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/verify-login - Verify 2FA token during login (checks all enabled devices)
    express.post(ApiEndpoint.userTwoFactorAuth.verifyLogin(), async (req: Request, res: Response) => {
      try {
        const { userUuid, token } = Requests.getParams(req)

        if (!userUuid || !token) {
          return res.status(400).json({ message: 'User UUID and token are required' })
        }

        const isValid = await UserTwoFactorService.verifyLogin({ userUuid, token })

        if (!isValid) {
          return res.status(401).json({ message: 'Invalid 2FA code' })
        }

        return res.json({ valid: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })
  },
}
