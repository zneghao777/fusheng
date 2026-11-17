import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Re-encode downloaded originals and wrap them as game-only BufferAssets.
// Keep provenance in content/music.json; original MP3s stay out of Web builds.
const source = path.resolve(process.argv[2] ?? 'output/music-source');
const target = 'assets/resources/music';
const catalog = JSON.parse(fs.readFileSync('content/music.json', 'utf8'));
fs.mkdirSync(target, { recursive: true });
const files = [];
for (const track of catalog.tracks) {
    const input = path.join(source, track.id + '.mp3');
    if (!fs.existsSync(input)) {
        if (!fs.existsSync(path.join(target, track.id + '.bin'))) track.resource = null;
        continue;
    }
    const result = spawnSync('ffmpeg', ['-v', 'error', '-i', input, '-map_metadata', '-1',
        '-af', 'loudnorm=I=-19:TP=-2:LRA=9', '-ar', '32000', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 24 * 1024 * 1024 });
    if (result.status !== 0) throw Error(result.stderr.toString());
    const encoded = Buffer.from(result.stdout);
    for (let i = 0; i < encoded.length; i++) encoded[i] ^= (0x5a + i * 13) & 255;
    const packed = Buffer.concat([Buffer.from('FSB1'), encoded]);
    fs.writeFileSync(path.join(target, track.id + '.bin'), packed);
    track.resource = 'music/' + track.id;
    files.push({ id: track.id, bytes: packed.length, sha256: crypto.createHash('sha256').update(packed).digest('hex') });
}
fs.writeFileSync('content/music.json', JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('output/music-assets.json', JSON.stringify({ files, available: catalog.tracks.filter(t => t.resource).map(t => t.id) }, null, 2));
console.log('Packed music:', files.map(f => f.id).join(', '));
