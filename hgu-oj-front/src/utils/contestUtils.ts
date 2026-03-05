export type ContestRuleType = 'ACM' | 'OI';

export const contestRuleTypeOptions: { value: ContestRuleType; label: string }[] = [
    { value: 'ACM', label: 'ACM' },
    { value: 'OI', label: 'OI' },
];

export const formatDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);

    return parts.join(' ');
};
