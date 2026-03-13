import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { uploadService } from '../../services/uploadService';
import { Button } from '../atoms/Button';
import { OrganizationPayload } from '../../types';

interface OrganizationApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OrganizationApplyModal: React.FC<OrganizationApplyModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState<OrganizationPayload>({
        name: '',
        description: '',
        img_url: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const mutation = useMutation({
        mutationFn: organizationService.create,
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

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('로고 이미지는 2MB 이하여야 합니다.');
            e.target.value = '';
            return;
        }

        setUploadingLogo(true);
        setError(null);
        try {
            const url = await uploadService.uploadImage(file);
            setFormData(prev => ({ ...prev, img_url: url }));
        } catch (err: any) {
            setError(err.message || '이미지 업로드에 실패했습니다.');
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
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
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">로고 이미지 (선택)</label>

                            {formData.img_url ? (
                                <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
                                    <img src={formData.img_url} alt="Logo preview" className="w-full h-full object-cover bg-white" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, img_url: '' })}
                                            className="text-white text-xs font-bold px-3 py-1.5 bg-red-500/80 rounded-lg hover:bg-red-500 transition"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer">
                                    {uploadingLogo ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium text-blue-500">업로드 중...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">클릭하여 이미지 업로드 (최대 2MB)</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg, image/gif"
                                        onChange={handleLogoSelect}
                                        disabled={uploadingLogo}
                                    />
                                </label>
                            )}
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
