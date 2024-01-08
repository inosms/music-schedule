import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useSearchParams } from 'react-router-dom';
import UserPlaylistSelection from './UserPlaylistSelection';
import ScheduleContainer from './ScheduleContainer';

export default function Router({ spotify }: { spotify: SpotifyApi | null }) {
    const [searchParams] = useSearchParams();
    const playlistId = searchParams.get('playlist');

    if (playlistId) {
        return (
            <ScheduleContainer spotify={spotify} playlistId={playlistId} />
        );
    } else {
        return (
            <UserPlaylistSelection spotify={spotify} />
        );
    }
}