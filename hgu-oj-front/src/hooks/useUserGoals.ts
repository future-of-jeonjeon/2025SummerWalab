import { useQuery } from '@tanstack/react-query';

import { todoService } from '../services/todoService';
import { useAuthStore } from '../stores/authStore';

export const useUserGoals = () => {
  const { isAuthenticated } = useAuthStore();

  const query = useQuery({
    queryKey: ['todo', 'my'],
    queryFn: todoService.getMyTodo,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  return {
    ...query,
    goals: query.data?.goals ?? [],
  };
};
