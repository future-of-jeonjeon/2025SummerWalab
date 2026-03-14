export type PendingStatus = 'IN_PROGRESS' | 'DONE' | 'EXPIRED';

export type PendingTargetType = 'PROBLEM' | 'WORKBOOK' | 'CONTEST_USER' | 'Organization';

export interface UserProfileResponse {
  username: string | null;
  avatar: string | null;
  student_id: string | null;
  major_id: number | null;
  name: string | null;
  dark_mode_enabled: boolean;
  language_preferences: string[];
}

export interface PendingProblemTargetData {
  id: number;
  title?: string;
  create_time?: string;
}

export interface PendingWorkbookTargetData {
  id: number;
  title?: string;
  created_at?: string;
}

export interface PendingOrganizationTargetData {
  id: number;
  name?: string;
  description?: string;
  img_url?: string | null;
  created_time?: string;
  created_at?: string;
}

export interface PendingResponse {
  id?: number;
  pending_id?: number;
  status: PendingStatus;
  target_type: PendingTargetType;
  target_id: number;
  title: string;
  due_at: string | null;
  created_user_data: UserProfileResponse;
  target_data: PendingProblemTargetData | PendingWorkbookTargetData | PendingOrganizationTargetData | null;
  completed_at: string | null;
  completed_user_id: number | null;
}

export interface PendingPaginationResponse {
  items: PendingResponse[];
  total: number;
  page: number;
  size: number;
}
