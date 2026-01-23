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
            {alt.charAt(0).toUpperCase()}
        </div>
    );
};
