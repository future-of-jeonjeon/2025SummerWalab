import React, { useState, useEffect } from 'react';

interface AvatarProps {
    src?: string | null;
    alt: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
};

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', className = '' }) => {
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
                className={`rounded-full object-cover border border-gray-200 ${sizeClasses[size]} ${className}`}
            />
        );
    }

    return (
        <div className={`rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold border border-indigo-50 ${sizeClasses[size]} ${className}`}>
            {alt.charAt(0).toUpperCase()}
        </div>
    );
};
