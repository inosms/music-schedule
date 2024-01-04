import './App.css';

import { tryAuthorizeStep2TokenExchange } from './auth/auth';
import { useTokenStorage } from './auth/tokenStorage';
import LoginButton from './LoginButton';
import { useEffect } from 'react';

function App() {
  const { setToken, isLoggedIn } = useTokenStorage();

  useEffect(() => {
    tryAuthorizeStep2TokenExchange().then((token) => {
      if (token) {
        setToken(token);
      }
    });
  }, [setToken]);

  return (
    <div className="App">
      <header className="App-header">
        {isLoggedIn ? (
          <p>
            You are  logged in!
          </p>
        ) : (
          <LoginButton />
        )}
      </header>
    </div>
  );
}

export default App;
