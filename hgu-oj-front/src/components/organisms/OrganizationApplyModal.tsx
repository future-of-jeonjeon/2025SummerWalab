import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { Button } from '../atoms/Button';
import { OrganizationApplicationPayload } from '../../types';

interface OrganizationApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OrganizationApplyModal: React.FC<OrganizationApplyModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState<OrganizationApplicationPayload>({
        name: '',
        description: '',
        img_url: '',
    });
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: organizationService.createApply,
        onSuccess: () => {
            alert('단체 신청이 완료되었습니다. 관리자 승인 후 생성됩니다.');
            onClose();
            // Reset form
            setFormData({ name: '', description: '', img_url: '' });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || err.message || '신청 중 오류가 발생했습니다.');
        }
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('단체 이름을 입력해주세요.');
            return;
        }
        if (!formData.description.trim()) {
            setError('단체 설명을 입력해주세요.');
            return;
        }

        mutation.mutate(formData);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 h-screen w-screen overflow-hidden">
            <div
                className="bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden relative border border-gray-100 dark:border-slate-700 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-4 border-b border-gray-50 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">단체 창설 신청</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        활동하고자 하는 단체의 정보를 입력해주세요. 관리자 승인 후 단체가 생성됩니다.
                    </p>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">단체 이름</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-3.5 text-[15px] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                placeholder="예: 한동대학교 알고리즘 학회"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">단체 설명</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-3.5 text-[15px] focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                placeholder="단체의 성격과 목적을 간단히 설명해주세요."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">로고 이미지 URL (선택)</label>
                            <input
                                type="text"
                                value={formData.img_url || ''}
                                onChange={(e) => setFormData({ ...formData, img_url: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-3.5 text-[15px] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-[15px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <Button
                            type="submit"
                            loading={mutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-3 shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-95 transition-all text-[15px] font-bold"
                        >
                            신청하기
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
