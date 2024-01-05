import { BrowserRouter } from 'react-router-dom';
import './App.css';
import { useSpotify } from './hooks/useSpotify';
import UserPlaylistSelection from './UserPlaylistSelection';

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

function App() {
  const sdk = useSpotify(
    clientId,
    getRedirectUrl(),
    scopes,
  );

  return (
    <BrowserRouter>
      <div className="App">
        <UserPlaylistSelection sdk={sdk} />
      </div >
    </BrowserRouter>
  );
}

export default App;
