import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './App.css';
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { TimeTableWithPlaylist, parseTimeTable } from './timetable';
import PlaylistElement from './PlaylistElement';


// Returns all playlists for the current user
async function getAllPlaylistsForCurrentUser(sdk: SpotifyApi): Promise<SimplifiedPlaylist[]> {
    let playlists: SimplifiedPlaylist[] = [];

    while (true) {
        const response = await sdk.currentUser.playlists.playlists(50, playlists.length);
        playlists = playlists.concat(response.items);

        if (!response.next) {
            break;
        }
    }

    return playlists;
}

// Returns all playlists for the current user that have a timetable in their description
async function getAllPlaylistsWithTimeTable(sdk: SpotifyApi): Promise<TimeTableWithPlaylist[]> {
    const playlists = await getAllPlaylistsForCurrentUser(sdk);

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

export default function UserPlaylistSelection({ sdk }: { sdk: SpotifyApi | null }) {
    const [searchParams] = useSearchParams();
    const playlistId = searchParams.get('playlist');

    const [timeTableWithPlaylistState, setTimeTableWithPlaylistState] = useState<TimeTableWithPlaylist[]>([]);
    useEffect(() => {
        (async () => {
            if (sdk && !playlistId) {
                const playlists = await getAllPlaylistsWithTimeTable(sdk);
                setTimeTableWithPlaylistState(playlists);
            }
        })();
    }, [sdk, playlistId]);

    if (playlistId) {
        return (
            <Link
                to={{
                    search: '',
                }}
            >
                Back to playlist selection
            </Link>
        );
    } else {
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
}
