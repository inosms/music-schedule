import { Playlist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useEffect, useState } from 'react';
import { PlaylistWithSchedule, Schedule, SlotWithTracks } from '../schedule';
import ScheduleSlot from './ScheduleSlot';

async function getPlaylistWithAllTracks(spotify: SpotifyApi, playlistId: string): Promise<PlaylistWithSchedule | null> {
    const playlist = await spotify.playlists.getPlaylist(playlistId);

    // A playlist might contain more tracks than the API returns
    // so we need to fetch all tracks
    let tracks = playlist.tracks.items;
    let next = playlist.tracks.next;
    while (next) {
        const response = await spotify.playlists.getPlaylistItems(playlistId, undefined, undefined, 50, playlist.tracks.items.length);
        tracks = tracks.concat(response.items);
        next = response.next;
    }

    const timeTable = Schedule.fromString(playlist.description);
    if (timeTable === null) {
        return null;
    }

    return new PlaylistWithSchedule(playlist.id, tracks, timeTable);
}

export default function ScheduleContainer({ spotify, playlistId }: { spotify: SpotifyApi | null, playlistId: string }) {
    const [slots, setSlots] = useState<SlotWithTracks[]>([]);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlist = await getPlaylistWithAllTracks(spotify, playlistId);
                setSlots(playlist?.getSlotsWithTracks() ?? []);
            }
        })();
    }, [spotify, playlistId]);

    return (
        <div>
            {playlistId}
            {
                slots.map((slot) => {
                    return (
                        <ScheduleSlot key={slot.getStartTimeMinutes()} slot={slot} spotify={spotify} />
                    );
                })
            }
        </div>
    );
}