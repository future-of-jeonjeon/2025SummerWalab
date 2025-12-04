import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../atoms/Button';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    // Determine colors based on type
    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    iconBg: 'bg-green-100',
                    iconColor: 'text-green-600',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                };
            case 'error':
                return {
                    iconBg: 'bg-red-100',
                    iconColor: 'text-red-600',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ),
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                };
            default:
                return {
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    icon: (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                };
        }
    };

    const { iconBg, iconColor, icon } = getTypeStyles();

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
            <div
                className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                            <div className={iconColor}>{icon}</div>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            {title && (
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {title}
                                </h3>
                            )}
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button
                        variant="primary"
                        onClick={onClose}
                        className="w-full sm:w-auto sm:ml-3"
                    >
                        확인
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
