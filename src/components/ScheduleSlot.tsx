import "./ScheduleSlot.css";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { SlotWithTracks } from "../schedule";
import { useEffect } from "react";
import { SlotTime } from "./SlotTime";
import { SlotSongElement } from "./SlotSongElement";

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
async function syncSlot(slot: SlotWithTracks, spotify: SpotifyApi) {
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
    }
}

export default function ScheduleSlot({ spotify, slot, syncing, nextSlotLength, setLength, onRemoveTrack, onRemoveSlot }: { spotify: SpotifyApi | null, slot: SlotWithTracks, syncing: boolean, nextSlotLength: number, setLength: (time: number) => void, onRemoveTrack: (uri: string, id: string) => void, onRemoveSlot: () => void }) {
    useEffect(() => {
        const checkIfPlaying = async () => {
            if (spotify && syncing && slot.shouldPlayNow() && !slot.isEmpty()) {
                await syncSlot(slot, spotify);
            }
        }
        const intervalId = setInterval(checkIfPlaying, 30000);
        checkIfPlaying(); // check immediately

        return () => clearInterval(intervalId);
    }, [syncing, slot, spotify])

    return (
        <div className="schedule-slot">
            <div className="time-line">
                {slot.isFirstSlot() ?
                    <SlotTime
                        time={slot.getStartTimeMinutes()}
                        setTime={(_time) => console.debug("can not set time of first slot")}
                        minTime={0}
                        maxTime={0}
                        onRemove={slot.isLastSlot() ? undefined : () => onRemoveSlot()}
                    /> : null}
                <div className="separatorline" />
                <div className="bottom">
                    <SlotTime
                        time={slot.getStartTimeMinutes() + slot.getLengthMinutes()}
                        setTime={(time) => setLength(time - slot.getStartTimeMinutes())}
                        minTime={slot.getStartTimeMinutes() + 1}
                        maxTime={slot.getStartTimeMinutes() + slot.getLengthMinutes() + (Math.max(nextSlotLength - 1, 0))}
                        onRemove={slot.isLastSlot() ? undefined : () => onRemoveSlot()}
                    />
                </div>
            </div>
            <div className="tracks">
                {slot.getTracks().map((track, index) => {
                    return (
                        <SlotSongElement
                            key={`slot-song-${index}-${track.track.id}`}
                            track={track}
                            onRemove={() => onRemoveTrack(track.track.uri, track.track.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}