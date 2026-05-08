import type { AuthSession, Ride } from './domain'

export type PassengerMe = Extract<AuthSession, { kind: 'passenger' }>
export type DriverMe = Extract<AuthSession, { kind: 'driver' }>

export interface AppOutletContext {
  me: PassengerMe
  activeRide: Ride | null
}

export interface DriverOutletContext {
  me: DriverMe
}
