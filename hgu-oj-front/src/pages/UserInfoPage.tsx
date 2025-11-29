import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { userService, DEPARTMENTS } from '../services/userService';
import { useAuthStore } from '../stores/authStore';

const UserInfoPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        realName: '',
        studentId: '',
        department: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError('로그인이 필요합니다.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const majorId = DEPARTMENTS.indexOf(formData.department);
            if (majorId === -1) {
                throw new Error('학부를 선택해주세요.');
            }

            await userService.registerUserDetail({
                user_id: user.id,
                name: formData.realName,
                student_id: formData.studentId,
                major_id: majorId,
            });
            navigate('/');
        } catch (err: any) {
            console.error('Failed to save user info:', err);
            setError(err.response?.data?.message || err.message || '정보 저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        추가 정보 입력
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        서비스 이용을 위해 추가 정보를 입력해주세요.
                    </p>
                </div>

                <Card className="mt-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="realName" className="block text-sm font-medium text-gray-700">
                                이름 (실명)
                            </label>
                            <input
                                id="realName"
                                name="realName"
                                type="text"
                                required
                                value={formData.realName}
                                onChange={handleChange}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="홍길동"
                            />
                        </div>

                        <div>
                            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                                학번
                            </label>
                            <input
                                id="studentId"
                                name="studentId"
                                type="text"
                                required
                                value={formData.studentId}
                                onChange={handleChange}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="22000000"
                            />
                        </div>

                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                                학부 (전공)
                            </label>
                            <select
                                id="department"
                                name="department"
                                required
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="" disabled>
                                    학부를 선택해주세요
                                </option>
                                {DEPARTMENTS.map((dept) => (
                                    <option key={dept} value={dept}>
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? '저장 중...' : '저장하기'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default UserInfoPage;
