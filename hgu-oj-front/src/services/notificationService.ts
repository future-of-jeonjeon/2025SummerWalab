import { api, MS_API_BASE } from './api';

export interface NotificationResponse {
  id: number;
  payload: {
    title?: string;
    message?: string;
    [key: string]: any;
  };
  created_time: string;
  is_checked: boolean;
}

export interface NotificationCheckResponse {
  unchecked_num: number;
}

export const notificationService = {
  getNotifications: () =>
    api.get<NotificationResponse[]>(`${MS_API_BASE}/notification`),

  getUnreadCount: () =>
    api.get<NotificationCheckResponse>(`${MS_API_BASE}/notification/check`),
};
