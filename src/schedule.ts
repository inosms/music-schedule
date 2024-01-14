import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

const SPOTIFY_MAX_PLAYLIST_LENGTH = 10000;

export class Schedule {
    private minutesPerSlot: number[];
    private songsPerSlot: number[];

    constructor(minutesPerSlot: number[], songsPerSlot: number[]) {
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

        // The slots may not add up to more than 24 hours.
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
    private getSlotsLengthsForOneDay(): number[] {
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

    static defaultSchedule(): Schedule {
        return new Schedule([], []);
    }
}

export class ScheduledPlaylist {
    private id: string;
    private title: string;
    private slots: PlaylistSlot[];

    private constructor(id: string, title: string, slots: PlaylistSlot[]) {
        this.id = id;
        this.title = title;
        this.slots = slots;
    }

    static newFromSchedule(id: string, title: string, schedule: Schedule, tracks: PlaylistedTrack[]) {
        const slotsWithSongCount = schedule.getSlotsWithSongsForOneDay();
        const slots: PlaylistSlot[] = [];
        let currentTrack = 0;
        for (let i = 0; i < slotsWithSongCount.length; i++) {
            const slot = slotsWithSongCount[i];
            const startTimeMinutes = slot.startTimeMinutes;
            const lengthMinutes = slot.lengthMinutes;
            const songs = slot.songs;

            const tracksForSlot = tracks.slice(currentTrack, currentTrack + songs);
            currentTrack += songs;

            slots.push(new PlaylistSlot(startTimeMinutes, startTimeMinutes + lengthMinutes, tracksForSlot));
        }

        return new ScheduledPlaylist(id, title, slots);
    }

    private newWithSlots(slots: PlaylistSlot[]): ScheduledPlaylist {
        const schedule = ScheduledPlaylist.getScheduleFromSlots(slots);
        const tracks = slots.flatMap((slot) => slot.getTracks());
        return ScheduledPlaylist.newFromSchedule(this.id, this.title, schedule, tracks);
    }

    // Splits the slot at the given index in two of equal length.
    // If the split fails (out of bounds, slot too short), the original playlist is returned.
    splitSlot(slotIndex: number): ScheduledPlaylist {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return this;
        }

        const splitSlot = this.slots[slotIndex].splitSlot();
        let newSlots = [...this.slots];
        newSlots.splice(slotIndex, 1, ...splitSlot);

        return this.newWithSlots(newSlots);
    }

    // Resizes the slot at the given index to the given length.
    // If the resize fails (out of bounds, slot too short), the original playlist is returned.
    // The total length of the slots may not be or exceed 24 hours.
    resizeSlot(slotIndex: number, newLengthMinutes: number): ScheduledPlaylist {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return this;
        }

        const slot = this.slots[slotIndex];
        const newSlot = slot.resizeSlot(newLengthMinutes);
        if (!newSlot) {
            return this;
        }
        let newSlots = [...this.slots];
        newSlots.splice(slotIndex, 1, newSlot);

        // When resizing a slot, the next slot needs to be adjusted to start at the end of the resized slot.
        // This only works if the next slot is not the last slot.
        if (slotIndex < newSlots.length - 1) {
            const nextSlot = newSlots[slotIndex + 1];
            const newNextSlot = nextSlot.newWithStartTime(newSlot.getEndTime());
            newSlots.splice(slotIndex + 1, 1, newNextSlot);
        }

        return this.newWithSlots(newSlots);
    }

    // Removes the slot at the given index.
    // Adds the tracks from the removed slot to the next slot.
    removeSlot(slotIndex: number): ScheduledPlaylist {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return this;
        }

        let newSlots = [...this.slots];
        const removedSlot = newSlots.splice(slotIndex, 1)[0];

        // When removing a slot, the slot is effectively merged with the next slot.
        // For merging the slots, the tracks from the removed slot are added to the next slot.
        // Also the start time of the next slot is changed to the start time of the removed slot.
        const nextSlot = newSlots[slotIndex];
        let newNextSlot = nextSlot.newWithStartTime(removedSlot.getStartTime());
        newNextSlot = newNextSlot.newWithTracks([...removedSlot.getTracks(), ...nextSlot.getTracks()]);
        newSlots.splice(slotIndex, 1, newNextSlot);

        return this.newWithSlots(newSlots);
    }

    // Removes the track at the given index in the given slot.
    removeTrack(slotIndex: number, trackIndex: number): ScheduledPlaylist {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return this;
        }

        const newSlot = this.slots[slotIndex].removeTrack(trackIndex);
        let newSlots = [...this.slots];
        newSlots.splice(slotIndex, 1, newSlot);

        return this.newWithSlots(newSlots);
    }

    // Moves the track at the given index in the given slot to the given index in the given slot.
    moveTrack(fromSlotIndex: number, fromTrackIndex: number, toSlotIndex: number, toTrackIndex: number): ScheduledPlaylist {
        if (fromSlotIndex < 0 || fromSlotIndex >= this.slots.length || toSlotIndex < 0 || toSlotIndex >= this.slots.length) {
            return this;
        }

        const fromSlot = this.slots[fromSlotIndex];
        const toSlot = this.slots[toSlotIndex];

        if (fromSlotIndex === toSlotIndex) {
            if (fromTrackIndex < toTrackIndex) {
                toTrackIndex--;
            }

            const fromTrack = fromSlot.getTrackByIndex(fromTrackIndex);
            if (!fromTrack) {
                return this;
            }

            const newSlot = fromSlot
                .removeTrack(fromTrackIndex)
                .addTrack(toTrackIndex, fromTrack);
            let newSlots = [...this.slots];
            newSlots.splice(fromSlotIndex, 1, newSlot);

            return this.newWithSlots(newSlots);
        } else {
            const fromTrack = fromSlot.getTrackByIndex(fromTrackIndex);
            if (!fromTrack) {
                return this;
            }

            const newFromSlot = fromSlot.removeTrack(fromTrackIndex);
            const newToSlot = toSlot.addTrack(toTrackIndex, fromTrack);

            let newSlots = [...this.slots];
            newSlots.splice(fromSlotIndex, 1, newFromSlot);
            newSlots.splice(toSlotIndex, 1, newToSlot);

            return this.newWithSlots(newSlots);
        }
    }

    getSlots(): PlaylistSlot[] {
        return this.slots;
    }

    getTitle(): string {
        return this.title;
    }

    getId(): string {
        return this.id;
    }

    getTracks(): PlaylistedTrack[] {
        return this.slots.flatMap((slot) => slot.getTracks());
    }

    getSchedule(): Schedule {
        return ScheduledPlaylist.getScheduleFromSlots(this.slots);
    }

    private static getScheduleFromSlots(slots: PlaylistSlot[]): Schedule {
        const minutesPerSlot = slots.map((slot) => slot.getEndTime() - slot.getStartTime());
        const songsPerSlot = slots.map((slot) => slot.count());

        return new Schedule(minutesPerSlot, songsPerSlot);
    }
}

export class PlaylistSlot {
    private startTime: number;
    private endTime: number;
    private tracks: PlaylistedTrack[];

    constructor(startTime: number, endTime: number, tracks: PlaylistedTrack[]) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.tracks = tracks;
    }

    // Returns a new slot with the given tracks.
    newWithTracks(tracks: PlaylistedTrack[]): PlaylistSlot {
        return new PlaylistSlot(this.startTime, this.endTime, tracks);
    }

    newWithStartTime(startTime: number): PlaylistSlot {
        return new PlaylistSlot(startTime, this.endTime, this.tracks);
    }

    // Splits the given slot in two of equal length. 
    // If the slot is only one minute long, it is not split.
    splitSlot(): PlaylistSlot[] {
        const length = this.endTime - this.startTime;
        if (length <= 1) {
            return [this];
        }

        const halfLength = Math.floor(length / 2);
        const remainder = length % 2;

        const firstTracks = this.tracks.slice(0, Math.floor(this.tracks.length / 2));
        const secondTracks = this.tracks.slice(Math.floor(this.tracks.length / 2));

        const firstSlot = new PlaylistSlot(this.startTime, this.startTime + halfLength + remainder, firstTracks);
        const secondSlot = new PlaylistSlot(this.startTime + halfLength + remainder, this.endTime, secondTracks);

        return [firstSlot, secondSlot];
    }

    // Resizes the slot to the given length.
    // A slot can not be 24 hours long or shorter than 1 minute.
    // The size is rounded to the nearest minute.
    resizeSlot(newLengthMinutes: number): PlaylistSlot | null {
        const newLength = Math.round(newLengthMinutes);
        if (newLength < 1 || newLength > 24 * 60) {
            return null;
        }

        const newEndTime = this.startTime + newLength;
        return new PlaylistSlot(this.startTime, newEndTime, this.tracks);
    }

    // Returns the count of tracks in this slot.
    count(): number {
        return this.tracks.length;
    }

    // Removes the track at the given index.
    // If the index is out of bounds, the original slot is returned.
    removeTrack(index: number): PlaylistSlot {
        if (index < 0 || index >= this.tracks.length) {
            return this;
        }

        const newTracks = [...this.tracks];
        newTracks.splice(index, 1);

        return new PlaylistSlot(this.startTime, this.endTime, newTracks);
    }

    // Adds the given track at the given index.
    // If the index is out of bounds, the original slot is returned.
    addTrack(index: number, track: PlaylistedTrack): PlaylistSlot {
        if (index < 0 || index > this.tracks.length) {
            return this;
        }

        const newTracks = [...this.tracks];
        newTracks.splice(index, 0, track);

        return new PlaylistSlot(this.startTime, this.endTime, newTracks);
    }

    // Returns the track at the given index or null if the index is out of bounds.
    getTrackByIndex(index: number): PlaylistedTrack | null {
        if (index < 0 || index >= this.tracks.length) {
            return null;
        }

        return this.tracks[index];
    }

    isEmpty(): boolean {
        return this.count() === 0;
    }

    getStartTime(): number {
        return this.startTime;
    }

    getEndTime(): number {
        return this.endTime;
    }

    getLength(): number {
        return this.endTime - this.startTime;
    }

    getTracks(): PlaylistedTrack[] {
        return this.tracks;
    }

    // Returns whether this slot is the first slot of the day.
    isFirstSlot(): boolean {
        return this.startTime === 0;
    }

    // Returns whether this slot is the last slot of the day.
    isLastSlot(): boolean {
        return this.endTime === 24 * 60;
    }

    id(): string {
        return `id-${this.startTime}-${this.endTime}-${this.tracks.map((track) => track.track.id).join('-')}`;
    }

    shouldPlayNow(): boolean {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        return nowMinutes >= this.startTime && nowMinutes < this.endTime;
    }

    containsUri(uri: string): boolean {
        return this.tracks.some((track) => track.track.uri === uri);
    }

    getTrackAfterUri(uri: string): PlaylistedTrack | null {
        const index = this.tracks.findIndex((track) => track.track.uri === uri);
        if (index < 0 || index >= this.tracks.length - 1) {
            return null;
        }

        return this.tracks[(index + 1) % this.tracks.length];
    }
}