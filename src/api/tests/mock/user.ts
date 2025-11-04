import { User, UserFactory } from '@openforis/arena-core'

export const mockUser: User = {
  ...UserFactory.createInstance({ email: 'test@openforis-arena.org', name: 'Tester' }),
  password: 'Test_123',
}

export const mockUserInvalid: User = UserFactory.createInstance({ email: 'username', name: 'Tester Invalid' })
