import React, { useState, useEffect } from 'react';

interface OrganizationLogoProps {
    src?: string | null;
    alt: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
}

const sizeClasses = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-12 w-12 text-lg',
    md: 'h-16 w-16 text-xl',
    lg: 'h-20 w-20 text-2xl',
    xl: 'h-32 w-32 text-4xl',
    '2xl': 'h-40 w-40 text-5xl',
};

export const OrganizationLogo: React.FC<OrganizationLogoProps> = ({ src, alt, size = 'md', className = '' }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(src || null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setImgSrc(src || null);
        setError(false);
    }, [src]);

    const handleError = () => {
        setError(true);
    };

    if (imgSrc && !error) {
        return (
            <img
                src={imgSrc}
                alt={alt}
                onError={handleError}
                className={`object-contain rounded-xl bg-white p-1 border border-gray-100 shadow-sm ${sizeClasses[size]} ${className}`}
            />
        );
    }

    return (
        <div className={`rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-500 flex items-center justify-center font-bold shadow-sm border border-blue-50 ${sizeClasses[size]} ${className}`}>
            <svg className="w-1/2 h-1/2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        </div>
    );
};
