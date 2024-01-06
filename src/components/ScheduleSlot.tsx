import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { SlotWithTracks } from "../schedule";
import { useEffect } from "react";

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
        const currentTrackLengthSec = (queue.currently_playing?.duration_ms || 0) / 1000;

        // For songs that are almost finished we will just let them finish
        if (currentTrackLengthSec < 180) {
            console.debug("Will let current track finish: ", queue.currently_playing?.name);
        }
        else {
            await skipUntilTrackInSlot(spotify, slot);
        }
    }
}

export default function ScheduleSlot({ spotify, slot, syncing }: { spotify: SpotifyApi | null, slot: SlotWithTracks, syncing: boolean }) {
    useEffect(() => {
        const checkIfPlaying = async () => {
            if (spotify && syncing && slot.shouldPlayNow() && !slot.isEmpty()) {
                await syncSlot(slot, spotify);
            }
        }
        const intervalId = setInterval(checkIfPlaying, 30000);
        checkIfPlaying(); // check immediately

        return () => clearInterval(intervalId);
    }, [syncing])

    return (
        <div>
            {slot.getStartTimeMinutes()} - {slot.getStartTimeMinutes() + slot.getLengthMinutes()} minutes - {slot.getTracks().length} tracks -{slot.shouldPlayNow() ? 'playing' : ''}
        </div>
    );
}