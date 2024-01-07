import { useState } from "react";
import "./SlotTime.css";

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

export function SlotTime({ time, setTime, minTime, maxTime, onRemove }: { time: number, setTime: (time: number) => void, minTime: number, maxTime: number, onRemove?: () => void }) {
    const [timeState, setTimeState] = useState(minutesToTimeString(time));
    const [timeStateValid, setTimeStateValid] = useState(true);

    return (
        <div className="slot-time">
            <input
                style={{ borderColor: timeStateValid ? "black" : "red" }}
                type="text"
                value={timeState}
                onChange={(e) => {
                    setTimeState(e.target.value);

                    const newTime = parseTimeString(e.target.value);
                    if (newTime !== null && newTime >= minTime && newTime <= maxTime) {
                        setTimeStateValid(true);
                    } else {
                        setTimeStateValid(false);
                    }
                }}
                onBlur={() => {
                    const newTime = parseTimeString(timeState);
                    if (newTime && timeStateValid) {
                        setTime(newTime);
                    }
                }}
            />

            {onRemove ? <button className="removebutton" onClick={() => onRemove()}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
            </button> : null}
        </div>
    );
}