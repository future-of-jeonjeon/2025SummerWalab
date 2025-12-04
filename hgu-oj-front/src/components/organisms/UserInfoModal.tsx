import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { userService, DEPARTMENTS, UserDetail } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';

interface UserInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: UserDetail | null;
    onSuccess: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({
    isOpen,
    onClose,
    initialData,
    onSuccess,
}) => {
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        realName: '',
        studentId: '',
        department: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                realName: initialData.name,
                studentId: initialData.student_id,
                department: DEPARTMENTS[initialData.major_id] || '',
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const majorId = DEPARTMENTS.indexOf(formData.department);
            if (majorId === -1) {
                throw new Error('학부를 선택해주세요.');
            }

            await userService.updateUserData({
                user_id: user.id,
                name: formData.realName,
                student_id: formData.studentId,
                major_id: majorId,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update user info:', err);
            setError(err.response?.data?.message || err.message || '정보 수정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block w-full overflow-hidden text-left align-bottom transition-all transform bg-white shadow-2xl rounded-2xl sm:my-8 sm:align-middle sm:max-w-lg">
                    <div className="px-4 pt-5 pb-4 bg-white sm:p-8">
                        <div className="sm:flex sm:items-start">
                            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                                <h3 className="text-2xl font-bold leading-6 text-gray-900" id="modal-title">
                                    정보 수정
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    최신 정보를 입력해주세요.
                                </p>
                                <div className="mt-6">
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {error && (
                                            <div className="px-4 py-3 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">
                                                {error}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">이름 (실명)</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.realName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, realName: e.target.value }))}
                                                className="w-full px-4 py-2.5 mt-1 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                                                placeholder="홍길동"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">학번</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.studentId}
                                                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                                                className="w-full px-4 py-2.5 mt-1 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                                                placeholder="22000000"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">학부 (전공)</label>
                                            <div className="relative mt-1">
                                                <select
                                                    required
                                                    value={formData.department}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                                    className="block w-full py-2.5 pl-4 pr-10 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-200 appearance-none"
                                                >
                                                    <option value="" disabled>학부를 선택해주세요</option>
                                                    {DEPARTMENTS.map((dept) => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                    <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 space-x-3">
                                            <Button type="button" variant="outline" onClick={onClose} className="px-5">
                                                취소
                                            </Button>
                                            <Button type="submit" disabled={loading} className="px-5">
                                                {loading ? '저장 중...' : '저장'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
