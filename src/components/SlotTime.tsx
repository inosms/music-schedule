import { useState } from "react";

function minutesToTimeString(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const minutesLeft = minutes % 60;
    return `${hours}:${minutesLeft < 10 ? '0' : ''}${minutesLeft}`;
}

function parseTimeString(timeString: string): number | null {
    const [hours, minutes] = timeString.split(":").map((s) => parseInt(s));
    if (isNaN(hours) || isNaN(minutes)) {
        return null;
    }
    return hours * 60 + minutes;
}

export function SlotTime({ time, setTime, minTime, maxTime }: { time: number, setTime: (time: number) => void, minTime: number, maxTime: number }) {
    const [timeState, setTimeState] = useState(minutesToTimeString(time));
    const [timeStateValid, setTimeStateValid] = useState(true);
    
    return (
        <div>
            <input
                style={{ borderColor: timeStateValid ? "black" : "red" }}
                type="text"
                value={timeState}
                onChange={(e) => {
                    setTimeState(e.target.value);

                    const newTime = parseTimeString(e.target.value);
                    if (newTime !== null && newTime >= minTime && newTime <= maxTime) {
                        setTime(newTime);
                        setTimeStateValid(true);
                    } else {
                        setTimeStateValid(false);
                    }
                }} />
        </div>
    );
}