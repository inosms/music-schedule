import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

export class Schedule {
    private minutesPerSlot: number[];
    private songsPerSlot: number[];

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

        // the slots may not add up to more than 24 hours
        const totalMinutes = minutesPerSlot.reduce((a, b) => a + b, 0);
        if (totalMinutes > 24 * 60) {
            return null;
        }

        return { minutesPerSlot, songsPerSlot };
    }

    // Returns the number of minutes per slot for a given day.
    // The last slot is padded with the remaining minutes so that the total is 24 hours.
    getSlotsForOneDay(): number[] {
        const slots = [...this.minutesPerSlot];
        const totalMinutes = slots.reduce((a, b) => a + b, 0);
        const remainingMinutes = 24 * 60 - totalMinutes;
        if (remainingMinutes > 0) {
            slots.push(remainingMinutes);
        }
        return slots;
    }
}

export class PlaylistWithSchedule {
    private playlistId: string;
    private tracks: PlaylistedTrack[];
    private schedule: Schedule;

    constructor(playlistId: string, tracks: PlaylistedTrack[], schedule: Schedule) {
        this.playlistId = playlistId;
        this.tracks = tracks;
        this.schedule = schedule;
    }

    getSchedule(): Schedule {
        return this.schedule;
    }
}