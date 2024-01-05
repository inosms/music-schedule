import { SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";

export interface TimeTable {
    minutesPerSlot: number[];
    songsPerSlot: number[];
}

export interface TimeTableWithPlaylist extends TimeTable {
    playlist: SimplifiedPlaylist;
}

// Parse a time table from a string. 
// A time table is of the form 
//  (mttv1|<number>*|<number>*)
// where <number> is a comma separated list of numbers.
// For example (mttv1|60,60,60,60,60|2,3,4,5,6) is a valid time table.
// 
// Returns null if the input is not a valid time table.
// If the input contains other characters than the time table, they are ignored.
// If the input contains multiple time tables, only the first one is returned.
export function parseTimeTable(input: string): TimeTable | null {
    const timeTableRegex = /\(mttv1\|([0-9]+(,[0-9]+)*)\|([0-9]+(,[0-9]+)*)\)/g;
    const match = timeTableRegex.exec(input);
    if (!match) {
        return null;
    }

    const minutesPerSlot = match[1].split(',').map((s) => parseInt(s));
    const songsPerSlot = match[3].split(',').map((s) => parseInt(s));

    return {
        minutesPerSlot,
        songsPerSlot,
    };
}