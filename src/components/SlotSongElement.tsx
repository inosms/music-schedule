import "./SlotSongElement.css"
import { PlaylistedTrack } from "@spotify/web-api-ts-sdk";

function msToMinutesAndSeconds(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

export function SlotSongElement({ track, onRemove }: { track: PlaylistedTrack, onRemove: () => void }) {
    return (
        <div className="song-element">
            <a className="name" href={track.track.external_urls.spotify}>
                {track.track.name}
            </a>
            <div className="duration">
                {msToMinutesAndSeconds(track.track.duration_ms)}
            </div>
            {/* <button onClick={() => onRemove()}>Remove</button> */}
        </div>
    );
}