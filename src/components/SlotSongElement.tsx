import { RemoveButton } from "./RemoveButton";
import "./SlotSongElement.css"
import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

function msToMinutesAndSeconds(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

export function SlotSongElement({ track, onRemove, currentlyPlaying }: { track: PlaylistedTrack, onRemove: () => void, currentlyPlaying: boolean }) {
    return (
        <div className="horizontal-container">
            <div className={"song-element" + (currentlyPlaying ? " -playing" : "")}>
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