import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { SlotWithTracks } from "../schedule";

export default function ScheduleSlot({ spotify, slot }: { spotify: SpotifyApi | null, slot: SlotWithTracks }) {
    return (
        <div>
            {slot.getStartTimeMinutes()} - {slot.getStartTimeMinutes() + slot.getLengthMinutes()} minutes - {slot.getTracks().length} tracks
        </div>
    );
}