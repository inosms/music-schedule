import { Playlist, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";

export class TimeTable {
    minutesPerSlot: number[];
    songsPerSlot: number[];
    playlist: Playlist;

    private constructor(minutesPerSlot: number[], songsPerSlot: number[], playlist: Playlist) {
        this.minutesPerSlot = minutesPerSlot;
        this.songsPerSlot = songsPerSlot;
        this.playlist = playlist;
    }

    // Create a time table from a playlist.
    // Returns null if the playlist does not contain a valid time table.
    static fromPlaylist(playlist: Playlist): TimeTable | null {
        const timeTable = TimeTable.parseTimeTableString(playlist.description);
        if (!timeTable) {
            return null;
        }

        return new TimeTable(timeTable.minutesPerSlot, timeTable.songsPerSlot, playlist);
    }

    // Whether the playlist contains a valid time table.
    static hasTimeTable(simplifiedPlaylist: SimplifiedPlaylist): boolean {
        return TimeTable.parseTimeTableString(simplifiedPlaylist.description) !== null;
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
    private static parseTimeTableString(description: string): { minutesPerSlot: number[], songsPerSlot: number[] } | null {
        const timeTableRegex = /\(mttv1\|([0-9]+(,[0-9]+)*)\|([0-9]+(,[0-9]+)*)\)/g;
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
