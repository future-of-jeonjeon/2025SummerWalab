import React, { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    headingClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultOpen = true,
    className = '',
    headingClassName = '',
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section className={`mb-6 ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-2 text-left group"
            >
                <h2 className={`text-lg font-semibold ${headingClassName}`}>{title}</h2>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-500 group-hover:text-gray-700 dark:text-slate-400 dark:group-hover:text-slate-200"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="pt-2 pb-4">
                    {children}
                </div>
            </div>
        </section>
    );
};
