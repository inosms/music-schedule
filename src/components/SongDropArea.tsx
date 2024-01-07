import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";
import "./SongDropArea.css";
import { useDrop } from "react-dnd";

export function SongDropArea({ droppedSong }: { droppedSong: (id: string) => void }) {
    const [{ isOver }, drop] = useDrop({
        accept: "track",
        drop: ({ track }: { track: PlaylistedTrack }) => {
            console.debug("dropped item: ", track);
            droppedSong(track.track.id);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <div className={"drop-area" + (isOver ? " -over" : "")} ref={drop} />
    );
}