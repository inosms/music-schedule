import './ScheduleContainer.css';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { useEffect, useState } from 'react';
import { Schedule, ScheduledPlaylist } from '../schedule';
import ScheduleSlot from './ScheduleSlot';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PlaylistHeader } from './PlaylistHeader';

async function getPlaylistWithAllTracks(spotify: SpotifyApi, playlistId: string): Promise<ScheduledPlaylist | null> {
    try {
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

        const schedule = Schedule.fromString(playlist.description);
        if (schedule === null) {
            return null;
        }

        return ScheduledPlaylist.newFromSchedule(playlist.id, playlist.name, schedule, tracks);
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function savePlaylist(spotify: SpotifyApi, playlist: ScheduledPlaylist) {
    try {
        console.debug("saving playlist: ", playlist);
        // Save the playlist
        const trackUris = playlist.getSlots().flatMap((slot) => slot.getTracks().map((track) => track.track.uri));
        await spotify.playlists.updatePlaylistItems(playlist.getId(), {
            uris: trackUris,
        });

        // Update the schedule in the description
        const schedule = playlist.getSchedule();
        await saveSchedule(spotify, playlist.getId(), schedule);
    } catch (e) {
        console.error(e);
    }
}

async function saveSchedule(spotify: SpotifyApi, playlistId: string, schedule: Schedule) {
    try {
        const currentPlaylist = await spotify.playlists.getPlaylist(playlistId);
        const oldDescription = currentPlaylist.description;
        const newDescription = Schedule.removeScheduleFromString(oldDescription).trim() + " " + schedule.toString();
        await spotify.playlists.changePlaylistDetails(playlistId, {
            description: newDescription,
        });
    } catch (e) {
        console.error(e);
    }
}

async function canTurnIntoScheduledPlaylist(spotify: SpotifyApi, playlistId: string): Promise<boolean> {
    try {
        const playlist = await spotify.playlists.getPlaylist(playlistId);
        const me = await spotify.currentUser.profile();

        const isMyPlaylist = playlist.owner.id === me.id;

        return isMyPlaylist && Schedule.fromString(playlist.description) === null;
    } catch (e) {
        console.error(e);
        return false;
    }
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
    const [playlistWithSchedule, setPlaylistWithSchedule] = useState<ScheduledPlaylist | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<string | null>(null);
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

    useEffect(() => {
        const syncPlayback = async () => {
            if (spotify && syncing) {
                try {
                    console.debug("syncing playback");

                    const currentlyPlaying = await spotify.player.getCurrentlyPlayingTrack();
                    const currentSong = currentlyPlaying?.item?.uri ?? null;
                    setCurrentlyPlayingTrack(currentSong);

                    const activeSlot = playlistWithSchedule?.getSlots()?.find((slot) => slot.shouldPlayNow());
                    if (currentlyPlaying?.is_playing && activeSlot) {
                        const queue = await spotify.player.getUsersQueue();
                        const queueUris = queue?.queue?.map((item) => item.uri) ?? [];
                        const slotSongInQueue = queueUris.find((uri) => activeSlot.containsUri(uri));

                        let nextSongUri: string | null = null;
                        if (slotSongInQueue) {
                            nextSongUri = activeSlot.getTrackAfterUri(slotSongInQueue)?.track?.uri ?? null;
                        } else {
                            nextSongUri = activeSlot.getTracks().at(0)?.track?.uri ?? null;
                        }
                        const nextSongInQueue = queueUris.some((uri) => uri === nextSongUri);
                        if (!nextSongInQueue) {
                            console.debug("adding next song to queue: ", nextSongUri);
                            await spotify.player.addItemToPlaybackQueue(nextSongUri ?? "", currentlyPlaying?.device?.id ?? "");
                        }

                        let tries = 5;
                        while (tries > 0 && !activeSlot.containsUri(currentlyPlayingTrack ?? "")) {
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                            const currentlyPlaying = await spotify.player.getCurrentlyPlayingTrack();
                            const currentSong = currentlyPlaying?.item?.uri ?? null;
                            setCurrentlyPlayingTrack(currentSong);

                            const currentSongInSlot = activeSlot.containsUri(currentSong);
                            if (!currentSongInSlot) {
                                console.debug("song is not in slot anymore, skipping");
                                await spotify.player.skipToNext(currentlyPlaying?.device?.id ?? "");
                            } else {
                                console.debug("song is still in slot");
                                break;
                            }

                            tries--;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            setPlaylistWithSchedule(playlistWithSchedule); // force rerender
        };

        const intervalId = setInterval(syncPlayback, 30000);
        syncPlayback();
        return () => clearInterval(intervalId);
    }, [spotify, syncing, playlistWithSchedule, currentlyPlayingTrack]);

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
                            await saveSchedule(spotify, playlistId, Schedule.defaultSchedule());
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
        playlistRenderContent = playlistWithSchedule?.getSlots()?.map((slot, index) => {
            return (
                <ScheduleSlot
                    key={slot.id() + "-slot"}
                    slot={slot}
                    spotify={spotify}
                    syncing={syncing}
                    nextSlot={playlistWithSchedule.getSlots()[index + 1]}
                    currentlyPlayingTrack={currentlyPlayingTrack}
                    slotIndex={index}
                    setLength={async (length) => {
                        console.debug("setting length of slot: ", index, length);

                        const resized = playlistWithSchedule.resizeSlot(index, length);
                        if (spotify) {
                            await savePlaylist(spotify, resized);
                            setPlaylistWithSchedule(resized);
                        }
                    }}
                    onRemoveTrack={async (indexInSlot: number) => {
                        console.debug("removing track in slot ", index, " at index: ", indexInSlot);

                        const removed = playlistWithSchedule.removeTrack(index, indexInSlot);
                        if (spotify) {
                            await savePlaylist(spotify, removed);
                            setPlaylistWithSchedule(removed);
                        }
                    }}
                    onRemoveSlot={async () => {
                        console.debug("removing slot: ", index);

                        const removed = playlistWithSchedule.removeSlot(index);
                        if (spotify) {
                            await savePlaylist(spotify, removed);
                            setPlaylistWithSchedule(removed);
                        }
                    }}
                    splitSlot={async () => {
                        console.debug("splitting slot: ", index);

                        const split = playlistWithSchedule.splitSlot(index);
                        if (spotify) {
                            await savePlaylist(spotify, split);
                            setPlaylistWithSchedule(split);
                        }
                    }}
                    onDragAndDropTrack={async (fromSlotIndex: number, fromTrackIndex: number, toSlotIndex: number, toTrackIndex: number) => {
                        console.debug("drag and drop track: ", fromSlotIndex, fromTrackIndex, toSlotIndex, toTrackIndex);

                        const moved = playlistWithSchedule.moveTrack(fromSlotIndex, fromTrackIndex, toSlotIndex, toTrackIndex);
                        if (spotify) {
                            await savePlaylist(spotify, moved);
                            setPlaylistWithSchedule(moved);
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