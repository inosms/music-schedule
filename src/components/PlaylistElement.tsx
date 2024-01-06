import { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk';
import { Link } from 'react-router-dom';

export default function PlaylistElement({ playlist }: { playlist: SimplifiedPlaylist }) {
    return (
        <div>
            <Link to={{ search: '?playlist=' + playlist.id, }}>
                {playlist.name} by {playlist.owner.display_name}
            </Link>
        </div>
    );
}