import type { PassengerProfile, Ride, UserAccount } from './domain'

export interface AppOutletContext {
  me: { account: UserAccount; profile: PassengerProfile }
  activeRide: Ride | null
}
