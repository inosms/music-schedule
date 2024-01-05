import { TimeTableWithPlaylist } from "./timetable";

export default function PlaylistElement({ timeTableWithPlaylist }: { timeTableWithPlaylist: TimeTableWithPlaylist }) {
    return (
        <div>
            {timeTableWithPlaylist.playlist.name} by {timeTableWithPlaylist.playlist.owner.display_name}
        </div>
    );
}