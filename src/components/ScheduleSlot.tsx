import "./ScheduleSlot.css";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { PlaylistSlot } from "../schedule";
import { SlotTime } from "./SlotTime";
import { SlotSongElement } from "./SlotSongElement";
import { AddButton } from "./AddButton";
import { SongDropArea } from "./SongDropArea";

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
        slotIndex,
        currentlyPlayingTrack,
    }: {
        spotify: SpotifyApi | null,
        slot: PlaylistSlot,
        syncing: boolean,
        nextSlot: PlaylistSlot | undefined,
        setLength: (time: number) => void,
        onRemoveTrack: (indexInSlot: number) => void,
        onRemoveSlot: () => void,
        splitSlot: () => void,
        onDragAndDropTrack: (fromSlotIndex: number, fromTrackIndex: number, toSlotIndex: number, toTrackIndex: number) => void,
        slotIndex: number,
        currentlyPlayingTrack: string | null,
    }) {

    const shouldPlayNow = slot.shouldPlayNow() && syncing;
    const nextSlotShouldPlayNow = (nextSlot?.shouldPlayNow() || false) && syncing;

    return (
        <div>
            {slot.isFirstSlot() ?
                <div className="schedule-slot">
                    <div className="time-line">
                        <SlotTime
                            key={slot.id() + "-top"}
                            time={slot.getStartTime()}
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
                            key={slot.id() + "-bottom"}
                            time={slot.getEndTime()}
                            setTime={(time) => setLength(time - slot.getStartTime())}
                            minTime={slot.getStartTime() + 1}
                            maxTime={nextSlot?.getEndTime() || (24 * 60 - 1)}
                            onRemove={slot.isLastSlot() ? undefined : () => onRemoveSlot()}
                            isActive={shouldPlayNow || nextSlotShouldPlayNow}
                        />
                    </div>
                </div>
                <div className="tracks">
                    <SongDropArea
                        droppedSong={(fromSlotIndex, fromTrackIndex) => onDragAndDropTrack(fromSlotIndex, fromTrackIndex, slotIndex, 0)}
                        key={slot.id() + "-0-drop-area"} />
                    {slot.getTracks().map((track, index) => {
                        return (
                            <div key={`slot-song-${index}-${track.track.id}`}>
                                <SlotSongElement
                                    track={track}
                                    onRemove={() => onRemoveTrack(index)}
                                    currentlyPlaying={track.track.uri === currentlyPlayingTrack}
                                    syncing={syncing}
                                    slotIndex={slotIndex}
                                    indexInSlot={index}
                                />
                                <SongDropArea
                                    droppedSong={(fromSlotIndex, fromTrackIndex) => onDragAndDropTrack(fromSlotIndex, fromTrackIndex, slotIndex, index + 1)}
                                    key={slot.id() + "-" + (index + 1) + "-drop-area"} />
                            </div>
                        );
                    })}
                    {slot.isEmpty() ? <div className="empty">Empty</div> : null}
                </div>
            </div>
        </div>
    );
}