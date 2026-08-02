const makeWASocket = require('@ipanzx/baileys').default;
const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@ipanzx/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');

// === KONFIGURASI ===
const VT_API_KEY = '948d0f4abe4ee0d8905ea9a8f7d5b7ab430f3d06f5e2a0566ccd64f024b562ad';
const PACK_NAME = 'arisdev -- +601129601577';
const AUTHOR_NAME = 'arisxdev.my.id';
const MENU_IMAGE_URL = 'https://cdn.phototourl.com/free/2026-07-31-91392646-4250-4b56-8e3b-237dc0c692b6.jpg';
const OWNER_NUMBER = '601129601577';
const WEBSITE_URL = 'https://miokuu.web.id/';
const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCrjmG6LwHkDpCbEi0z';
// ====================

// Fungsi pembuat BRAT manual
async function generateBratImage(text) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxChars = 15;

    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length > maxChars) {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine = (currentLine + ' ' + word).trim();
        }
    });
    if (currentLine) lines.push(currentLine.trim());

    const lineHeight = 50;
    const totalHeight = lines.length * lineHeight;
    const firstLineY = 256 - totalHeight / 2 + lineHeight / 2;

    let tspans = '';
    lines.forEach((line, i) => {
        const y = firstLineY + i * lineHeight;
        tspans += `<tspan x="50%" y="${y}">${line}</tspan>`;
    });

    const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" />
        <style>
            .brat-text {
                font-family: Arial, Helvetica, sans-serif;
                font-weight: bold;
                font-size: 45px;
                fill: black;
                text-anchor: middle;
            }
        </style>
        <text class="brat-text">
            ${tspans}
        </text>
    </svg>`;

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

// Fungsi pembuat SMEME (Sticker Meme)
async function generateSmemeImage(imageBuffer, topText, bottomText) {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    const fontSize = Math.floor(width / 8);
    const stroke = Math.max(2, Math.floor(fontSize / 15));
    
    const wrapText = (text, maxChars) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length > maxChars) {
                if (currentLine) lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = (currentLine + ' ' + word).trim();
            }
        });
        if (currentLine) lines.push(currentLine.trim());
        return lines;
    };

    const maxChars = Math.floor(width / (fontSize * 0.6));
    const topLines = topText ? wrapText(topText.toUpperCase(), maxChars) : [];
    const bottomLines = bottomText ? wrapText(bottomText.toUpperCase(), maxChars) : [];

    let topTspans = '';
    topLines.forEach((line, i) => {
        const y = fontSize + i * (fontSize * 1.1);
        topTspans += `<tspan x="50%" y="${y}">${line}</tspan>`;
    });

    let bottomTspans = '';
    bottomLines.forEach((line, i) => {
        const y = height - ((bottomLines.length - 1 - i) * (fontSize * 1.1)) - (fontSize * 0.2);
        bottomTspans += `<tspan x="50%" y="${y}">${line}</tspan>`;
    });

    const svgText = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .meme-text {
                font-family: Impact, Arial, sans-serif;
                font-size: ${fontSize}px;
                fill: white;
                stroke: black;
                stroke-width: ${stroke}px;
                text-anchor: middle;
                font-weight: bold;
            }
        </style>
        <text class="meme-text">
            ${topTspans}
            ${bottomTspans}
        </text>
    </svg>`;

    return await sharp(imageBuffer)
        .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
        .png()
        .toBuffer();
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Bot ArisxDev', 'Chrome', '1.0.0'],
        logger: require('pino')({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\nScan QR Code ini:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) &&
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

            console.log('Koneksi terputus, mencoba menghubungkan ulang...', shouldReconnect);

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('\n✅ Bot ArisxDev Berhasil Terhubung!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

        const sender = msg.key.remoteJid;

        // ====== CEK BUTTON RESPONSE ======
        if (msg.message.buttonsResponseMessage || msg.message.templateButtonReplyMessage) {
            const selectedId = msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.templateButtonReplyMessage?.selectedId;
            
            console.log(`Button ditekan oleh ${sender}: ${selectedId}`);

            if (selectedId === 'btn_owner') {
                const vcard = 'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    'FN:Owner ArisxDev\n' +
                    'ORG:ArisxDev;\n' +
                    `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
                    'END:VCARD';

                await sock.sendMessage(sender, { text: 'owner saya, jangan di spam ya 😘' });
                await sock.sendMessage(sender, {
                    contacts: {
                        displayName: 'Owner ArisxDev',
                        contacts: [{ vcard }]
                    }
                });
                return;
            }

            if (selectedId === 'btn_website') {
                await sock.sendMessage(sender, {
                    text: `🌐 Kunjungi website kami:\n${WEBSITE_URL}`
                });
                return;
            }

            if (selectedId === 'btn_channel') {
                await sock.sendMessage(sender, {
                    text: `📢 Ikuti Saluran Mio Information:\n${CHANNEL_URL}`
                });
                return;
            }

            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const lowerText = text.toLowerCase();

        console.log(`Pesan masuk dari ${sender}: ${text}`);

        // 1. FITUR MENU UTAMA
        if (lowerText === '!menu') {
            const menuText = `
┏━━━⟦ *BOT ARISXDEV* ⟧━━━┓
┃ 
┃ Berikut adalah daftar fitur 
┃ yang tersedia di bot ini:
┃ 
┣───⟐ ❯ *STICKER MAKER*
┃   ↳ Membuat stiker dari foto.
┃   ↳ *Cara pakai:* Kirim/reply foto
┃     dengan caption *!sticker*
┃ 
┣───⟐ ❯ *BRAT GENERATOR*
┃   ↳ Membuat stiker teks Brat.
┃   ↳ *Cara pakai:* *!brat <teks>*
┃   ↳ *Contoh:* !brat hallo
┃ 
┣───⟐ ❯ *STICKER MEME*
┃   ↳ Stiker teks atas|bawah.
┃   ↳ *Cara pakai:* *!smeme |aris*
┃   ↳ *Contoh:* !smeme halo|aris
┃ 
┣───⟐ ❯ *VIRUSTOTAL SCANNER*
┃   ↳ cek keamanan web.
┃   ↳ *Cara pakai:* *!vt <link>*
┃   ↳ *Contoh:* !vt https://arisxdev.my.id
┃ 
┗━━━━━━━━━━━━━━━━━━━━┛

_⚡ Powered by arisxdev.my.id_`;

            const buttons = [
                { buttonId: 'btn_owner', buttonText: { displayText: '👤 Owner' }, type: 1 },
                { buttonId: 'btn_website', buttonText: { displayText: '🌐 Website' }, type: 1 },
                { buttonId: 'btn_channel', buttonText: { displayText: '📢 Saluran Mio' }, type: 1 }
            ];

            try {
                await sock.sendMessage(sender, {
                    image: { url: MENU_IMAGE_URL },
                    caption: menuText,
                    footer: '© arisxdev.my.id',
                    buttons: buttons,
                    headerType: 4
                });
            } catch (err) {
                console.error('Gagal mengirim gambar+button, fallback ke teks:', err.message);
                try {
                    await sock.sendMessage(sender, {
                        text: menuText,
                        footer: '© arisxdev.my.id',
                        buttons: buttons,
                        headerType: 1
                    });
                } catch (err2) {
                    console.error('Gagal mengirim menu teks:', err2);
                    await sock.sendMessage(sender, { text: menuText });
                }
            }
        } 
        // 2. FITUR STICKER
        else if (lowerText === '!sticker' || lowerText === '!s') {
            try {
                let mediaMsg;
                if (msg.message.imageMessage) {
                    mediaMsg = msg;
                } else if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    mediaMsg = { 
                        message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
                        key: msg.message.extendedTextMessage.contextInfo.stanzaId 
                    };
                }

                if (mediaMsg) {
                    await sock.sendMessage(sender, { text: '⏳ Sedang membuat stiker...' });
                    const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
                    const sticker = new Sticker(buffer, {
                        pack: PACK_NAME,
                        author: AUTHOR_NAME,
                        type: StickerTypes.FULL,
                        quality: 70
                    });
                    const stickerBuffer = await sticker.toBuffer();
                    await sock.sendMessage(sender, { sticker: stickerBuffer });
                } else {
                    await sock.sendMessage(sender, { text: '❌ Kirim atau reply gambar dengan caption *!sticker*' });
                }
            } catch (err) {
                console.error('Error stiker:', err);
                await sock.sendMessage(sender, { text: '❌ Gagal membuat stiker. Pastikan yang dikirim adalah gambar.' });
            }
        }
        // 3. FITUR BRAT STICKER (Manual / Offline)
        else if (lowerText.startsWith('!brat ')) {
            const bratText = text.split(' ').slice(1).join(' ');
            if (!bratText) return await sock.sendMessage(sender, { text: '❌ Masukkan teksnya. Contoh: *!brat hallo*' });
            
            try {
                await sock.sendMessage(sender, { text: '⏳ Sedang membuat stiker Brat...' });
                const imageBuffer = await generateBratImage(bratText);
                const sticker = new Sticker(imageBuffer, {
                    pack: PACK_NAME,
                    author: AUTHOR_NAME,
                    type: StickerTypes.FULL,
                    quality: 70
                });
                await sock.sendMessage(sender, { sticker: await sticker.toBuffer() });
            } catch (err) {
                console.error('Error Brat:', err);
                await sock.sendMessage(sender, { text: '❌ Gagal membuat stiker Brat.' });
            }
        } 
        // 4. FITUR SMEME (Sticker Meme)
        else if (lowerText.startsWith('!smeme ')) {
            const smemeText = text.split(' ').slice(1).join(' ');
            if (!smemeText) return await sock.sendMessage(sender, { text: '❌ Masukkan teksnya. Contoh: *!smeme atas|bawah*' });
            
            try {
                await sock.sendMessage(sender, { text: '⏳ Sedang membuat stiker meme...' });
                
                let mediaMsg;
                if (msg.message.imageMessage) {
                    mediaMsg = msg;
                } else if (msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    mediaMsg = { 
                        message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
                        key: msg.message.extendedTextMessage.contextInfo.stanzaId 
                    };
                }

                let imageBuffer;
                if (mediaMsg) {
                    // Jika reply/kirim gambar, download gambarnya
                    imageBuffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
                } else {
                    // Jika tidak ada gambar, buat gambar kosong putih
                    imageBuffer = await sharp({
                        create: {
                            width: 512,
                            height: 512,
                            channels: 4,
                            background: { r: 255, g: 255, b: 255, alpha: 1 }
                        }
                    }).png().toBuffer();
                }

                // Pecah teks atas dan bawah
                const [topText, bottomText] = smemeText.split('|');
                
                const memeBuffer = await generateSmemeImage(imageBuffer, topText || '', bottomText || '');
                
                const sticker = new Sticker(memeBuffer, {
                    pack: PACK_NAME,
                    author: AUTHOR_NAME,
                    type: StickerTypes.FULL,
                    quality: 70
                });
                
                await sock.sendMessage(sender, { sticker: await sticker.toBuffer() });
            } catch (err) {
                console.error('Error Smeme:', err);
                await sock.sendMessage(sender, { text: '❌ Gagal membuat stiker meme.' });
            }
        } 
        // 5. FITUR VIRUSTOTAL
        else if (lowerText.startsWith('!vt ')) {
            const urlToScan = text.split(' ')[1];
            
            if (!urlToScan) {
                await sock.sendMessage(sender, { text: '❌ Format salah. Contoh: *!vt https://google.com*' });
                return;
            }

            try {
                await sock.sendMessage(sender, { text: '⏳ Sedang mengecek link ke VirusTotal...' });
                
                const urlId = Buffer.from(urlToScan).toString('base64').replace(/=/g, '');
                
                const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
                    method: 'GET',
                    headers: { 'x-apikey': VT_API_KEY }
                });
                
                const data = await response.json();

                if (data.data && data.data.attributes) {
                    const stats = data.data.attributes.last_analysis_stats;
                    const resultText = `
🛡️ *HASIL SCAN VIRUSTOTAL*

🔗 Link: ${urlToScan}
☑️ Aman (Harmless): ${stats.harmless}
⚠️ Mencurigakan (Suspicious): ${stats.suspicious}
❌ Berbahaya (Malicious): ${stats.malicious}

Detail lengkap: https://www.virustotal.com/gui/url/${urlId}
                    `;
                    await sock.sendMessage(sender, { text: resultText });
                } else {
                    await sock.sendMessage(sender, { text: '❌ Link tidak ditemukan atau gagal di-scan.' });
                }
            } catch (err) {
                console.error('Error VT:', err);
                await sock.sendMessage(sender, { text: '❌ Terjadi error saat menghubungi server VirusTotal.' });
            }
        }
    });
}

startBot();
