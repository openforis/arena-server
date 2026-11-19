import { ArenaUser, UserFactory } from '@openforis/arena-core'

export const mockUser: ArenaUser = {
  ...UserFactory.createInstance({ email: 'test@openforis-arena.org', name: 'Tester' }),
  password: 'Test_123',
}

export const mockUserInvalid: ArenaUser = UserFactory.createInstance({ email: 'username', name: 'Tester Invalid' })
