import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useEffect, useState } from 'react';
import { PlaylistWithSchedule, Schedule } from '../schedule';
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

async function updatePlaylistSchedule(spotify: SpotifyApi, playlistId: string, schedule: Schedule) {
    const playlist = await spotify.playlists.getPlaylist(playlistId);
    const oldDescription = playlist.description;
    const newDescription = Schedule.removeScheduleFromString(oldDescription) + " " + schedule.toString();
    console.debug("new description: ", newDescription);
    await spotify.playlists.changePlaylistDetails(playlistId, {
        description: newDescription,
    });
}

export default function ScheduleContainer({ spotify, playlistId }: { spotify: SpotifyApi | null, playlistId: string }) {
    const [playlistWithSchedule, setPlaylistWithSchedule] = useState<PlaylistWithSchedule | null>(null);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlistWithSchedule = await getPlaylistWithAllTracks(spotify, playlistId);
                setPlaylistWithSchedule(playlistWithSchedule);
            }
        })();
    }, [spotify, playlistId]);

    return (
        <div>
            {playlistId}
            {
                playlistWithSchedule?.getSlotsWithTracks()?.map((slot, index) => {
                    return (
                        <ScheduleSlot
                            key={slot.getStartTimeMinutes()}
                            slot={slot}
                            spotify={spotify}
                            syncing={true}
                            nextSlotLength={playlistWithSchedule.getSchedule().getSlotsLengthsForOneDay().at(index + 1) || 0}
                            setLength={(length) => {
                                let schedule = playlistWithSchedule.getSchedule();
                                let newSchedule = schedule.resizeSlotLengthAt(index, length);
                                let newPlaylist = playlistWithSchedule.newWithSchedule(newSchedule);
                                setPlaylistWithSchedule(newPlaylist);
                                console.debug("new playlist schedule: ", newPlaylist);

                                if (spotify) {
                                    updatePlaylistSchedule(spotify, playlistId, newSchedule);
                                }
                            }}
                        />
                    );
                })
            }
        </div>
    );
}