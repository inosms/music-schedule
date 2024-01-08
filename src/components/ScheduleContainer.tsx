import './ScheduleContainer.css';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useEffect, useState } from 'react';
import { PlaylistWithSchedule, Schedule } from '../schedule';
import ScheduleSlot from './ScheduleSlot';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PlaylistHeader } from './PlaylistHeader';

async function getPlaylistWithAllTracks(spotify: SpotifyApi, playlistId: string): Promise<PlaylistWithSchedule | null> {
    const playlist = await spotify.playlists.getPlaylist(playlistId);

    // A playlist might contain more tracks than the API returns
    // so we need to fetch all tracks
    let tracks = playlist.tracks.items;
    let next = playlist.tracks.next;
    while (next) {
        const response = await spotify.playlists.getPlaylistItems(playlistId, undefined, undefined, 50, playlist.tracks.items.length);
        tracks = tracks.concat(response.items);
        next = response.next;
    }

    const timeTable = Schedule.fromString(playlist.description);
    if (timeTable === null) {
        return null;
    }

    return new PlaylistWithSchedule(playlist.id, tracks, timeTable, playlist.name);
}

async function updatePlaylistSchedule(spotify: SpotifyApi, playlistId: string, schedule: Schedule) {
    const playlist = await spotify.playlists.getPlaylist(playlistId);
    const oldDescription = playlist.description;
    const newDescription = Schedule.removeScheduleFromString(oldDescription).trim() + " " + schedule.toString();
    console.debug("new description: ", newDescription);
    await spotify.playlists.changePlaylistDetails(playlistId, {
        description: newDescription,
    });
}

async function canTurnIntoScheduledPlaylist(spotify: SpotifyApi, playlistId: string): Promise<boolean> {
    const playlist = await spotify.playlists.getPlaylist(playlistId);
    const me = await spotify.currentUser.profile();

    const isMyPlaylist = playlist.owner.id === me.id;

    return isMyPlaylist && Schedule.fromString(playlist.description) === null;
}

enum PlaylistState {
    Loading,
    HasSchedule,
    NoScheduleButCanAddOne,
    NoScheduleAndCannotAddOne,
}

enum ButtonState {
    NotPressed,
    Loading,
    Pressed,
}

export default function ScheduleContainer({ spotify, playlistId }: { spotify: SpotifyApi | null, playlistId: string }) {
    const [playlistWithSchedule, setPlaylistWithSchedule] = useState<PlaylistWithSchedule | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [state, setState] = useState<PlaylistState>(PlaylistState.Loading);
    useEffect(() => {
        (async () => {
            if (spotify) {
                const playlistWithSchedule = await getPlaylistWithAllTracks(spotify, playlistId);

                if (playlistWithSchedule === null) {
                    if (await canTurnIntoScheduledPlaylist(spotify, playlistId)) {
                        setState(PlaylistState.NoScheduleButCanAddOne);
                    } else {
                        setState(PlaylistState.NoScheduleAndCannotAddOne);
                    }
                } else {
                    setPlaylistWithSchedule(playlistWithSchedule);
                    setState(PlaylistState.HasSchedule);
                    console.debug("playlist with schedule: ", playlistWithSchedule);
                }
            }
        })();
    }, [spotify, playlistId]);

    let playlistRenderContent;
    const [buttonState, setButtonState] = useState<ButtonState>(ButtonState.NotPressed);
    if (state === PlaylistState.Loading) {
        playlistRenderContent = (null);
    } else if (state === PlaylistState.NoScheduleButCanAddOne) {
        playlistRenderContent = (
            <div className="no-schedule -can-add">
                <div>
                    This playlist does not have a schedule yet.
                </div>
                <div>
                    You can add one by pressing the button below.
                </div>
                <div className="center">
                    <button
                        className="addbutton"
                        onClick={async () => {
                            if (!spotify) {
                                return;
                            }
                            if (buttonState !== ButtonState.NotPressed) {
                                return;
                            }
                            setButtonState(ButtonState.Loading);
                            await updatePlaylistSchedule(spotify, playlistId, Schedule.defaultSchedule());
                            setButtonState(ButtonState.Pressed);
                        }}
                    >
                        {buttonState === ButtonState.Loading ? "Loading..." : (buttonState === ButtonState.Pressed ? "Reload after some time..." : "Add schedule")}
                    </button>
                </div>
            </div>
        );
    } else if (state === PlaylistState.NoScheduleAndCannotAddOne) {
        playlistRenderContent = (
            <div className="no-schedule">
                <div>
                    This playlist does not have a schedule yet.
                </div>
                <div>
                    You can not add one because you are not the owner of this playlist.
                </div>
            </div>
        );
    }
    else if (state === PlaylistState.HasSchedule) {
        playlistRenderContent = playlistWithSchedule?.getSlotsWithTracks()?.map((slot, index) => {
            return (
                <ScheduleSlot
                    key={slot.getId() + "-slot"}
                    slot={slot}
                    spotify={spotify}
                    syncing={syncing}
                    nextSlot={playlistWithSchedule.getSlotsWithTracks().at(index + 1) || null}
                    setLength={(length) => {
                        let schedule = playlistWithSchedule.getSchedule();
                        let newSchedule = schedule.resizeSlotLengthAt(index, length);
                        let newPlaylist = playlistWithSchedule.newWithSchedule(newSchedule);
                        setPlaylistWithSchedule(newPlaylist);
                        console.debug("new playlist schedule: ", newPlaylist);

                        if (spotify) {
                            updatePlaylistSchedule(spotify, playlistId, newSchedule);
                        }
                    }}
                    onRemoveTrack={async (uri, id) => {
                        console.debug("removing track: ", uri);

                        if (!spotify) {
                            return;
                        }

                        await spotify.playlists.removeItemsFromPlaylist(playlistId, {
                            tracks: [{
                                uri: uri,
                            }]
                        });

                        let slotIndex = playlistWithSchedule.getSlotIndexByTrackId(id);
                        if (slotIndex !== null) {
                            let oldSongCount = playlistWithSchedule.getSchedule().getSongCountAt(slotIndex);
                            let newSchedule = playlistWithSchedule.getSchedule().resizeSongCountAt(slotIndex, oldSongCount - 1);
                            let newPlaylist = playlistWithSchedule
                                .newWithTracks(playlistWithSchedule.getTracks().filter((track) => track.track.uri !== uri))
                                .newWithSchedule(newSchedule);
                            setPlaylistWithSchedule(newPlaylist);
                            await updatePlaylistSchedule(spotify, playlistId, newSchedule);
                        }
                    }}
                    onRemoveSlot={async () => {
                        console.debug("removing slot: ", index);

                        if (!spotify) {
                            return;
                        }

                        let newSchedule = playlistWithSchedule.getSchedule().removeSlotAt(index);
                        let newPlaylist = playlistWithSchedule.newWithSchedule(newSchedule);
                        setPlaylistWithSchedule(newPlaylist);
                        await updatePlaylistSchedule(spotify, playlistId, newSchedule);
                    }}
                    splitSlot={async () => {
                        console.debug("splitting slot: ", index);

                        if (!spotify) {
                            return;
                        }

                        let newSchedule = playlistWithSchedule.getSchedule().splitSlotAt(index);
                        let newPlaylist = playlistWithSchedule.newWithSchedule(newSchedule);
                        setPlaylistWithSchedule(newPlaylist);
                        await updatePlaylistSchedule(spotify, playlistId, newSchedule);
                    }}
                    onDragAndDropTrack={async (id, indexInSlot) => {
                        console.debug("drag and drop track: ", id, indexInSlot);
                        const currentSlotIndex = playlistWithSchedule.getSlotIndexByTrackId(id);

                        // When moving the track to a different slot we need to remove it from the old slot
                        let newSchedule = playlistWithSchedule.getSchedule();
                        if (currentSlotIndex !== index && currentSlotIndex !== null) {
                            newSchedule = newSchedule.resizeSongCountAt(currentSlotIndex, newSchedule.getSongCountAt(currentSlotIndex) - 1);
                            newSchedule = newSchedule.resizeSongCountAt(index, newSchedule.getSongCountAt(index) + 1);
                        }

                        const currentTrackIndex = playlistWithSchedule.getIndexByTrackId(id);
                        if (currentTrackIndex !== null && spotify) {
                            const newTrackIndex = indexInSlot + playlistWithSchedule.getTrackNumBeforeSlot(index);
                            let tracks = playlistWithSchedule.getTracks();
                            const track = tracks[currentTrackIndex];
                            tracks.splice(currentTrackIndex, 1);
                            tracks.splice(newTrackIndex, 0, track);
                            let newPlaylist = playlistWithSchedule
                                .newWithTracks(tracks)
                                .newWithSchedule(newSchedule);

                            setPlaylistWithSchedule(newPlaylist);
                            await spotify.playlists.movePlaylistItems(playlistId, currentTrackIndex, 1, newTrackIndex);
                            await updatePlaylistSchedule(spotify, playlistId, newSchedule);
                        }
                    }}
                />
            );
        })
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <PlaylistHeader
                playlistWithSchedule={playlistWithSchedule}
                syncing={syncing}
                onToggleSync={() => {
                    setSyncing(!syncing);
                }}
            />
            <div className="playlist-view-container">
                <div className="centered">
                    {playlistRenderContent}
                </div>
            </div>
        </DndProvider>
    );
}