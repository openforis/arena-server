import express, { Express } from 'express'
import request from 'supertest'

import { createLoginRateLimiters } from '../loginRateLimit'

const validPassword = 'right'

const createApp = (): Express => {
  const app = express()
  app.use(express.json())
  app.post(
    '/login',
    ...createLoginRateLimiters({ windowMs: 60_000, maxFailedAttemptsPerIp: 5, maxFailedAttemptsPerAccount: 3 }),
    (req, res) => {
      if (req.body.password === validPassword) {
        res.json({ ok: true })
      } else {
        res.status(401).json({ message: 'Invalid credentials' })
      }
    }
  )
  return app
}

const login = (app: Express, email: string, password: string) => request(app).post('/login').send({ email, password })

describe('Login rate limit', () => {
  test('blocks an account after too many failed attempts, even with the right password', async () => {
    const app = createApp()
    for (let i = 0; i < 3; i++) {
      expect((await login(app, 'user@example.com', 'wrong')).status).toBe(401)
    }
    expect((await login(app, 'user@example.com', 'wrong')).status).toBe(429)
    // email is normalized: case and whitespace variants share the same counter
    expect((await login(app, ' USER@example.com ', validPassword)).status).toBe(429)
  })

  test('does not count successful logins', async () => {
    const app = createApp()
    for (let i = 0; i < 10; i++) {
      expect((await login(app, 'user@example.com', validPassword)).status).toBe(200)
    }
  })

  test('limits failed attempts per IP across different accounts', async () => {
    const app = createApp()
    for (let i = 0; i < 5; i++) {
      expect((await login(app, `user${i}@example.com`, 'wrong')).status).toBe(401)
    }
    expect((await login(app, 'other@example.com', validPassword)).status).toBe(429)
  })
})
