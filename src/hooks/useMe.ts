import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../services/authApi'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
  })
}
