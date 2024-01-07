import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

export function SlotSongElement({track, onRemove}: {track: PlaylistedTrack, onRemove: () => void}) {
    return (
        <div style={{paddingLeft: "20px", border: "1px solid black"}}>
            {track.track.name} by {track.track.duration_ms}
            <button onClick={() => onRemove()}>Remove</button>
        </div>
    );
}