import { Link } from 'react-router-dom';
import { TimeTableWithPlaylist } from "../timetable";

export default function PlaylistElement({ timeTableWithPlaylist }: { timeTableWithPlaylist: TimeTableWithPlaylist }) {
    return (
        <div>
            <Link to={{ search: '?playlist=' + timeTableWithPlaylist.playlist.id, }}>
                {timeTableWithPlaylist.playlist.name} by {timeTableWithPlaylist.playlist.owner.display_name}
            </Link>
        </div>
    );
}