import { Express, Request, Response } from 'express'

import { User } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { Requests, Responses } from '../../utils'
import { UserTwoFactorService } from '../../service'
import { ApiEndpoint } from '../endpoint'

export const TwoFactorApi: ExpressInitializer = {
  init: (express: Express): void => {
    // GET /api/2fa/status - Get 2FA status for the current user
    express.get(ApiEndpoint.twoFactor.status(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user as User
        if (!user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        const status = await UserTwoFactorService.getStatus({ userUuid: user.uuid })
        return res.json(status)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/initiate - Start 2FA setup (generates secret and QR code)
    express.post(ApiEndpoint.twoFactor.initiate(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user as User
        if (!user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        const twoFactor = await UserTwoFactorService.initiate({
          userUuid: user.uuid,
          userEmail: user.email,
        })

        return res.json(twoFactor)
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/verify - Verify and enable 2FA
    express.post(ApiEndpoint.twoFactor.verify(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user as User
        if (!user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        const { token } = Requests.getParams(req)

        if (!token) {
          return res.status(400).json({ message: 'Token is required' })
        }

        const twoFactor = await UserTwoFactorService.verify({
          userUuid: user.uuid,
          token,
        })

        return res.json(twoFactor)
      } catch (error: any) {
        if (error.message === 'Invalid verification code' || error.message === '2FA not initialized for this user') {
          return res.status(400).json({ message: error.message })
        }
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/disable - Disable 2FA
    express.post(ApiEndpoint.twoFactor.disable(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user as User
        if (!user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        await UserTwoFactorService.disable({ userUuid: user.uuid })
        return res.json({ success: true })
      } catch (error: any) {
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/regenerate-backup-codes - Regenerate backup codes
    express.post(ApiEndpoint.twoFactor.regenerateBackupCodes(), async (req: Request, res: Response) => {
      try {
        const user: User = req.user as User
        if (!user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        const backupCodes = await UserTwoFactorService.regenerateBackupCodes({ userUuid: user.uuid })
        return res.json({ backupCodes })
      } catch (error: any) {
        if (error.message === '2FA not configured for this user') {
          return res.status(400).json({ message: error.message })
        }
        return Responses.sendError(res, error)
      }
    })

    // POST /api/2fa/verify-login - Verify 2FA token during login
    express.post(ApiEndpoint.twoFactor.verifyLogin(), async (req: Request, res: Response) => {
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
