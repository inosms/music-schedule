import { Link } from "react-router-dom"
import { PlaylistWithSchedule } from "../schedule"
import "./PlaylistHeader.css"

export function PlaylistHeader({ playlistWithSchedule, syncing, onToggleSync }: { playlistWithSchedule: PlaylistWithSchedule | null, syncing: boolean, onToggleSync: () => void }) {
    return (
        <div className={"playlist-header " + (syncing ? "-syncing" : "")}>
            <Link to="/" className={"back" + (syncing ? " -syncing" : "")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                    <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                </svg>
            </Link>
            <div className={"title" + (syncing ? " -syncing" : "")}>
                {playlistWithSchedule?.getTitle() || "Loading..."}
            </div>
            <div className={"syncbutton" + (syncing ? " -syncing" : "")} onClick={() => onToggleSync()}>
                {syncing ?
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-6 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM4 8a4 4 0 0 1 4-4 .5.5 0 0 0 0-1 5 5 0 0 0-5 5 .5.5 0 0 0 1 0zm9 0a.5.5 0 1 0-1 0 4 4 0 0 1-4 4 .5.5 0 0 0 0 1 5 5 0 0 0 5-5z" />
                    </svg>
                    :
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 4a4 4 0 0 0-4 4 .5.5 0 0 1-1 0 5 5 0 0 1 5-5 .5.5 0 0 1 0 1zm4.5 3.5a.5.5 0 0 1 .5.5 5 5 0 0 1-5 5 .5.5 0 0 1 0-1 4 4 0 0 0 4-4 .5.5 0 0 1 .5-.5z" />
                    </svg>}
            </div>
        </div>
    )
}