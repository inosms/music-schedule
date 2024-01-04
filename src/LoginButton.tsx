import { authorizeStep1UserAuth } from './auth/auth';

function LoginButton() {
    return (
        <button onClick={() => authorizeStep1UserAuth()}>Log In</button>
    );
}

export default LoginButton;