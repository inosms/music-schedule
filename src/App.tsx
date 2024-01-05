import { useEffect, useState } from 'react';
import './App.css';
import { useSpotify } from './hooks/useSpotify';
import { SimplifiedPlaylist, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { TimeTableWithPlaylist, parseTimeTable } from './timetable';
import PlaylistElement from './PlaylistElement';

const clientId = '553fb95155e2496292584bc36823741d';
const redirectUrlDev = 'http://localhost:3000';
const redirectUrlProd = 'https://music-time-table.simonschlegl.com';
const scopes = ['user-read-currently-playing', 'user-read-playback-state'];

// Returns true if the current environment is a development environment
function isDevelopmentEnvironment(): boolean {
  // taken from https://stackoverflow.com/questions/35469836/detecting-production-vs-development-react-at-runtime
  return !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
}

function getRedirectUrl(): string {
  return isDevelopmentEnvironment() ? redirectUrlDev : redirectUrlProd;
}

// Returns all playlists for the current user
async function getAllPlaylistsForCurrentUser(sdk: SpotifyApi): Promise<SimplifiedPlaylist[]> {
  let playlists: SimplifiedPlaylist[] = [];

  while (true) {
    const response = await sdk.currentUser.playlists.playlists(50, playlists.length);
    playlists = playlists.concat(response.items);

    if (!response.next) {
      break;
    }
  }

  return playlists;
}

// Returns all playlists for the current user that have a timetable in their description
async function getAllPlaylistsWithTimeTable(sdk: SpotifyApi): Promise<TimeTableWithPlaylist[]> {
  const playlists = await getAllPlaylistsForCurrentUser(sdk);

  // Of all the playlists the user has, only keep the ones that have a timetable in their description
  const timeTableWithPlaylists = playlists.flatMap((playlist) => {
    const timeTable = parseTimeTable(playlist.description);

    if (timeTable) {
      return [{ timeTable, playlist } as unknown as TimeTableWithPlaylist];
    }
    return [];
  });

  return timeTableWithPlaylists;
}

function App() {
  const sdk = useSpotify(
    clientId,
    getRedirectUrl(),
    scopes,
  );

  const [timeTableWithPlaylistState, setTimeTableWithPlaylistState] = useState<TimeTableWithPlaylist[]>([]);

  useEffect(() => {
    (async () => {
      if (sdk) {
        const playlists = await getAllPlaylistsWithTimeTable(sdk);
        setTimeTableWithPlaylistState(playlists);
      }
    })();
  }, [sdk]);


  return (
    <div className="App">
      <div>
        {
          timeTableWithPlaylistState.map((timeTableWithPlaylist) => {
            return (
              <PlaylistElement key={timeTableWithPlaylist.playlist.id} timeTableWithPlaylist={timeTableWithPlaylist} />
            );
          })
        }
      </div>
    </div>
  );
}

export default App;
