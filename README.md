# Password Manager

A fairly straight-forward password manager with a heavy focus on security and privacy. 

This was mostly a learning project intended to get more experience in building a secure system and designing and building a front-end for such a system. The first objective felt completed when the backend was done and the second objective was finished when it spun off into [wc-lib](https://github.com/SanderRonde/wc-lib). Unfortunately I stopped development after that point since it's just not feasible to build and maintain a backend along with clients for 3 platforms.

## Security/privacy

The system is meant to be as security and privacy-focused as possible. 

### Security

In order to guarantee security a few things were done. The first one was to set up complete tests for every API endpoint. The second one was to think up a bunch of attack scenarios and to attempt to mitigate them. Here are some of the big ones and how I decided to tackle them.

#### Compromised server

The server being compromised would mean the server's source files and the database have been compromised. Since every password is encrypted with a derivative of the user's password, it's not possible for the attacker to get any useful data whatsoever. At this point their goal would likely shift to modifying the login page or dashboard to send back the plaintext password instead of the (hashed) derivative. 

In order to prevent this, the web client uses checksums to verify the contents of what it is sent. It does this by using a serviceworker to intercept any files it is sent and checking whether hashes sent along match with a public key hardcoded into the serviceworker itself. These hashes are calculated on the server on every release using a private key. I assume this key is not compromised as well as it's not that hard to keep it a secret. Since a serviceworker is separate from both the server and the content itself, it can make an objective observation as to whether anything was compromised. In order to replace this serviceworker, the new serviceworker's file itself's signature needs to be correct as well, removing the possibility of any changes to the objective judge. 

When the serviceworker notices something is wrong, the serviceworker switches to the cached offline version of the website and throws away the files it was sent. To be sure it should no longer trust the website to display any warnings it sends to it (in the case of a forced cache clear), and must instead make use of serviceworker-specific APIs such as the notification API to notify the victim. Once the victim is notified they will know the server is compromised and they should stop using the server or do something about it.

#### Compromised connection

On top of using standard HTTPS, the server uses an additional layer of per-connection encryption that functions basically the same as HTTPS. Because of this it's basically impossible to intercept any data sent along. But assuming the attacker does (double) decrypt this connection they won't be able to do anything with the data. The server only sends the client encrypted passwords and the client is the only one who holds the decryption key. Since the login password and decryption password are not the same (they're both derivatives), capturing the login password won't matter.

In addition impersonating the server won't work for the reasons described in the section above.

#### Compromised client

Since there is currently only a web client with no static code, I'll define a compromised client as someone having access to the client pc before or after the user log in. Of course some attacks can never be defended against, such as someone looking over your shoulder or someone displaying a locally hosted perfect copy of the website. Since a lot of client-side attacks like this are hard or impossible to trace, the focus is instead on minimizing damage and notifying the victim.

First of all an attacker that compromises the victim's password won't be able to do anything with it. Every client device/platform of a user is known to the server and just logging in to the website from anywhere won't work. Instead another password is needed for this. 

If the attacker were to simply sit down at the computer the victim left for a while, the damage should be minimal. All API endpoints use scaling rate limiters that increase the waiting time as more requests are made. Because of this only a few passwords should be able to be read. In addition passwords can be secured even further, requiring a U2F key for full unlocking, securing the most important paswords.

If the attacker were to intercept all communication keys used to talk with the server in order to impersonate the victim, the would also fail. The server sends the user a communication key that must be extended by using that same key every few minutes. If a key has already been extended, the connection is terminated and the user is notified. This limits the time an attacker has to do anything evil to a few minutes from the time they capture the credentials, notifying the user afterwards.

### Privacy

It is self-hosted, taking away any trust you need to have in the hoster. This of course brings along the problem of reliability, which is why the database can be easily imported and exported to/from google drive or to a local backup file. 

## Components

The front-end is built using a webcomponent library I built. It initially started as a part of this project but turned into its own project [called wc-lib](https://github.com/SanderRonde/wc-lib).

The code for all components lives in the same directory (`/shared`). This allows easy re-using of shared files between them and easy references to declarations. You can find the code for the server in the `/server` directory. You can find the code for the dasboard in the `/server/app/actions/server/webserver/client/src/` directory. You can find the code for the browser extension in `/browser` (not yet implemented).

## Building

Building happens through the shared gulp file so there's no need to cd into directories. First of all install the dependencies by running `./scripts/install-dependencies.(sh/bat)` depending on your platform. You can then build the project by running `yarn build`.