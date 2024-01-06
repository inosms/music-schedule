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
    getSlotsLengthsForOneDay(): number[] {
        const slots = [...this.minutesPerSlot];
        const totalMinutes = slots.reduce((a, b) => a + b, 0);
        const remainingMinutes = 24 * 60 - totalMinutes;
        if (remainingMinutes > 0) {
            slots.push(remainingMinutes);
        }
        return slots;
    }

    // Returns the slots for a given day with the number of songs per slot.
    getSlotsWithSongsForOneDay(): { startTimeMinutes: number, lengthMinutes: number, songs: number }[] {
        const slotTimes = this.getSlotsLengthsForOneDay();

        const slotsWithSongs: { startTimeMinutes: number, lengthMinutes: number, songs: number }[] = [];
        let startTimeMinutes = 0;

        for (let i = 0; i < slotTimes.length; i++) {
            const currentSlotLength = slotTimes[i];
            const currentSlotSongs = this.songsPerSlot[i] ?? 0;
            slotsWithSongs.push({ startTimeMinutes: startTimeMinutes, lengthMinutes: currentSlotLength, songs: currentSlotSongs });
            startTimeMinutes += currentSlotLength;
        }

        return slotsWithSongs;
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

    // Returns the slots for a given day with the tracks per slot.
    getSlotsWithTracks(): SlotWithTracks[] {
        const slotsWithSongs = this.schedule.getSlotsWithSongsForOneDay();

        const slotsWithTracks: SlotWithTracks[] = [];
        let currentTrack = 0;

        for (let i = 0; i < slotsWithSongs.length; i++) {
            const slot = slotsWithSongs[i];
            const startTimeMinutes = slot.startTimeMinutes;
            const lengthMinutes = slot.lengthMinutes;
            const songs = slot.songs;

            const tracksForSlot = this.tracks.slice(currentTrack, currentTrack + songs);
            currentTrack += songs;

            slotsWithTracks.push(new SlotWithTracks(startTimeMinutes, lengthMinutes, tracksForSlot));
        }

        return slotsWithTracks;
    }
}

export class SlotWithTracks {
    private startTimeMinutes: number;
    private lengthMinutes: number;
    private tracks: PlaylistedTrack[];

    constructor(startTimeMinutes: number, lengthMinutes: number, tracks: PlaylistedTrack[]) {
        this.startTimeMinutes = startTimeMinutes;
        this.lengthMinutes = lengthMinutes;
        this.tracks = tracks;
    }

    getStartTimeMinutes(): number {
        return this.startTimeMinutes;
    }

    getLengthMinutes(): number {
        return this.lengthMinutes;
    }

    getTracks(): PlaylistedTrack[] {
        return this.tracks;
    }
}