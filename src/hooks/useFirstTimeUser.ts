
import { useState, useEffect } from 'react';

const TOOLTIP_STORAGE_KEY = 'hasSeenNextButtonTooltip_v1';

export function useFirstTimeUser() {
    const [showNextButtonTooltip, setShowNextButtonTooltip] = useState(false);

    useEffect(() => {
        const hasSeenTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);
        if (!hasSeenTooltip) {
            setShowNextButtonTooltip(true);
        }
    }, []);

    const markTooltipAsSeen = () => {
        if (showNextButtonTooltip) {
            localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
            setShowNextButtonTooltip(false);
        }
    };

    return { showNextButtonTooltip, markTooltipAsSeen };
}
