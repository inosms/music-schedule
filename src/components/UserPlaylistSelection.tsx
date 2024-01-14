import "./UserPlaylistSelection.css";
import { useEffect, useState } from 'react';
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import PlaylistElement from './PlaylistElement';
import { Schedule } from '../schedule';

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

async function getCurrentUserName(spotify: SpotifyApi): Promise<string> {
    const user = await spotify.currentUser.profile();
    return user.display_name ?? user.id;
}

export default function UserPlaylistSelection({ spotify }: { spotify: SpotifyApi | null }) {
    const [playlistsWithSchedule, setPlaylistsWithSchedule] = useState<SimplifiedPlaylist[]>([]);
    const [playlistsWithoutSchedule, setPlaylistsWithoutSchedule] = useState<SimplifiedPlaylist[]>([]);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlists = await getAllPlaylistsForCurrentUser(spotify);
                const playlistsWithSchedule = playlists.filter((playlist) => Schedule.fromString(playlist.description) !== null);
                setPlaylistsWithSchedule(playlistsWithSchedule);
                
                const playlistsWithoutSchedule = playlists.filter((playlist) => Schedule.fromString(playlist.description) === null);
                setPlaylistsWithoutSchedule(playlistsWithoutSchedule);

                const currentUserName = await getCurrentUserName(spotify);
                setCurrentUserName(currentUserName);
            }
        })();
    }, [spotify]);

    return (
        <div className='playlist-selection-container'>
            {
                playlistsWithSchedule.map((playlist) => {
                    return (
                        <PlaylistElement key={playlist.id} playlist={playlist} hasSchedule={true} isOwn={currentUserName === playlist?.owner?.display_name} />
                    );
                })
            }
            {
                playlistsWithoutSchedule.map((playlist) => {
                    return (
                        <PlaylistElement key={playlist.id} playlist={playlist} hasSchedule={false} isOwn={currentUserName === playlist?.owner?.display_name} />
                    );
                })
            }
        </div>
    );
}
