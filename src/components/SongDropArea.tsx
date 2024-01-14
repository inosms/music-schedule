import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";
import "./SongDropArea.css";
import { useDrop } from "react-dnd";

export function SongDropArea({ droppedSong }: { droppedSong: (fromSlotIndex: number, fromTrackIndex: number) => void }) {
    const [{ isOver }, drop] = useDrop({
        accept: "track",
        drop: ({ track, slotIndex, indexInSlot }: { track: PlaylistedTrack, slotIndex: number, indexInSlot: number }) => {
            console.debug("dropped item: ", track, " in slot: ", slotIndex, " at index: ", indexInSlot);
            droppedSong(slotIndex, indexInSlot);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <div className={"drop-area" + (isOver ? " -over" : "")} ref={drop} />
    );
}