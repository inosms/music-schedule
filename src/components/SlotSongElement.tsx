import { useDrag } from "react-dnd";
import { RemoveButton } from "./RemoveButton";
import "./SlotSongElement.css"
import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

function msToMinutesAndSeconds(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

export function SlotSongElement({ track, onRemove, currentlyPlaying, syncing, slotIndex, indexInSlot }: { track: PlaylistedTrack, onRemove: () => void, currentlyPlaying: boolean, syncing: boolean, slotIndex: number, indexInSlot: number }) {
    const [{isDragging}, drag] = useDrag({
        type: "track",
        item: { track, slotIndex, indexInSlot },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <div className="horizontal-container" ref={drag}>
            <div className={"song-element" + (currentlyPlaying && syncing ? " -playing" : "") + (isDragging ? " -dragging" : "")}>
                <div className="name">
                    {track.track.name}
                </div>
                <div className="duration">
                    {msToMinutesAndSeconds(track.track.duration_ms)}
                </div>
            </div>
            <RemoveButton onRemove={onRemove} />
        </div>
    );
}