'use client';

interface TimerProps {
  deadline: number;
  className?: string;
}

import { useEffect, useState } from 'react';

export function Timer({ deadline, className = '' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = deadline - now;

      if (difference <= 0) {
        setTimeLeft('EXPIRED');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(difference / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className={`countdown-timer ${isExpired ? 'status-failed' : ''} ${className}`}>
      {timeLeft}
    </div>
  );
}