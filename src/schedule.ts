import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

export class Schedule {
    minutesPerSlot: number[];
    songsPerSlot: number[];

    private constructor(minutesPerSlot: number[], songsPerSlot: number[]) {
        this.minutesPerSlot = minutesPerSlot;
        this.songsPerSlot = songsPerSlot;
    }

    // Create a schedule from a string containing a schedule.
    // Returns null if the input is not a valid schedule.
    static fromString(input: string): Schedule | null {
        const timeTable = Schedule.parseScheduleV1String(input);
        if (!timeTable) {
            return null;
        }

        return new Schedule(timeTable.minutesPerSlot, timeTable.songsPerSlot);
    }

    // Parse a schedule from a string. 
    // A schedule is of the form 
    //  (msv1|<number>*|<number>*)
    // where <number> is a comma separated list of numbers.
    // For example (msv1|60,60,60,60,60|2,3,4,5,6) is a valid schedule.
    // 
    // Returns null if the input is not a valid schedule.
    // If the input contains other characters than the schedule, they are ignored.
    // If the input contains multiple schedules, only the first one is returned.
    private static parseScheduleV1String(description: string): { minutesPerSlot: number[], songsPerSlot: number[] } | null {
        const timeTableRegex = /\(msv1\|([0-9]+(,[0-9]+)*)\|([0-9]+(,[0-9]+)*)\)/g;
        const match = timeTableRegex.exec(description);
        if (!match) {
            return null;
        }

        const minutesPerSlot = match[1].split(',').map((s) => parseInt(s));
        const songsPerSlot = match[3].split(',').map((s) => parseInt(s));

        if (minutesPerSlot.length !== songsPerSlot.length) {
            return null;
        }

        return { minutesPerSlot, songsPerSlot };
    }
}

export class PlaylistWithSchedule {
    playlistId: string;
    tracks: PlaylistedTrack[];
    timeTable: Schedule;

    constructor(playlistId: string, tracks: PlaylistedTrack[], timeTable: Schedule) {
        this.playlistId = playlistId;
        this.tracks = tracks;
        this.timeTable = timeTable;
    }
}