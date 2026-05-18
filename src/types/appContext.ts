import type { AuthSession, Ride } from './domain'

export type PassengerMe = Extract<AuthSession, { kind: 'passenger' }>
export type DriverMe = Extract<AuthSession, { kind: 'driver' }>
export type DispatcherMe = Extract<AuthSession, { kind: 'dispatcher' }>

export interface AppOutletContext {
  me: PassengerMe
  activeRide: Ride | null
}

export interface DriverOutletContext {
  me: DriverMe
}

export interface DispatcherOutletContext {
  me: DispatcherMe
}
