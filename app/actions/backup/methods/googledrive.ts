import { getSecrets, createTempFile } from "../../../lib/util";
import { OAuth2Client } from "google-auth-library";
import { google, drive_v3 } from 'googleapis';
import querystring = require('querystring');
import { BackupSettings } from "../backup";
import progress = require('progress');
import { Log } from "../../../main";
import { Export } from "../export";
import path = require('path');
import http = require('http');
import url = require('url');
import fs = require('fs');

export namespace GoogleDrive {
	function authenticate(log: Log, client: OAuth2Client) {
		return new Promise<void>((resolve, reject) => {
			const authUrl = client.generateAuthUrl({
				access_type: 'offline',
				scope: 'https://www.googleapis.com/auth/drive.file'
			});
			const server = http.createServer(async (req, res) => {
				try {
					if (req.url.indexOf('/oauth2callback') > -1) {
						const qs = querystring.parse(url.parse(req.url).query);
						res.end('Authentication successful! Please return to the console.');
						const {tokens} = await client.getToken((qs as any).code);
						client.credentials = tokens;
						resolve(null);
						server.close();
					}
				} catch (e) {
				  	reject(e);
				}
			}).listen(3000, () => {
				log.write('Open this URL in your browser', authUrl);
			});
		});
	}

	async function doUpload(data: string, drive: drive_v3.Drive) {
		return new Promise<void>(async (resolve) => {
			const filePath = path.join(__dirname, 'backup.archive');
			const deleteFile = await createTempFile(filePath, data);

			const fileSize = fs.statSync(filePath).size;
			const progressBar = new progress(':bar  :current/:total - :percent - :eta', {
				total: fileSize
			});
			let total: number = 0;
			await drive.files.create({
				requestBody: {
					// a requestBody element is required if you want to use multipart
				},
				media: {
					body: fs.createReadStream(filePath)
				}
			}, {
				// Use the `onUploadProgress` event from Axios to track the
				// number of bytes uploaded to this point.
				onUploadProgress: evt => {
					progressBar.tick(evt.bytesRead - total);
					total += evt.bytesRead;

					if (evt.bytesRead >= total) {
						deleteFile();
						resolve();
					}
				}
			});
		});
	}

	export async function backup(log: Log, config: BackupSettings) {
		const {
			google: { web: { client_id, client_secret } }
		} = getSecrets(log);

		const client = new google.auth.OAuth2(
			client_id, client_secret, '');

		const drive = google.drive({
			version: 'v3',
			auth: client
		});

		await authenticate(log, client);
		await doUpload(await Export.exportDatabase(log, config.database, config.password),
			drive);
		log.write('Done uploading');
	}
}