import { useEffect, useState } from 'react';
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { TimeTableWithPlaylist, parseTimeTable } from '../timetable';
import PlaylistElement from './PlaylistElement';


// Returns all playlists for the current user
async function getAllPlaylistsForCurrentUser(spotify: SpotifyApi): Promise<SimplifiedPlaylist[]> {
    let playlists: SimplifiedPlaylist[] = [];

    while (true) {
        const response = await spotify.currentUser.playlists.playlists(50, playlists.length);
        playlists = playlists.concat(response.items);

        if (!response.next) {
            break;
        }
    }

    return playlists;
}

// Returns all playlists for the current user that have a timetable in their description
async function getAllPlaylistsWithTimeTable(spotify: SpotifyApi): Promise<TimeTableWithPlaylist[]> {
    const playlists = await getAllPlaylistsForCurrentUser(spotify);

    // Of all the playlists the user has, only keep the ones that have a timetable in their description
    const timeTableWithPlaylists = playlists.flatMap((playlist) => {
        const timeTable = parseTimeTable(playlist.description);

        if (timeTable) {
            return [{ timeTable, playlist } as unknown as TimeTableWithPlaylist];
        }
        return [];
    });

    return timeTableWithPlaylists;
}

export default function UserPlaylistSelection({ spotify }: { spotify: SpotifyApi | null }) {
    const [timeTableWithPlaylistState, setTimeTableWithPlaylistState] = useState<TimeTableWithPlaylist[]>([]);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlists = await getAllPlaylistsWithTimeTable(spotify);
                setTimeTableWithPlaylistState(playlists);
            }
        })();
    }, [spotify]);

    return (
        <div>
            {
                timeTableWithPlaylistState.map((timeTableWithPlaylist) => {
                    return (
                        <PlaylistElement key={timeTableWithPlaylist.playlist.id} timeTableWithPlaylist={timeTableWithPlaylist} />
                    );
                })
            }
        </div>
    );
}
