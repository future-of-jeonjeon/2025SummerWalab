import React, { useState } from 'react';
import { contestService } from '../../../services/contestService';
import { Button } from '../../../components/atoms/Button';
import { CreateContestRequest, Contest } from '../../../types';

interface CreateContestModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: number;
    onSuccess: () => void;
    initialData?: Contest; // data from list is Contest
}

const SUPPORTED_LANGUAGES = ['C', 'C++', 'Java', 'Python3', 'JavaScript', 'Golang'];

export const CreateContestModal: React.FC<CreateContestModalProps> = ({
    isOpen, onClose, organizationId, onSuccess, initialData
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        rule_type: 'ACM', // Default, hidden
        password: '',
        visible: true,
        real_time_rank: true, // Default, hidden
        allowed_ip_ranges: '', // Comma separated string for input
        languages: SUPPORTED_LANGUAGES, // Default all
        access_scope: 'ALL', // Dummy data for now
        requires_approval: false,
        is_organization_only: false,
    });

    React.useEffect(() => {
        if (initialData) {
            // Convert ISO date string to datetime-local format (YYYY-MM-DDTHH:MM)
            const formatDateTime = (isoString: string) => {
                const date = new Date(isoString);
                // Adjust for timezone offset to display correct local time in input
                const offset = date.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
                return localISOTime;
            };

            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                start_time: initialData.startTime ? formatDateTime(initialData.startTime) : '',
                end_time: initialData.endTime ? formatDateTime(initialData.endTime) : '',
                rule_type: initialData.ruleType || 'ACM',
                password: '', // Password is not returned for security, user can set new one
                visible: initialData.visible ?? true,
                real_time_rank: initialData.realTimeRank ?? true,
                allowed_ip_ranges: '', // IP ranges might need to be fetched separately or handled if available
                languages: initialData.languages || SUPPORTED_LANGUAGES,
                access_scope: 'ALL',
                requires_approval: initialData.requiresApproval || false,
                is_organization_only: initialData.isOrganizationOnly || false,
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const dataToSubmit: CreateContestRequest = {
                title: formData.title,
                description: formData.description,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
                rule_type: formData.rule_type,
                password: formData.password || null,
                visible: true, // Hardcoded to true
                real_time_rank: formData.real_time_rank,
                allowed_ip_ranges: formData.allowed_ip_ranges ? formData.allowed_ip_ranges.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0) : [],
                requires_approval: formData.requires_approval,
                is_organization_only: formData.is_organization_only,
                languages: formData.languages,
                organization_id: organizationId,
            };

            if (initialData) {
                await contestService.update(initialData.id, dataToSubmit);
            } else {
                await contestService.create(dataToSubmit);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || (initialData ? '대회 수정에 실패했습니다.' : '대회 생성에 실패했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        setFormData(prev => {
            if (prev.languages.includes(lang)) {
                return { ...prev, languages: prev.languages.filter(l => l !== lang) };
            } else {
                return { ...prev, languages: [...prev.languages, lang] };
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-100">
                    <div className="bg-white px-8 pt-8 pb-6">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                <h3 className="text-2xl font-bold leading-6 text-gray-900 tracking-tight" id="modal-title">
                                    {initialData ? '대회 수정' : '새 대회 생성'}
                                </h3>


                                {error && (
                                    <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">대회 제목</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">시작 시간</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                                value={formData.start_time}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">종료 시간</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                                value={formData.end_time}
                                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">설명</label>
                                        <textarea
                                            rows={4}
                                            required
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors resize-none"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호 <span className="text-xs font-normal text-gray-400">(선택)</span></label>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <input
                                                id="is_organization_only"
                                                type="checkbox"
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                                                checked={formData.is_organization_only}
                                                onChange={e => setFormData({ ...formData, is_organization_only: e.target.checked })}
                                            />
                                            <label htmlFor="is_organization_only" className="ml-2 block text-sm font-medium text-gray-900 select-none cursor-pointer">
                                                단체 내부 전용 <span className="text-gray-500 font-normal">(외부인 불가)</span>
                                            </label>
                                        </div>

                                        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <input
                                                id="requires_approval"
                                                type="checkbox"
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                                                checked={formData.requires_approval}
                                                onChange={e => setFormData({ ...formData, requires_approval: e.target.checked })}
                                            />
                                            <label htmlFor="requires_approval" className="ml-2 block text-sm font-medium text-gray-900 select-none cursor-pointer">
                                                참가 승인 필요
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            허용 IP 범위 <span className="text-xs font-normal text-gray-400">(선택, 쉼표로 구분)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                            placeholder="예: 192.168.1.1/24, 10.0.0.1"
                                            value={formData.allowed_ip_ranges}
                                            onChange={e => setFormData({ ...formData, allowed_ip_ranges: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2.5">사용 언어</label>
                                        <div className="flex flex-wrap gap-2.5">
                                            {SUPPORTED_LANGUAGES.map(lang => (
                                                <label
                                                    key={lang}
                                                    className={`
                                                        inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all duration-200
                                                        ${formData.languages.includes(lang)
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={formData.languages.includes(lang)}
                                                        onChange={() => handleLanguageChange(lang)}
                                                    />
                                                    <span>{lang}</span>
                                                    {formData.languages.includes(lang) && (
                                                        <svg className="ml-1.5 w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50/80 px-8 py-5 sm:flex sm:flex-row-reverse border-t border-gray-100">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        >
                            {loading ? (initialData ? '수정 중...' : '생성 중...') : (initialData ? '수정하기' : '생성하기')}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        >
                            취소
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
