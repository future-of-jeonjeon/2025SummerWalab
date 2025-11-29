import { apiClient, MS_API_BASE } from './api';

export const DEPARTMENTS = [
    '글로벌리더십학부',
    '국제어문학부',
    '경영경제학부',
    '법학부',
    '커뮤니케이션학부',
    '공간환경시스템공학부',
    '기계제어공학부',
    '콘텐츠융합디자인학부',
    '생명과학부',
    '전산전자공학부',
    '상담심리사회복지학부',
    'AI융합학부',
];

export interface UserDetail {
    user_id: number;
    name: string;
    student_id: string;
    major_id: number;
}

export const userService = {
    getUserDetail: async () => {
        if (!MS_API_BASE) throw new Error('MS_API_BASE not configured');
        // Check if user info exists
        const response = await apiClient.post(`${MS_API_BASE}/user/check`);
        return response.data;
    },

    registerUserDetail: async (data: UserDetail) => {
        if (!MS_API_BASE) throw new Error('MS_API_BASE not configured');
        const response = await apiClient.post(`${MS_API_BASE}/user/data`, data);
        return response.data;
    },

    getUserData: async () => {
        if (!MS_API_BASE) throw new Error('MS_API_BASE not configured');
        // Using GET /user/data to get data
        const response = await apiClient.get(`${MS_API_BASE}/user/data`);
        return response.data;
    },

    updateUserData: async (data: UserDetail) => {
        if (!MS_API_BASE) throw new Error('MS_API_BASE not configured');
        const response = await apiClient.put(`${MS_API_BASE}/user/data`, data);
        return response.data;
    },
};
