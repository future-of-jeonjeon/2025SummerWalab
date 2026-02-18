import { apiClient, MS_API_BASE } from './api';
import { PaginatedResponse, Problem, Workbook, TestCaseUploadResponse } from '../types';
import { CreateProblemPayload } from './adminService';

interface MSPage<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

export interface ProblemImportPollingStatus {
    status: 'initialized' | 'processing' | 'done' | 'error';
    processed_problem: number;
    left_problem: number;
    all_problem: number;
    error_code?: string;
}

export const contributionService = {
    getContributedProblems: async (page: number = 1, size: number = 20): Promise<PaginatedResponse<Problem>> => {
        const response = await apiClient.get<MSPage<Problem>>(`${MS_API_BASE}/contribute/problem`, {
            params: { page, size },
        });
        const msPage = response.data;
        return {
            data: msPage.items,
            total: msPage.total,
            page: msPage.page,
            limit: msPage.size,
            totalPages: Math.ceil(msPage.total / msPage.size)
        };
    },

    getContributedWorkbooks: async (page: number = 1, size: number = 20): Promise<PaginatedResponse<Workbook>> => {
        const response = await apiClient.get<MSPage<Workbook>>(`${MS_API_BASE}/contribute/workbook`, {
            params: { page, size },
        });
        const msPage = response.data;
        return {
            data: msPage.items,
            total: msPage.total,
            page: msPage.page,
            limit: msPage.size,
            totalPages: Math.ceil(msPage.total / msPage.size)
        };
    },

    uploadProblemTestCases: async (file: File, spj: boolean): Promise<TestCaseUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('spj', spj ? 'true' : 'false');

        const response = await apiClient.post(`${MS_API_BASE}/problem/testcase`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        return response.data;
    },

    createProblem: async (payload: CreateProblemPayload): Promise<{ polling_key: string }> => {
        // MS Server expects ProblemCreateRequest which matches CreateProblemPayload mostly
        // but MS might not need _id.
        // Also MS API is /api/problem (POST)
        const response = await apiClient.post(`${MS_API_BASE}/problem`, payload);
        return response.data;
    },

    getPollingStatus: async (key: string): Promise<ProblemImportPollingStatus> => {
        const response = await apiClient.get<ProblemImportPollingStatus>(`${MS_API_BASE}/problem/polling`, {
            params: { key }
        });
        return response.data;
    },
};
