import { useEffect, useState } from 'react';
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import PlaylistElement from './PlaylistElement';
import { TimeTable } from '../timetable';

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

export default function UserPlaylistSelection({ spotify }: { spotify: SpotifyApi | null }) {
    const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlists = await getAllPlaylistsForCurrentUser(spotify);
                const playlistsWithTimeTable = playlists.filter((playlist) => TimeTable.hasTimeTable(playlist));
                setPlaylists(playlistsWithTimeTable);
            }
        })();
    }, [spotify]);

    return (
        <div>
            {
                playlists.map((playlist) => {
                    return (
                        <PlaylistElement key={playlist.id} playlist={playlist} />
                    );
                })
            }
        </div>
    );
}
