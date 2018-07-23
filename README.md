# Password Manager

A fairly straight-forward password manager.

## Components

The code for all components lives in the same directory. This allows easy re-using of shared files between them and easy references to declarations. You can find the code for the server in the /server directory. You can find the code for the dasboard in the /server/app/actions/server/webserver/client/src/ directory. You can find the code for the browser extension in /browser (not yet implemented).

## Building

Building happens through the shared gulp file so there's no need to cd into directories. First of all install the dependencies by running `./scripts/install-dependencies.(sh/bat)` depending on your platform. You can then build the project by running `yarn build`.