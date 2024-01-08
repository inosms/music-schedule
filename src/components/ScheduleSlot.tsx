import "./ScheduleSlot.css";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { SlotWithTracks } from "../schedule";
import { useEffect, useState } from "react";
import { SlotTime } from "./SlotTime";
import { SlotSongElement } from "./SlotSongElement";
import { AddButton } from "./AddButton";
import { SongDropArea } from "./SongDropArea";

// Skip over the next N tracks in the queue
async function skipNTimes(spotify: SpotifyApi, elementsToSkip: number) {
    for (let i = 0; i < elementsToSkip; i++) {
        await spotify.player.skipToNext(""); // empty device id means current device
    }
}

// Skip until the next track in the queue is in the slot
async function skipUntilTrackInSlot(spotify: SpotifyApi, slot: SlotWithTracks) {
    const queue = await spotify.player.getUsersQueue();
    const indexOfQueuedTrackInSlot = queue.queue.findIndex((track) => slot.containsTrack(track.id));

    if (indexOfQueuedTrackInSlot !== -1) {
        await skipNTimes(spotify, indexOfQueuedTrackInSlot + 1);
    } else {
        console.error("Queue does not contain track in slot");
    }
}

// Modify the currently playing track and the queue of the player so that it plays a track in the slot.
// If it is already playing a track in the slot, it will do nothing.
// Returns the id of the track that is currently playing or null if no track is playing.
async function syncSlot(slot: SlotWithTracks, spotify: SpotifyApi): Promise<string | null> {
    const queue = await spotify.player.getUsersQueue();

    const currentTrack = queue.currently_playing?.id;
    const currentlyPlayingTrackInSlot = currentTrack && slot.containsTrack(currentTrack);

    const indexOfQueuedTrackInSlot = queue.queue.findIndex((track) => slot.containsTrack(track.id));
    const queueHasTrackInSlot = indexOfQueuedTrackInSlot !== -1;

    // Always make sure there is a track in the queue that is in the slot
    if (!queueHasTrackInSlot) {
        // We want to play tracks in order of the playlist
        const nextTrackInSlot = currentTrack && currentlyPlayingTrackInSlot ? slot.getTrackAfter(currentTrack) : slot.getTrackByIndex(0);
        if (nextTrackInSlot) {
            await spotify.player.addItemToPlaybackQueue(nextTrackInSlot.track.uri, ""); // empty device id means current device
        }
    }

    if (!currentlyPlayingTrackInSlot) {
        await skipUntilTrackInSlot(spotify, slot);
        return slot.getTrackByIndex(0)?.track.id || null;
    } else {
        return currentTrack;
    }
}

export default function ScheduleSlot(
    {
        spotify,
        slot,
        syncing,
        nextSlot,
        setLength,
        onRemoveTrack,
        onRemoveSlot,
        splitSlot,
        onDragAndDropTrack,
    }: {
        spotify: SpotifyApi | null,
        slot: SlotWithTracks,
        syncing: boolean,
        nextSlot: SlotWithTracks | null,
        setLength: (time: number) => void,
        onRemoveTrack: (uri: string, id: string) => void,
        onRemoveSlot: () => void,
        splitSlot: () => void,
        onDragAndDropTrack: (id: string, index: number) => void,
    }) {
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
    const [shouldPlayNow, setShouldPlayNow] = useState(false);
    const [nextSlotShouldPlayNow, setNextSlotShouldPlayNow] = useState(false);

    useEffect(() => {
        const checkIfPlaying = async () => {
            setShouldPlayNow(slot.shouldPlayNow() && syncing);
            setNextSlotShouldPlayNow((nextSlot?.shouldPlayNow() || false) && syncing);

            if (spotify && shouldPlayNow && !slot.isEmpty()) {
                const currentlyPlaying = await syncSlot(slot, spotify);
                setCurrentlyPlayingId(currentlyPlaying);
            } else {
                setCurrentlyPlayingId(null);
            }
        }
        const intervalId = setInterval(checkIfPlaying, 5000);
        checkIfPlaying(); // check immediately

        return () => clearInterval(intervalId);
    }, [syncing, slot, spotify, shouldPlayNow])

    return (
        <div>
            {slot.isFirstSlot() ?
                <div className="schedule-slot">
                    <div className="time-line">
                        <SlotTime
                            key={slot.getId() + "-top"}
                            time={slot.getStartTimeMinutes()}
                            setTime={(_time) => console.debug("can not set time of first slot")}
                            minTime={0}
                            maxTime={0}
                            onRemove={slot.isLastSlot() || slot.isFirstSlot() ? undefined : () => onRemoveSlot()}
                            isActive={shouldPlayNow}
                        />
                    </div>
                </div> : null}
            <div className="schedule-slot">
                <div className="time-line">
                    <div className={"separatorline" + (shouldPlayNow ? " -playing" : "")}></div>
                    <AddButton onAdd={() => splitSlot()} playing={shouldPlayNow} />
                    <div className={"separatorline" + (shouldPlayNow ? " -playing" : "")}></div>
                    <div className="bottom">
                        <SlotTime
                            key={slot.getId() + "-bottom"}
                            time={slot.getStartTimeMinutes() + slot.getLengthMinutes()}
                            setTime={(time) => setLength(time - slot.getStartTimeMinutes())}
                            minTime={slot.getStartTimeMinutes() + 1}
                            maxTime={slot.getStartTimeMinutes() + slot.getLengthMinutes() + (Math.max((nextSlot?.getLengthMinutes() || 0) - 1, 0))}
                            onRemove={slot.isLastSlot() ? undefined : () => onRemoveSlot()}
                            isActive={shouldPlayNow || nextSlotShouldPlayNow}
                        />
                    </div>
                </div>
                <div className="tracks">
                    <SongDropArea droppedSong={(track) => onDragAndDropTrack(track, 0)} key={slot.getId() + "-0-drop-area"} />
                    {slot.getTracks().map((track, index) => {
                        return (
                            <div key={`slot-song-${index}-${track.track.id}`}>
                                <SlotSongElement
                                    track={track}
                                    onRemove={() => onRemoveTrack(track.track.uri, track.track.id)}
                                    currentlyPlaying={track.track.id === currentlyPlayingId}
                                    syncing={syncing}
                                />
                                <SongDropArea droppedSong={(track) => onDragAndDropTrack(track, index + 1)} key={slot.getId() + "-" + (index + 1) + "-drop-area"} />
                            </div>
                        );
                    })}
                    {slot.isEmpty() ? <div className="empty">Empty</div> : null}
                </div>
            </div>
        </div>
    );
}