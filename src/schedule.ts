import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

const SPOTIFY_MAX_PLAYLIST_LENGTH = 10000;

export class Schedule {
    private minutesPerSlot: number[];
    private songsPerSlot: number[];

    private constructor(minutesPerSlot: number[], songsPerSlot: number[]) {
        this.minutesPerSlot = minutesPerSlot;
        this.songsPerSlot = songsPerSlot;

        // if the last slot goes until 24:00, remove it as we want to implicitly calculate it 
        // with the maximum number of songs per slot
        const totalMinutes = this.minutesPerSlot.reduce((a, b) => a + b, 0);
        if (totalMinutes === 24 * 60) {
            this.minutesPerSlot.pop();
            this.songsPerSlot.pop();
        }
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

    private static scheduleV1Regex = /\(msv1\|(([0-9]+,?)*)\|(([0-9]+,?)*)\)/;

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
        const match = Schedule.scheduleV1Regex.exec(description);
        if (!match) {
            return null;
        }

        const minutesPerSlot = match[1].split(',').map((s) => parseInt(s)).filter((n) => !isNaN(n));
        const songsPerSlot = match[3].split(',').map((s) => parseInt(s)).filter((n) => !isNaN(n));

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

    public static removeScheduleFromString(description: string): string {
        return description.replace(Schedule.scheduleV1Regex, '');
    }

    public toString(): string {
        const minutesPerSlot = this.minutesPerSlot.join(',');
        const songsPerSlot = this.songsPerSlot.join(',');
        return `(msv1|${minutesPerSlot}|${songsPerSlot})`;
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
            const currentSlotSongs = this.songsPerSlot[i] ?? SPOTIFY_MAX_PLAYLIST_LENGTH;
            slotsWithSongs.push({ startTimeMinutes: startTimeMinutes, lengthMinutes: currentSlotLength, songs: currentSlotSongs });
            startTimeMinutes += currentSlotLength;
        }

        return slotsWithSongs;
    }

    // Returns a new schedule with the slot at the given index resized to the given length.
    // The slots after the given slot are resized to keep the absolute time of the following slots the same.
    resizeSlotLengthAt(index: number, newLengthMinutes: number): Schedule {
        if (index < 0) {
            return this;
        }

        // Append new slots if the index is out of bounds.
        if (index >= this.minutesPerSlot.length) {
            return new Schedule([...this.minutesPerSlot, newLengthMinutes], [...this.songsPerSlot, 0]);
        }

        const newMinutesPerSlot = [...this.minutesPerSlot];
        const diff = newLengthMinutes - newMinutesPerSlot[index];
        newMinutesPerSlot[index] += diff;

        // Resize the next slot to keep the absolute time of the following slots the same.
        if (index < newMinutesPerSlot.length - 1) {
            newMinutesPerSlot[index + 1] -= diff;
        }

        return new Schedule(newMinutesPerSlot, this.songsPerSlot);
    }

    // Returns a new schedule with the slot at the given index resized to the given number of songs.
    // Other slots are not changed.
    resizeSongCountAt(index: number, newSongCount: number): Schedule {
        if (index < 0 || index >= this.songsPerSlot.length) {
            return this;
        }

        const newSongsPerSlot = [...this.songsPerSlot];
        newSongsPerSlot[index] = newSongCount;

        return new Schedule(this.minutesPerSlot, newSongsPerSlot);
    }

    // Removes a slot at the given index.
    // The songs and the time of the given slot will be moved to the next slot
    removeSlotAt(index: number): Schedule {
        if (index < 0 || index >= this.minutesPerSlot.length) {
            return this;
        }

        const newMinutesPerSlot = [...this.minutesPerSlot];
        const newSongsPerSlot = [...this.songsPerSlot];

        if (index < newMinutesPerSlot.length - 1) {
            newMinutesPerSlot[index + 1] += newMinutesPerSlot[index];
            newSongsPerSlot[index + 1] += newSongsPerSlot[index];
        }

        newMinutesPerSlot.splice(index, 1);
        newSongsPerSlot.splice(index, 1);

        return new Schedule(newMinutesPerSlot, newSongsPerSlot);
    }

    getSongCountAt(index: number): number {
        if (index < 0 || index >= this.songsPerSlot.length) {
            return 0;
        }

        return this.songsPerSlot[index];
    }


    // Returns a new schedule with the slot at the given index split in two.
    // All songs will be moved to the latter slot.
    splitSlotAt(index: number): Schedule {
        if (index < 0) {
            return this;
        }

        if (index >= this.minutesPerSlot.length) {
            const lastSlotLength = this.getSlotsLengthsForOneDay().pop() ?? 0;

            if (lastSlotLength === 0) {
                return this;
            }

            return new Schedule([...this.minutesPerSlot, lastSlotLength / 2], [...this.songsPerSlot, 0]);
        }

        const newMinutesPerSlot = [...this.minutesPerSlot];
        const newSongsPerSlot = [...this.songsPerSlot];

        const currentSlotLength = newMinutesPerSlot[index];
        const currentSlotSongs = newSongsPerSlot[index];

        newMinutesPerSlot[index] = currentSlotLength / 2;
        newSongsPerSlot[index] = 0;

        newMinutesPerSlot.splice(index + 1, 0, currentSlotLength / 2);
        newSongsPerSlot.splice(index + 1, 0, currentSlotSongs);

        return new Schedule(newMinutesPerSlot, newSongsPerSlot);
    }
}

export class PlaylistWithSchedule {
    private playlistId: string;
    private title: string;
    private tracks: PlaylistedTrack[];
    private schedule: Schedule;

    constructor(playlistId: string, tracks: PlaylistedTrack[], schedule: Schedule, title: string) {
        this.playlistId = playlistId;
        this.tracks = tracks;
        this.schedule = schedule;
        this.title = title;
    }

    newWithSchedule(schedule: Schedule): PlaylistWithSchedule {
        return new PlaylistWithSchedule(this.playlistId, this.tracks, schedule, this.title);
    }

    newWithTracks(tracks: PlaylistedTrack[]): PlaylistWithSchedule {
        return new PlaylistWithSchedule(this.playlistId, tracks, this.schedule, this.title);
    }

    getTracks(): PlaylistedTrack[] {
        return this.tracks;
    }

    getSchedule(): Schedule {
        return this.schedule;
    }

    getTitle(): string {
        return this.title;
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

    // Returns the slot index for the given track id or null if the track is not in the playlist.
    getSlotIndexByTrackId(trackId: string): number | null {
        const slots = this.getSlotsWithTracks();
        for (let i = 0; i < slots.length; i++) {
            if (slots[i].containsTrack(trackId)) {
                return i;
            }
        }

        return null;
    }

    // Returns the track index for the given track id or null if the track is not in the playlist.
    getIndexByTrackId(trackId: string): number | null {
        return this.tracks.findIndex((track) => track.track.id === trackId);
    }

    getTrackNumBeforeSlot(slotIndex: number): number {
        const slots = this.getSlotsWithTracks();
        let trackNum = 0;
        for (let i = 0; i < slotIndex; i++) {
            trackNum += slots[i].getTracks().length;
        }

        return trackNum;
    }
}

export class SlotWithTracks {
    private startTimeMinutes: number;
    private lengthMinutes: number;
    private tracks: PlaylistedTrack[];
    private id: string;

    constructor(startTimeMinutes: number, lengthMinutes: number, tracks: PlaylistedTrack[]) {
        this.startTimeMinutes = startTimeMinutes;
        this.lengthMinutes = lengthMinutes;
        this.tracks = tracks;
        this.id = `id-${startTimeMinutes}-${lengthMinutes}-${tracks.map((track) => track.track.id).join('-')}`;
    }

    getId(): string {
        return this.id;
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

    // Returns true when the slot should be played at the current time.
    shouldPlayNow(): boolean {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        return nowMinutes >= this.startTimeMinutes && nowMinutes < this.startTimeMinutes + this.lengthMinutes;
    }

    containsTrack(id: string): boolean {
        return this.tracks.some((track) => track.track.id === id);
    }

    // Returns the track with the given index or null if the index is out of bounds.
    getTrackByIndex(index: number): PlaylistedTrack | null {
        if (index < 0 || index >= this.tracks.length) {
            return null;
        }

        return this.tracks[index];
    }

    // Returns the track after the track with the given id or null if the track is not in this slot.
    // If the track is the last track in the slot, the first track is returned.
    getTrackAfter(id: string): PlaylistedTrack | null {
        const index = this.tracks.findIndex((track) => track.track.id === id);
        if (index === -1) {
            return null;
        }

        return this.tracks[(index + 1) % this.tracks.length];
    }

    // Returns whether this slot is empty.
    isEmpty(): boolean {
        return this.tracks.length === 0;
    }

    /// Returns whether this slot is the first slot of the day.
    isFirstSlot(): boolean {
        return this.startTimeMinutes === 0;
    }

    // Returns whether this slot is the last slot of the day.
    isLastSlot(): boolean {
        return this.startTimeMinutes + this.lengthMinutes === 24 * 60;
    }
}