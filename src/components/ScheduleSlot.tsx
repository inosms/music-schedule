import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { SlotWithTracks } from "../schedule";
import { useEffect } from "react";

/*
add a "syncing" state.
if in syncing state:
    if block is active: check every n seconds: is the currently playing track in the current block?
        if yes: check the queue: is the next track in the current block?
            if yes: do nothing
            if no: queue the next track in the current block
        if no: check whether the current song will end within x seconds
            if yes: queue the next song from this block
            if no: force skip play a song from this block and queue the next song from this block


n = 10 seconds
x = 120 seconds
*/

async function skipNTimes(spotify: SpotifyApi, elementsToSkip: number) {
    for (let i = 0; i < elementsToSkip; i++) {
        await spotify.player.skipToNext(""); // empty device id means current device
    }
}

async function skipUntilTrackInSlot(spotify: SpotifyApi, slot: SlotWithTracks) {
    const queue = await spotify.player.getUsersQueue();

    const indexOfQueuedTrackInSlot = queue.queue.findIndex((track) => slot.containsTrack(track.id));
    const queueHasTrackInSlot = indexOfQueuedTrackInSlot !== -1;

    if (queueHasTrackInSlot) {
        await skipNTimes(spotify, indexOfQueuedTrackInSlot + 1);
    } else {
        console.error("Queue does not contain track in slot");
    }
}

async function syncSlot(slot: SlotWithTracks, spotify: SpotifyApi) {
    const queue = await spotify.player.getUsersQueue();

    const currentTrack = queue.currently_playing?.id;

    const currentTrackInSlot = currentTrack && slot.containsTrack(currentTrack);
    const indexOfQueuedTrackInSlot = queue.queue.findIndex((track) => slot.containsTrack(track.id));
    const queueHasTrackInSlot = indexOfQueuedTrackInSlot !== -1;

    if (!queueHasTrackInSlot) {
        const nextTrackInSlot = currentTrack && currentTrackInSlot ? slot.getTrackAfter(currentTrack) : slot.getTrackByIndex(0);
        if (nextTrackInSlot) {
            await spotify.player.addItemToPlaybackQueue(nextTrackInSlot.track.uri, ""); // empty device id means current device
        }
    }

    if (!currentTrackInSlot) {
        const currentTrackLengthSec = queue.currently_playing?.duration_ms || 0 / 1000;

        // For songs that are almost finished we will just let them finish
        if (currentTrackLengthSec < 180) {
            console.debug("Will let current track finish: ", queue.currently_playing?.name);
        }
        else {
            console.debug("Will skip over queue: ", queue);
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