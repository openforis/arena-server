import { Express, Request, Response } from 'express'

import { User } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { Requests, Responses } from '../../utils'
import { User2FAService } from '../../service'
import { ApiEndpoint } from '../endpoint'

export const User2FAAuthApi: ExpressInitializer = {
  init: (express: Express): void => {
    // GET /api/2fa/devices - Get all 2FA devices for the current user
    express.get(ApiEndpoint.user2FAAuth.devices(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const list = await User2FAService.getDevices({ userUuid: user.uuid })
        return res.json({ list })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/devices/count - Get count of 2FA devices for the current user
    express.get(ApiEndpoint.user2FAAuth.devicesCount(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const count = await User2FAService.countDevices({ userUuid: user.uuid })
        return res.json({ count })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // GET /api/2fa/device/:deviceUuid - Get a specific 2FA device by its UUID
    express.get(ApiEndpoint.user2FAAuth.device(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        const device = await User2FAService.getDevice({ deviceUuid })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/add - Add a new 2FA device
    express.post(ApiEndpoint.user2FAAuth.addDevice(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        const { deviceName } = Requests.getParams(req)

        if (!deviceName) {
          return res.status(400).json({ message: 'Device name is required' })
        }

        const { uuid: userUuid, email: userEmail } = user

        const device = await User2FAService.addDevice({ userUuid, userEmail, deviceName })

        return res.json(device)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/verify - Verify and enable a 2FA device
    express.post(ApiEndpoint.user2FAAuth.verifyDevice(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid, token1, token2 } = Requests.getParams(req)

        if (!deviceUuid || !token1 || !token2) {
          return res.status(400).json({ message: 'Device UUID and tokens are required' })
        }

        const device = await User2FAService.verifyDevice({ deviceUuid, token1, token2 })

        return res.json(device)
      } catch (error: any) {
        if (
          error.message === 'Invalid verification code' ||
          error.message === User2FAService.deviceNotFoundErrorMessageKey
        ) {
          return res.status(400).json({ message: error.message })
        }
        return Responses.sendError(res, error)
      }
    })

    // DELETE /api/2fa/device/:deviceUuid/remove - Remove a 2FA device
    express.delete(ApiEndpoint.user2FAAuth.removeDevice(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        await User2FAService.removeDevice({ deviceUuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/devices/disable-all - Disable all 2FA devices
    express.post(ApiEndpoint.user2FAAuth.disableAll(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user
        await User2FAService.disableAll({ userUuid: user.uuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/device/:deviceUuid/regenerate-backup-codes - Regenerate backup codes for a device
    express.post(ApiEndpoint.user2FAAuth.regenerateBackupCodes(), async (req: Request, res: Response) => {
      try {
        const { deviceUuid } = Requests.getParams(req)

        if (!deviceUuid) {
          return res.status(400).json({ message: 'Device UUID is required' })
        }

        const backupCodes = await User2FAService.regenerateBackupCodes({ deviceUuid })
        return res.json({ backupCodes })
      } catch (error: any) {
        const { message } = error
        if (message === User2FAService.deviceNotFoundErrorMessageKey) {
          return res.status(400).json({ message })
        }
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/verify-login - Verify 2FA token during login (checks all enabled devices)
    express.post(ApiEndpoint.user2FAAuth.verifyLogin(), async (req: Request, res: Response) => {
      try {
        const { userUuid, token } = Requests.getParams(req)

        if (!userUuid || !token) {
          return res.status(400).json({ message: 'User UUID and token are required' })
        }

        const isValid = await User2FAService.verifyLogin({ userUuid, token })

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
