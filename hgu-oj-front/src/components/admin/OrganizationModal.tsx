import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { adminService } from '../../services/adminService';

type OrganizationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    organizationId: number | null;
    onSuccess: () => void;
};

type OrganizationFormState = {
    name: string;
    description: string;
};

const initialFormState: OrganizationFormState = {
    name: '',
    description: '',
};

export const OrganizationModal: React.FC<OrganizationModalProps> = ({ isOpen, onClose, mode, organizationId, onSuccess }) => {
    const [formState, setFormState] = useState<OrganizationFormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success?: string; error?: string }>({});

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && organizationId) {
                // Fetch detail
                // Assuming we can get detail from list or need a detail API.
                // adminService.getOrganizations returns list.
                // Let's assume we fetch list and find it for now, similar to Workbook.
                // Or better, add getOrganizationDetail to adminService if possible.
                // For now, let's fetch list.
                const fetchDetail = async () => {
                    try {
                        // TODO: Implement getOrganizationDetail in adminService for better performance
                        const response = await adminService.getOrganizations({ page: 1, limit: 1000 });
                        const org = response.items.find(o => o.id === organizationId);
                        if (org) {
                            setFormState({
                                name: org.name,
                                description: org.description || '',
                            });
                        }
                    } catch (error) {
                        setMessage({ error: '정보를 불러오지 못했습니다.' });
                    }
                };
                fetchDetail();
            } else {
                setFormState(initialFormState);
            }
            setMessage({});
        }
    }, [isOpen, mode, organizationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({});

        try {
            if (mode === 'create') {
                await adminService.createOrganization(formState.name, formState.description);
                onSuccess();
                onClose();
            } else if (mode === 'edit' && organizationId) {
                await adminService.updateOrganization(organizationId, formState.name, formState.description);
                onSuccess();
                setMessage({ success: '저장되었습니다.' });
            }
        } catch (error) {
            setMessage({ error: error instanceof Error ? error.message : '저장 실패' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {mode === 'create' ? '단체 등록' : '단체 수정'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {message.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{message.error}</div>}
                    {message.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{message.success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="단체명"
                            value={formState.name}
                            onChange={e => setFormState({ ...formState, name: e.target.value })}
                            required
                        />
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
                            <textarea
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                                rows={4}
                                value={formState.description}
                                onChange={e => setFormState({ ...formState, description: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={onClose} className="mr-2" type="button">취소</Button>
                            <Button type="submit" loading={loading}>
                                {mode === 'create' ? '등록' : '저장'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
