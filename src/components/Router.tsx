import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useSearchParams, Link } from 'react-router-dom';
import UserPlaylistSelection from './UserPlaylistSelection';

export default function Router({ spotify }: { spotify: SpotifyApi | null }) {
    const [searchParams] = useSearchParams();
    const playlistId = searchParams.get('playlist');

    if (playlistId) {
        return (
            <Link to={{ search: '' }}>Back</Link>
        );
    } else {
        return (
            <UserPlaylistSelection spotify={spotify} />
        );
    }
}