import React, { useEffect, useRef, useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';

interface ScheduleSendPopoverProps {
  onSchedule: (date: Date) => void;
  onClose: () => void;
}

const ScheduleSendPopover: React.FC<ScheduleSendPopoverProps> = ({ onSchedule, onClose }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    
    const getPresetDate = (dayOffset: number, hour: number): Date => {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        date.setHours(hour, 0, 0, 0);
        return date;
    };
    
    const handlePresetClick = (date: Date) => {
        onSchedule(date);
    };
    
    const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomDate(value);
        if (value) {
            onSchedule(new Date(value));
        }
    };
    
    const tomorrowMorning = getPresetDate(1, 8);
    const tomorrowAfternoon = getPresetDate(1, 13);
    
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (1 + 7 - nextMonday.getDay()) % 7);
    if (nextMonday < new Date()) { 
         nextMonday.setDate(nextMonday.getDate() + 7);
    }
    nextMonday.setHours(8, 0, 0, 0);

    const PresetButton: React.FC<{label: string, time: string, onClick: () => void}> = ({label, time, onClick}) => (
        <button onClick={onClick} className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span>{label}</span>
            <span className="text-gray-500">{time}</span>
        </button>
    );

    return (
        <div ref={popoverRef} className="absolute left-0 bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20">
            <div className="py-1">
                <p className="px-4 py-2 text-md font-semibold text-gray-800 dark:text-gray-100">Schedule send</p>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <PresetButton label="Tomorrow morning" time={tomorrowMorning.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} onClick={() => handlePresetClick(tomorrowMorning)} />
                <PresetButton label="Tomorrow afternoon" time={tomorrowAfternoon.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} onClick={() => handlePresetClick(tomorrowAfternoon)} />
                <PresetButton label="Monday morning" time={nextMonday.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} onClick={() => handlePresetClick(nextMonday)} />
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="p-2">
                    <label htmlFor="custom-date-time" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200">
                        <ClockIcon className="w-5 h-5" />
                        Pick date & time
                    </label>
                    <input
                        id="custom-date-time"
                        type="datetime-local"
                        value={customDate}
                        onChange={handleCustomDateChange}
                        className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                        min={new Date(new Date().getTime() + 5 * 60000).toISOString().slice(0, 16)} // 5 mins from now
                    />
                </div>
            </div>
        </div>
    );
};

export default ScheduleSendPopover;
